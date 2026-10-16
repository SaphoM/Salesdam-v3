/**
 * Insurance policy endorsements / amendments (BRD §17).
 *
 * Amendments are never applied by silently overwriting contractual values: a
 * `policy_endorsement` header + field-level `policy_endorsement_item`s are
 * created, and the change is applied through an explicit lifecycle
 * (draft → [pending_approval →] approved → applied). Premium-affecting changes
 * (cover/lives) are repriced through the authoritative pricing engine and a new
 * effective-dated `policy_premium_history` row is written; the prior row's
 * effective_to is closed, preserving history (BRD §17.3).
 *
 * shortcut: BRD §17.3 says approval "must use the Approval Process Builder". No
 * generic approval engine exists in the repo (only a lead-specific one), so this
 * uses an endorsement-level approval gate (`requires_approval` → pending_approval
 * → approve/reject). Replace with the core engine when it lands.
 *
 * Document regeneration (BRD §17.3) is not implemented yet.
 */
import { findOne, findMany, createDynamic, updateDynamic } from './dynamicRecords.js';
import { dataOf } from './pricingService.js';
import { resolveClient } from './identityMatching.js';
import * as appService from './applicationService.js';
import * as policyDocumentService from './policyDocumentService.js';
import * as endorsementApprovalService from './endorsementApprovalService.js';
import * as communicationService from './communicationService.js';
import * as communicationDispatcher from './communicationDispatcher.js';
import { AppError, ValidationError } from '../../utils/errors.js';
import { audit } from '../../utils/auditLogger.js';

export const ENDORSEMENT_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  APPLIED: 'applied',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export const CHANGE_TYPES = [
  'cover_amount_change',
  'add_insured_life',
  'end_insured_life',
  'beneficiary_change',
  'premium_payer_change',
  'payment_method_change',
  'cancellation',
  'reinstatement',
  'other',
];

const TRANSITIONS = {
  draft: ['pending_approval', 'approved', 'cancelled'],
  pending_approval: ['approved', 'rejected', 'cancelled'],
  approved: ['applied', 'cancelled'],
  applied: [],
  rejected: [],
  cancelled: [],
};

const now = () => new Date();
const isBlank = (v) => v === undefined || v === null || v === '';
const idOf = (rec) => String(rec._id);

const loadEndorsement = async (tenantId, id) => {
  const endorsement = await findOne(tenantId, 'policy_endorsement', { _id: id });
  if (!endorsement) throw new AppError('Endorsement not found.', 404);
  return endorsement;
};

const loadPolicy = async (tenantId, id) => {
  const policy = await findOne(tenantId, 'policy', { _id: id });
  if (!policy) throw new AppError('Policy not found.', 404);
  return policy;
};

const assertTransition = (from, to) => {
  if (!(TRANSITIONS[from] || []).includes(to)) {
    throw new AppError(`Invalid endorsement status transition: "${from}" → "${to}".`, 409);
  }
};

const transitionEndorsement = async ({ tenantId, userId, endorsement, to, patch = {} }) => {
  const from = dataOf(endorsement).status || ENDORSEMENT_STATUS.DRAFT;
  if (from === to) return endorsement;
  assertTransition(from, to);
  await updateDynamic(endorsement, { ...patch, status: to }, userId);
  return endorsement;
};

const makeItem = ({ field, prior, next, effectiveFrom }) => ({
  name: field,
  field_api_name: field,
  prior_value: prior === undefined || prior === null ? null : String(prior),
  new_value: next === undefined || next === null ? null : String(next),
  effective_date: effectiveFrom,
});

/** The insured life an amendment targets: an explicit id, else the main member. */
const resolveTargetLife = async (tenantId, policy, body) => {
  const lives = await findMany(tenantId, 'insured_life', { 'data.policy': idOf(policy) });
  if (body.insured_life_id) {
    const life = lives.find((l) => idOf(l) === String(body.insured_life_id));
    if (!life) throw new AppError('Insured life not found on this policy.', 404);
    return life;
  }
  const main = lives.find((l) => dataOf(l).relation === 'main_member' && !l.isDeleted);
  if (!main) throw new AppError('The policy has no main member to amend.', 409);
  return main;
};

/** Reprice via the authoritative engine and write effective-dated premium history. */
const reprice = async ({ tenantId, userId, policy, effectiveFrom, reason }) => {
  const premium = await appService.calculatePremium({ tenantId, policyId: idOf(policy) });
  const previous = Number(dataOf(policy).current_premium) || 0;
  const next = premium.totals.premium;
  await updateDynamic(policy, { current_premium: next }, userId);
  if (previous !== next) {
    const history = await findMany(
      tenantId,
      'policy_premium_history',
      { 'data.policy': idOf(policy) },
      { createdAt: 1 },
    );
    const open = history.find((h) => !dataOf(h).effective_to);
    if (open) await updateDynamic(open, { effective_to: effectiveFrom }, userId);
    await createDynamic({
      tenantId,
      objectApiName: 'policy_premium_history',
      userId,
      data: {
        name: `Premium ${previous} → ${next}`,
        policy: idOf(policy),
        previous_premium: previous,
        new_premium: next,
        effective_from: effectiveFrom,
        reason,
      },
    });
  }
  return policy;
};

export const getEndorsementState = async ({ tenantId, endorsementId }) => {
  const endorsement = await loadEndorsement(tenantId, endorsementId);
  const items = await findMany(tenantId, 'policy_endorsement_item', { 'data.endorsement': idOf(endorsement) });
  return {
    endorsement: { id: idOf(endorsement), ...dataOf(endorsement) },
    items: items.map((i) => ({ id: String(i._id), ...dataOf(i) })),
  };
};

export const listEndorsements = async ({ tenantId, policyId }) => {
  const endorsements = await findMany(
    tenantId,
    'policy_endorsement',
    { 'data.policy': String(policyId) },
    { createdAt: -1 },
  );
  return endorsements.map((e) => ({ id: String(e._id), ...dataOf(e) }));
};

export const createEndorsement = async ({ tenantId, userId, policyId, body = {} }) => {
  const policy = await loadPolicy(tenantId, policyId);
  if (!CHANGE_TYPES.includes(body.change_type)) {
    throw new ValidationError([`change_type must be one of: ${CHANGE_TYPES.join(', ')}`], 400, {
      fieldErrors: { change_type: 'A valid change type is required.' },
    });
  }
  const endorsement = await createDynamic({
    tenantId,
    objectApiName: 'policy_endorsement',
    userId,
    data: {
      policy: idOf(policy),
      change_type: body.change_type,
      status: ENDORSEMENT_STATUS.DRAFT,
      request_date: now(),
      requested_by: String(userId),
      effective_date: body.effective_date,
      reason: body.reason,
      requires_approval: body.requires_approval !== false,
    },
  });
  await audit({
    tenantId,
    userId,
    action: 'create',
    resource: 'InsuranceEndorsement',
    resourceId: endorsement._id,
    objectApiName: 'policy_endorsement',
    details: { policy: idOf(policy), change_type: body.change_type },
  });
  return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
};

export const submitEndorsement = async ({ tenantId, userId, endorsementId }) => {
  const endorsement = await loadEndorsement(tenantId, endorsementId);
  const eData = dataOf(endorsement);

  if (eData.requires_approval === false) {
    // Straight-through approval
    await transitionEndorsement({ tenantId, userId, endorsement, to: ENDORSEMENT_STATUS.APPROVED });
    return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
  }

  // Requires approval - transition to pending_approval and create workflow
  await transitionEndorsement({ tenantId, userId, endorsement, to: ENDORSEMENT_STATUS.PENDING_APPROVAL });

  // Keep the initial endorsement approval as a single gate. Multi-stage sourcing
  // can replace this default when product approval rules require more stages.
  const chain = [
    { stage: 'underwriting_review', role: 'underwriter', order: 1 },
  ];

  await endorsementApprovalService.createApprovalWorkflow({
    tenantId,
    userId,
    endorsementId: idOf(endorsement),
    chain,
  });

  return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
};

export const approveEndorsement = async ({ tenantId, userId, endorsementId }) => {
  const endorsement = await loadEndorsement(tenantId, endorsementId);
  const eData = dataOf(endorsement);

  // If there's an approval workflow, process the stage decision
  const workflow = await endorsementApprovalService.loadApprovalWorkflow(tenantId, idOf(endorsement));
  if (workflow) {
    const result = await endorsementApprovalService.processStageDecision({
      tenantId,
      userId,
      workflowId: endorsementApprovalService.idOf(workflow),
      decision: 'approve',
    });
    return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
  }

  // Fallback to simple approval (no workflow)
  await transitionEndorsement({ tenantId, userId, endorsement, to: ENDORSEMENT_STATUS.APPROVED });
  return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
};

export const rejectEndorsement = async ({ tenantId, userId, endorsementId, body = {} }) => {
  if (isBlank(body.reason)) {
    throw new ValidationError(['A reason is required to reject an endorsement.'], 400, {
      fieldErrors: { reason: 'Rejection reason is required.' },
    });
  }
  const endorsement = await loadEndorsement(tenantId, endorsementId);
  const eData = dataOf(endorsement);

  // If there's an approval workflow, process the stage decision
  const workflow = await endorsementApprovalService.loadApprovalWorkflow(tenantId, idOf(endorsement));
  if (workflow) {
    const result = await endorsementApprovalService.processStageDecision({
      tenantId,
      userId,
      workflowId: endorsementApprovalService.idOf(workflow),
      decision: 'reject',
      reason: body.reason,
    });
    return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
  }

  // Fallback to simple rejection
  await transitionEndorsement({
    tenantId,
    userId,
    endorsement,
    to: ENDORSEMENT_STATUS.REJECTED,
    patch: { decision_reason: body.reason },
  });
  return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
};

export const cancelEndorsement = async ({ tenantId, userId, endorsementId }) => {
  const endorsement = await loadEndorsement(tenantId, endorsementId);
  await transitionEndorsement({ tenantId, userId, endorsement, to: ENDORSEMENT_STATUS.CANCELLED });
  return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
};

/** Apply an approved endorsement: mutate the policy/lives, reprice and record items. */
export const applyEndorsement = async ({ tenantId, userId, endorsementId, body = {} }) => {
  const endorsement = await loadEndorsement(tenantId, endorsementId);
  const eData = dataOf(endorsement);
  if (eData.status !== ENDORSEMENT_STATUS.APPROVED) {
    throw new AppError('Only an approved endorsement can be applied.', 409);
  }
  const policy = await loadPolicy(tenantId, eData.policy);
  const pData = dataOf(policy);
  const effectiveFrom = eData.effective_date ? new Date(eData.effective_date) : now();
  const items = [];
  let repriced = false;

  switch (eData.change_type) {
    case 'cover_amount_change': {
      if (isBlank(body.cover_amount)) {
        throw new ValidationError(['cover_amount is required.'], 400, {
          fieldErrors: { cover_amount: 'A new cover amount is required.' },
        });
      }
      const life = await resolveTargetLife(tenantId, policy, body);
      items.push(makeItem({ field: 'insured_life.cover_amount', prior: dataOf(life).cover_amount, next: body.cover_amount, effectiveFrom }));
      await updateDynamic(life, { cover_amount: Number(body.cover_amount) }, userId);
      repriced = true;
      break;
    }
    case 'add_insured_life': {
      if (isBlank(body.relation)) {
        throw new ValidationError(['relation is required.'], 400, {
          fieldErrors: { relation: 'A relationship is required.' },
        });
      }
      const resolved = await resolveClient({ tenantId, userId, input: body.client || body });
      const life = await createDynamic({
        tenantId,
        objectApiName: 'insured_life',
        userId,
        data: {
          name: `${body.name || resolved.record.getField('name') || 'Member'} (${body.relation})`,
          policy: idOf(policy),
          client: idOf(resolved.record),
          relation: body.relation,
          age: body.age,
          cover_amount: body.cover_amount,
          start_date: effectiveFrom,
          status: 'active',
        },
      });
      items.push(makeItem({ field: 'insured_life', prior: null, next: `${body.relation}:${idOf(life)}`, effectiveFrom }));
      repriced = true;
      break;
    }
    case 'end_insured_life': {
      const life = await resolveTargetLife(tenantId, policy, body);
      items.push(makeItem({ field: 'insured_life.status', prior: dataOf(life).status, next: 'ended', effectiveFrom }));
      // Preserve the record + end date so claims can tell what cover existed on the event date (BRD §12).
      await updateDynamic(life, { status: 'ended', end_date: effectiveFrom }, userId);
      repriced = true;
      break;
    }
    case 'beneficiary_change': {
      const input = body.beneficiary || body;
      await appService.setBeneficiary({ tenantId, userId, policyId: idOf(policy), body: input });
      items.push(makeItem({ field: 'policy_party.beneficiary', prior: null, next: input.name || input.client_id || 'updated', effectiveFrom }));
      break;
    }
    case 'premium_payer_change': {
      const input = body.payer || body;
      items.push(makeItem({ field: 'policy.premium_payer', prior: pData.premium_payer ?? null, next: 'updated', effectiveFrom }));
      await appService.setPremiumPayer({ tenantId, userId, policyId: idOf(policy), body: input });
      break;
    }
    case 'payment_method_change': {
      items.push(makeItem({ field: 'policy.payment_method', prior: pData.payment_method ?? null, next: body.payment_method, effectiveFrom }));
      await appService.setPaymentMethod({
        tenantId,
        userId,
        policyId: idOf(policy),
        body: { payment_method: body.payment_method, provider_reference: body.provider_reference },
      });
      break;
    }
    case 'cancellation': {
      await appService.applyPolicyAction({ tenantId, userId, policyId: idOf(policy), action: 'cancel', reason: eData.reason || body.reason });
      items.push(makeItem({ field: 'policy.status', prior: pData.status, next: 'cancelled', effectiveFrom }));
      break;
    }
    case 'reinstatement': {
      await appService.applyPolicyAction({ tenantId, userId, policyId: idOf(policy), action: 'reinstate', reason: eData.reason || body.reason });
      items.push(makeItem({ field: 'policy.status', prior: pData.status, next: 'active', effectiveFrom }));
      break;
    }
    case 'other': {
      for (const it of body.items || []) {
        items.push(makeItem({ field: it.field_api_name, prior: it.prior_value, next: it.new_value, effectiveFrom }));
      }
      break;
    }
    default:
      throw new AppError(`Unsupported endorsement change type "${eData.change_type}".`, 400);
  }

  for (const item of items) {
    await createDynamic({
      tenantId,
      objectApiName: 'policy_endorsement_item',
      userId,
      data: { ...item, endorsement: idOf(endorsement) },
    });
  }

  let generatedFiles = [];
  if (repriced) {
    await reprice({
      tenantId,
      userId,
      policy,
      effectiveFrom,
      reason: `Endorsement ${eData.endorsement_number || ''}`.trim(),
    });
    // Regenerate contractual documents after a premium-affecting amendment (BRD §11.3).
    // Each generation is a new File version — the prior document is never erased.
    try {
      const contractResult = await policyDocumentService.generatePolicyDocument({ tenantId, userId, policyId: idOf(policy), type: 'contract' });
      const scheduleResult = await policyDocumentService.generatePolicyDocument({ tenantId, userId, policyId: idOf(policy), type: 'schedule' });
      generatedFiles = [...(contractResult.files || []), ...(scheduleResult.files || [])];
    } catch (docErr) {
      console.error('Post-endorsement document regeneration failed:', docErr.message);
    }
  }

  await transitionEndorsement({ tenantId, userId, endorsement, to: ENDORSEMENT_STATUS.APPLIED, patch: { effective_date: effectiveFrom } });

  // Dispatch endorsement communication with regenerated documents (BRD §16.2, §17.3)
  try {
    const payer = await findOne(tenantId, 'policy_party', { 'data.policy': idOf(policy), 'data.role': 'premium_payer' });
    if (payer) {
      await communicationService.logCommunication({
        tenantId,
        userId,
        policyId: idOf(policy),
        client: dataOf(payer).client,
        event: 'policy_endorsement',
        channel: 'email',
        subject: `Policy ${pData.policy_number || ''} endorsed`,
        body: `Your policy ${pData.policy_number || ''} has been amended. ${eData.reason || ''}`,
        attachments: generatedFiles.map(f => ({ fileId: f.id, name: f.name, mimeType: f.mimeType })),
      });
      try {
        await communicationDispatcher.dispatchCommunications(tenantId);
      } catch (dispErr) {
        console.error('Endorsement communication dispatch failed:', dispErr.message);
      }
    }
  } catch (commErr) {
    console.error('Endorsement communication logging failed:', commErr.message);
  }
  await audit({
    tenantId,
    userId,
    action: 'update',
    resource: 'InsuranceEndorsement',
    resourceId: endorsement._id,
    objectApiName: 'policy_endorsement',
    details: { policy: idOf(policy), change_type: eData.change_type, repriced },
  });
  return getEndorsementState({ tenantId, endorsementId: idOf(endorsement) });
};

export default {
  ENDORSEMENT_STATUS,
  CHANGE_TYPES,
  createEndorsement,
  submitEndorsement,
  approveEndorsement,
  rejectEndorsement,
  cancelEndorsement,
  applyEndorsement,
  getEndorsementState,
  listEndorsements,
};
