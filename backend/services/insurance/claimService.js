/**
 * Insurance claim service (BRD §14, §15, §21).
 *
 * Intake → requirements → assessment → approval → payout, with durable claim
 * status history. Claims are ordinary metadata records. Payouts are recorded as
 * `claim_payment` records ONLY — never posted to the premium ledger (BRD §21);
 * the real financial ledger is a later stage, so this service deliberately does
 * not write Account/Transaction entries.
 */
import { findOne, findMany, createDynamic, updateDynamic } from './dynamicRecords.js';
import { dataOf } from './pricingService.js';
import { resolveClient } from './identityMatching.js';
import { AppError, ValidationError } from '../../utils/errors.js';
import { audit } from '../../utils/auditLogger.js';

export const CLAIM_STATUS = {
  REPORTED: 'reported',
  DOCUMENTS_OUTSTANDING: 'documents_outstanding',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  DECLINED: 'declined',
  PAID: 'paid',
  CLOSED: 'closed',
};

const CLAIM_TRANSITIONS = {
  [CLAIM_STATUS.REPORTED]: [
    CLAIM_STATUS.DOCUMENTS_OUTSTANDING,
    CLAIM_STATUS.UNDER_REVIEW,
    CLAIM_STATUS.DECLINED,
    CLAIM_STATUS.CLOSED,
  ],
  [CLAIM_STATUS.DOCUMENTS_OUTSTANDING]: [
    CLAIM_STATUS.UNDER_REVIEW,
    CLAIM_STATUS.DECLINED,
    CLAIM_STATUS.CLOSED,
  ],
  [CLAIM_STATUS.UNDER_REVIEW]: [
    CLAIM_STATUS.APPROVED,
    CLAIM_STATUS.DECLINED,
    CLAIM_STATUS.DOCUMENTS_OUTSTANDING,
    CLAIM_STATUS.CLOSED,
  ],
  [CLAIM_STATUS.APPROVED]: [CLAIM_STATUS.PAID, CLAIM_STATUS.CLOSED],
  [CLAIM_STATUS.DECLINED]: [CLAIM_STATUS.CLOSED],
  [CLAIM_STATUS.PAID]: [CLAIM_STATUS.CLOSED],
  [CLAIM_STATUS.CLOSED]: [],
};

const TERMINAL_REQUIREMENT = new Set(['accepted', 'waived']);
const REQUIREMENT_STATUSES = new Set(['outstanding', 'received', 'accepted', 'rejected', 'waived']);

const now = () => new Date();
const claimId = (claim) => String(claim._id);
const isBlank = (v) => v === undefined || v === null || v === '';

const loadClaim = async (tenantId, id) => {
  const claim = await findOne(tenantId, 'claim', { _id: id });
  if (!claim) throw new AppError('Claim not found.', 404);
  return claim;
};

const recordClaimHistory = ({ tenantId, userId, claim, from, to, reason }) =>
  createDynamic({
    tenantId,
    objectApiName: 'claim_status_history',
    userId,
    data: {
      name: `${from || 'new'} → ${to}`,
      claim: claimId(claim),
      from_status: from || null,
      to_status: to,
      effective_date: now(),
      reason: reason || null,
    },
  });

const assertClaimTransition = (from, to) => {
  const allowed = CLAIM_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new AppError(`Invalid claim status transition: "${from}" → "${to}".`, 409);
  }
};

/** Apply a validated claim transition, patch and history in one place. */
const finishTransition = async ({ tenantId, userId, claim, from, to, reason, patch = {} }) => {
  if (from !== to) assertClaimTransition(from, to);
  await updateDynamic(claim, { ...patch, status: to, status_effective_date: now() }, userId);
  if (from !== to) await recordClaimHistory({ tenantId, userId, claim, from, to, reason });
  return claim;
};

const sumPaid = (payments) =>
  payments
    .filter((p) => dataOf(p).status === 'paid')
    .reduce((s, p) => s + (Number(dataOf(p).amount) || 0), 0);

export const getClaimState = async ({ tenantId, claimId: id }) => {
  const claim = await loadClaim(tenantId, id);
  const cid = claimId(claim);
  const [requirements, payments, history] = await Promise.all([
    findMany(tenantId, 'claim_requirement', { 'data.claim': cid }),
    findMany(tenantId, 'claim_payment', { 'data.claim': cid }),
    findMany(tenantId, 'claim_status_history', { 'data.claim': cid }),
  ]);
  return {
    claim: { id: cid, ...dataOf(claim) },
    requirements: requirements.map((r) => ({ id: String(r._id), ...dataOf(r) })),
    payments: payments.map((p) => ({ id: String(p._id), ...dataOf(p) })),
    status_history: history.map((h) => ({ id: String(h._id), ...dataOf(h) })),
  };
};

/** Claim intake with a basic automatic eligibility check (BRD §14). */
export const startClaim = async ({ tenantId, userId, body = {} }) => {
  const fieldErrors = {};
  if (isBlank(body.policy_id)) fieldErrors.policy_id = 'A policy is required.';
  if (isBlank(body.insured_life_id)) fieldErrors.insured_life_id = 'The insured life being claimed is required.';
  if (!['death', 'other'].includes(body.claim_type)) fieldErrors.claim_type = 'A valid claim type is required.';
  if (isBlank(body.event_date)) fieldErrors.event_date = 'The event date is required.';
  if (Object.keys(fieldErrors).length) {
    throw new ValidationError(Object.values(fieldErrors), 400, { fieldErrors });
  }

  const policy = await findOne(tenantId, 'policy', { _id: body.policy_id });
  if (!policy) throw new AppError('Policy not found.', 404);

  const life = await findOne(tenantId, 'insured_life', { _id: body.insured_life_id });
  if (!life || String(dataOf(life).policy) !== String(body.policy_id)) {
    throw new AppError('The insured life does not belong to this policy.', 400);
  }
  const lifeData = dataOf(life);
  if (lifeData.status === 'ended') {
    throw new AppError('The insured life has ended; this claim cannot be submitted.', 409);
  }

  const eventDate = new Date(body.event_date);
  if (lifeData.start_date && eventDate < new Date(lifeData.start_date)) {
    throw new AppError('The event date is before the insured life start date.', 400);
  }

  // Waiting-period state is surfaced for underwriting; it does not silently block.
  let eligibilityNote = null;
  if (lifeData.waiting_period_end_date && eventDate < new Date(lifeData.waiting_period_end_date)) {
    eligibilityNote = `Event occurred within the waiting period (until ${String(lifeData.waiting_period_end_date).slice(0, 10)}).`;
  }

  const claimant = body.claimant
    ? (await resolveClient({ tenantId, userId, input: body.claimant })).record
    : lifeData.client
      ? await findOne(tenantId, 'client', { _id: lifeData.client })
      : null;
  if (!claimant) throw new AppError('A claimant is required.', 400);

  const payee = body.payee ? (await resolveClient({ tenantId, userId, input: body.payee })).record : null;

  const claim = await createDynamic({
    tenantId,
    objectApiName: 'claim',
    userId,
    data: {
      policy: String(policy._id),
      insured_life: String(life._id),
      claimant: String(claimant._id),
      payee: payee ? String(payee._id) : undefined,
      claim_type: body.claim_type,
      event_date: eventDate,
      report_date: now(),
      cause: body.cause,
      notes: body.notes,
      status: CLAIM_STATUS.REPORTED,
      status_effective_date: now(),
      eligibility_note: eligibilityNote,
    },
  });
  await recordClaimHistory({ tenantId, userId, claim, from: null, to: CLAIM_STATUS.REPORTED, reason: 'Claim reported' });
  await audit({
    tenantId,
    userId,
    action: 'create',
    resource: 'InsuranceClaim',
    resourceId: claim._id,
    objectApiName: 'claim',
    details: { policy: String(policy._id), claim_type: body.claim_type },
  });
  return state({ tenantId, claimId: claimId(claim) });
};

const state = ({ tenantId, claimId: id }) => getClaimState({ tenantId, claimId: id });

export const addRequirement = async ({ tenantId, userId, claimId: id, body = {} }) => {
  const claim = await loadClaim(tenantId, id);
  if (isBlank(body.name)) {
    throw new ValidationError(['name is required.'], 400, {
      fieldErrors: { name: 'A requirement name is required.' },
    });
  }
  await createDynamic({
    tenantId,
    objectApiName: 'claim_requirement',
    userId,
    data: {
      name: body.name,
      claim: claimId(claim),
      status: REQUIREMENT_STATUSES.has(body.status) ? body.status : 'outstanding',
      due_date: body.due_date,
    },
  });
  // A fresh claim with requirements moves to "documents outstanding".
  if (dataOf(claim).status === CLAIM_STATUS.REPORTED) {
    await finishTransition({
      tenantId,
      userId,
      claim,
      from: CLAIM_STATUS.REPORTED,
      to: CLAIM_STATUS.DOCUMENTS_OUTSTANDING,
      reason: 'Documents requested',
    });
  }
  return getClaimState({ tenantId, claimId: claimId(claim) });
};

export const updateRequirement = async ({ tenantId, userId, claimId: id, requirementId, body = {} }) => {
  const claim = await loadClaim(tenantId, id);
  const requirement = await findOne(tenantId, 'claim_requirement', { _id: requirementId });
  if (!requirement || String(dataOf(requirement).claim) !== claimId(claim)) {
    throw new AppError('Requirement not found.', 404);
  }
  if (body.status && !REQUIREMENT_STATUSES.has(body.status)) {
    throw new ValidationError(['Invalid requirement status.'], 400, {
      fieldErrors: { status: 'Status must be one of: outstanding, received, accepted, rejected, waived.' },
    });
  }
  const patch = {};
  if (body.status) patch.status = body.status;
  if (body.status === 'received' || body.status === 'accepted') patch.received_date = body.received_date || now();
  await updateDynamic(requirement, patch, userId);
  return state({ tenantId, claimId: claimId(claim) });
};

export const transitionClaim = async ({ tenantId, userId, claimId: id, body = {} }) => {
  const claim = await loadClaim(tenantId, id);
  const from = dataOf(claim).status || CLAIM_STATUS.REPORTED;
  const to = body.to;

  if (to === CLAIM_STATUS.APPROVED) {
    const amount = Number(body.approved_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError(['approved_amount must be greater than zero to approve a claim.'], 400, {
        fieldErrors: { approved_amount: 'A positive approved amount is required.' },
      });
    }
    const requirements = await findMany(tenantId, 'claim_requirement', { 'data.claim': claimId(claim) });
    const blocking = requirements.filter((r) => !TERMINAL_REQUIREMENT.has(dataOf(r).status));
    if (blocking.length) {
      throw new AppError(
        `${blocking.length} requirement(s) are still outstanding; accept or waive them before approval.`,
        409,
      );
    }
    await finishTransition({ tenantId, userId, claim, from, to, reason: body.reason, patch: { approved_amount: amount } });
    return state({ tenantId, claimId: claimId(claim) });
  }

  if (to === CLAIM_STATUS.DECLINED && isBlank(body.reason)) {
    throw new ValidationError(['A reason is required to decline a claim.'], 400, {
      fieldErrors: { reason: 'Decline reason is required.' },
    });
  }

  if (to === CLAIM_STATUS.PAID) {
    const payments = await findMany(tenantId, 'claim_payment', { 'data.claim': claimId(claim) });
    if (sumPaid(payments) <= 0) {
      throw new AppError('A claim cannot be marked paid without a recorded payment.', 409);
    }
  }

  const patch = to === CLAIM_STATUS.DECLINED ? { decline_reason: body.reason } : {};
  await finishTransition({ tenantId, userId, claim, from, to, reason: body.reason, patch });
  return state({ tenantId, claimId: claimId(claim) });
};

/**
 * Record a payout against an approved claim. The amount may not exceed the
 * approved amount; a paid payment atomically moves the claim to Paid.
 */
export const recordClaimPayment = async ({ tenantId, userId, claimId: id, body = {} }) => {
  const claim = await loadClaim(tenantId, id);
  const cData = dataOf(claim);
  if (cData.status !== CLAIM_STATUS.APPROVED && cData.status !== CLAIM_STATUS.PAID) {
    throw new AppError('A payment can only be recorded for an approved claim.', 409);
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError(['amount must be greater than zero.'], 400, {
      fieldErrors: { amount: 'A positive amount is required.' },
    });
  }
  const approved = Number(cData.approved_amount) || 0;
  const existing = await findMany(tenantId, 'claim_payment', { 'data.claim': claimId(claim) });
  const alreadyPaid = sumPaid(existing);
  if (approved > 0 && alreadyPaid + amount > approved) {
    throw new AppError(
      `Payment exceeds the approved amount (approved ${approved}, already paid ${alreadyPaid}).`,
      400,
    );
  }

  const status = ['pending', 'failed'].includes(body.status) ? body.status : 'paid';
  const payee = body.payee
    ? String((await resolveClient({ tenantId, userId, input: body.payee })).record._id)
    : cData.payee || undefined;

  const payment = await createDynamic({
    tenantId,
    objectApiName: 'claim_payment',
    userId,
    data: {
      name: `Claim payment ${amount}`,
      claim: claimId(claim),
      payee,
      amount,
      payment_method: body.payment_method,
      payment_provider: body.payment_provider,
      external_reference: body.external_reference,
      payment_date: status === 'paid' ? body.payment_date || now() : undefined,
      status,
      failure_reason: body.failure_reason,
    },
  });

  if (status === 'paid' && cData.status === CLAIM_STATUS.APPROVED) {
    await finishTransition({
      tenantId,
      userId,
      claim,
      from: CLAIM_STATUS.APPROVED,
      to: CLAIM_STATUS.PAID,
      reason: 'Claim paid',
    });
  }
  await audit({
    tenantId,
    userId,
    action: 'create',
    resource: 'InsuranceClaimPayment',
    resourceId: payment._id,
    objectApiName: 'claim_payment',
    details: { claim: claimId(claim), amount, status },
  });
  return state({ tenantId, claimId: claimId(claim) });
};

export default {
  CLAIM_STATUS,
  startClaim,
  getClaimState,
  addRequirement,
  updateRequirement,
  transitionClaim,
  recordClaimPayment,
};
