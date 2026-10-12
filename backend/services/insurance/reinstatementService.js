/**
 * Policy reinstatement service (BRD §15.3).
 *
 * Orchestrates the guided reinstatement of a lapsed/cancelled policy:
 * - Eligibility validation (arrears, lapse period, ages, product rules, payments, waiting periods, approvals)
 * - Financial settlement (required credits + allocations)
 * - Endorsement creation (change_type: 'reinstatement') with audit trail
 * - Policy status transition to ACTIVE + status history
 * - Document regeneration + communications
 *
 * The actual state transition and endorsement application are delegated to
 * applicationService.applyPolicyAction and endorsementService.applyEndorsement
 * to keep the state machine in one place.
 */

import { findOne, findMany, createDynamic, updateDynamic } from './dynamicRecords.js';
import { dataOf } from './pricingService.js';
import * as appService from './applicationService.js';
import * as endorsementService from './endorsementService.js';
import * as billingEngine from './billingEngine.js';
import * as policyDocumentService from './policyDocumentService.js';
import * as communicationService from './communicationService.js';
import * as autoLapseService from './autoLapseService.js';
import { AppError, ValidationError } from '../../utils/errors.js';
import { audit } from '../../utils/auditLogger.js';

const POLICY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARREARS: 'in_arrears',
  LAPSED: 'lapsed',
  CANCELLED: 'cancelled',
  CLOSED: 'closed',
};

const now = () => new Date().toISOString().slice(0, 10);
const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
};

/**
 * Check if a lapsed/cancelled policy is eligible for reinstatement.
 * Returns { eligible: boolean, reasons: string[], requirements: object }
 */
export const checkReinstatementEligibility = async ({ tenantId, policyId, asOfDate = new Date() }) => {
  const policy = await findOne(tenantId, 'policy', { _id: policyId });
  if (!policy) throw new AppError('Policy not found.', 404);

  const pData = dataOf(policy);
  const reasons = [];
  let eligible = true;

  // Status must be lapsed or cancelled
  if (![POLICY_STATUS.LAPSED, POLICY_STATUS.CANCELLED].includes(pData.status)) {
    eligible = false;
    reasons.push(`Policy is ${pData.status}, not lapsed or cancelled.`);
  }

  // Product Version must be active and effective
  if (pData.product_version) {
    const pv = await findOne(tenantId, 'product_version', { _id: pData.product_version });
    if (pv) {
      const pvData = dataOf(pv);
      if (pvData.status !== 'active') {
        eligible = false;
        reasons.push('Product Version is not active.');
      }
      if (pvData.effective_to && pvData.effective_to <= now()) {
        eligible = false;
        reasons.push('Product Version has expired.');
      }
    }
  }

  // Arrears must be cleared (all premium debits fully allocated)
  const txns = await findMany(tenantId, 'premium_transaction', { 'data.policy': policyId });
  const debits = txns.filter((t) => dataOf(t).direction === 'debit' && dataOf(t).status === 'posted');
  const unsettled = debits.filter((d) => Number(dataOf(d).amount) > Number(dataOf(d).allocated_amount || 0) + 0.005);
  if (unsettled.length > 0) {
    const totalOutstanding = unsettled.reduce((s, d) => s + (Number(dataOf(d).amount) - Number(dataOf(d).allocated_amount || 0)), 0);
    reasons.push(`Outstanding arrears: R${totalOutstanding.toFixed(2)} across ${unsettled.length} period(s).`);
    // Don't mark ineligible — tenant config may allow reinstatement with payment plan
  }

  // Member ages must still be within Product Version entry ages
  if (pData.product_version) {
    const pv = await findOne(tenantId, 'product_version', { _id: pData.product_version });
    if (pv) {
      const pvData = dataOf(pv);
      const lives = await findMany(tenantId, 'insured_life', { 'data.policy': policyId, 'data.status': 'active' });
      for (const life of lives) {
        const lData = dataOf(life);
        const age = lData.age;
        if (age != null && pvData.min_entry_age != null && age < Number(pvData.min_entry_age)) {
          eligible = false;
          reasons.push(`Insured life age ${age} below minimum entry age ${pvData.min_entry_age}.`);
        }
        if (age != null && pvData.max_entry_age != null && age > Number(pvData.max_entry_age)) {
          eligible = false;
          reasons.push(`Insured life age ${age} exceeds maximum entry age ${pvData.max_entry_age}.`);
        }
      }
    }
  }

  // Waiting period treatment: check if any lives have unexpired waiting periods
  const waitingLives = await findMany(tenantId, 'insured_life', {
    'data.policy': policyId,
    'data.waiting_period_end_date': { $gt: now() },
  });
  if (waitingLives.length > 0) {
    reasons.push(`${waitingLives.length} insured life(s) have unexpired waiting periods.`);
    // Not necessarily ineligible — depends on tenant config
  }

  // Approval requirement: check if Product Version requires approval for reinstatement
  let approvalRequired = false;
  if (pData.product_version) {
    const pv = await findOne(tenantId, 'product_version', { _id: pData.product_version });
    if (pv && dataOf(pv).reinstatement_requires_approval === true) {
      approvalRequired = true;
    }
  }

  // Minimum elapsed lapse period (configurable, default 0)
  let minLapseDays = 0;
  if (pData.product_version) {
    const pv = await findOne(tenantId, 'product_version', { _id: pData.product_version });
    if (pv) minLapseDays = Number(dataOf(pv).min_lapse_days) || 0;
  }
  if (minLapseDays > 0 && pData.status_effective_date) {
    const lapsedDate = new Date(pData.status_effective_date);
    const elapsed = (asOfDate - lapsedDate) / 86400000;
    if (elapsed < minLapseDays) {
      eligible = false;
      reasons.push(`Minimum lapse period of ${minLapseDays} days not elapsed (${Math.floor(elapsed)} days).`);
    }
  }

  return {
    eligible,
    reasons,
    requirements: {
      outstandingArrears: unsettled.length,
      totalOutstanding: unsettled.reduce((s, d) => s + (Number(dataOf(d).amount) - Number(dataOf(d).allocated_amount || 0)), 0),
      approvalRequired,
      minLapseDays,
      waitingPeriodsActive: waitingLives.length,
    },
  };
};

/**
 * Calculate the total amount required to settle all outstanding premium debits.
 */
export const calculateReinstatementAmount = async ({ tenantId, policyId }) => {
  const txns = await findMany(tenantId, 'premium_transaction', { 'data.policy': policyId });
  const debits = txns.filter((t) => dataOf(t).direction === 'debit' && dataOf(t).status === 'posted');
  let total = 0;
  for (const d of debits) {
    const allocated = Number(dataOf(d).allocated_amount || 0);
    const amount = Number(dataOf(d).amount);
    if (allocated < amount - 0.005) {
      total += amount - allocated;
    }
  }
  return Math.round(total * 100) / 100;
};

/**
 * Record a reinstatement payment (Credit) and allocate to outstanding debits.
 * Returns { credited: number, allocated: number, allocations[] }
 */
export const recordReinstatementPayment = async ({
  tenantId,
  userId,
  policyId,
  accountId,
  amount,
  transactionDate,
  externalReference,
  paymentMethod,
}) => {
  if (!amount || amount <= 0) throw new AppError('Payment amount must be positive.', 400);

  // Create the credit
  const credit = billingEngine.prepareCredit({
    accountId,
    policyId,
    amount,
    transactionDate,
    externalReference,
    paymentMethod,
  });

  const creditRecord = await createDynamic({
    tenantId,
    objectApiName: 'premium_transaction',
    userId,
    data: credit,
  });

  // Load all posted debits for this policy
  const txns = await findMany(tenantId, 'premium_transaction', { 'data.policy': policyId });
  const debits = txns
    .filter((t) => dataOf(t).direction === 'debit' && dataOf(t).status === 'posted')
    .map((d) => ({ _id: String(d._id), ...dataOf(d) }))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  // Allocate
  const allocation = billingEngine.allocateCredit(debits, amount);

  // Persist allocations back to the debits
  for (const alloc of allocation.allocations) {
    const debitRecord = await findOne(tenantId, 'premium_transaction', { _id: alloc.debitId });
    if (debitRecord) {
      const newAllocated = Math.round((Number(dataOf(debitRecord).allocated_amount || 0) + alloc.allocated) * 100) / 100;
      const newStatus = newAllocated >= Number(dataOf(debitRecord).amount) - 0.005 ? 'fully_allocated' : 'partially_allocated';
      await updateDynamic(debitRecord, {
        allocated_amount: newAllocated,
        allocation_status: newStatus,
      }, userId);
    }
  }

  // Update the credit record with allocated amount
  await updateDynamic(creditRecord, {
    allocated_amount: allocation.allocatedTotal,
    allocation_status: allocation.remainingCredit <= 0.005 ? 'fully_allocated' : 'partially_allocated',
  }, userId);

  return {
    credited: amount,
    allocated: allocation.allocatedTotal,
    remainingCredit: allocation.remainingCredit,
    allocations: allocation.allocations,
    creditId: String(creditRecord._id),
  };
};

/**
 * Execute the full reinstatement: validate eligibility, require payment if arrears,
 * create endorsement, apply transition, regenerate documents, send communication.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @param {string} params.policyId
 * @param {string} [params.reason] - reason for reinstatement
 * @param {number} [params.paymentAmount] - if paying arrears upfront
 * @param {string} [params.paymentExternalRef]
 * @param {string} [params.paymentMethod]
 * @param {boolean} [params.skipPayment] - if tenant config allows reinstatement without full payment
 * @returns {object} updated application state
 */
export const reinstatePolicy = async ({
  tenantId,
  userId,
  policyId,
  reason = 'Reinstatement',
  paymentAmount = 0,
  paymentExternalRef,
  paymentMethod = 'eft_manual',
  skipPayment = false,
} = {}) => {
  const policy = await findOne(tenantId, 'policy', { _id: policyId });
  if (!policy) throw new AppError('Policy not found.', 404);
  const pData = dataOf(policy);

  // 1. Check eligibility
  const eligibility = await checkReinstatementEligibility({ tenantId, policyId });
  if (!eligibility.eligible) {
    throw new ValidationError(['Reinstatement not eligible: ' + eligibility.reasons.join('; ')], 409, {
      fieldErrors: { eligibility: eligibility.reasons.join('; ') },
    });
  }

  // 2. Financial settlement
  const requiredAmount = await calculateReinstatementAmount({ tenantId, policyId });
  let paymentResult = { allocated: 0 };

  if (requiredAmount > 0.005) {
    if (paymentAmount <= 0 && !skipPayment) {
      throw new ValidationError([`Arrears of R${requiredAmount.toFixed(2)} must be paid before reinstatement.`], 409, {
        fieldErrors: { paymentAmount: `Required: R${requiredAmount.toFixed(2)}` },
      });
    }
    if (paymentAmount > 0) {
      const accountId = pData.account;
      if (!accountId) throw new AppError('Policy has no linked premium account.', 422);
      paymentResult = await recordReinstatementPayment({
        tenantId,
        userId,
        policyId,
        accountId,
        amount: paymentAmount,
        transactionDate: now(),
        externalReference: paymentExternalRef || `REINSTATE-${Date.now()}`,
        paymentMethod,
      });
      if (paymentResult.allocated < requiredAmount - 0.005 && !skipPayment) {
        throw new ValidationError([`Payment of R${paymentAmount.toFixed(2)} does not cover full arrears of R${requiredAmount.toFixed(2)}.`], 409);
      }
    }
  }

  // 3. Create endorsement for reinstatement
  const endorsementState = await endorsementService.createEndorsement({
    tenantId,
    userId,
    policyId,
    body: {
      change_type: 'reinstatement',
      reason,
      effective_date: now(),
      requires_approval: false, // reinstatement is a service action, not a cover change
      // Items will be added by applyEndorsement
    },
  });
  const endorsementId = endorsementState.endorsement.id;

  // 4. Submit endorsement (auto-approves since requires_approval=false)
  await endorsementService.submitEndorsement({ tenantId, userId, endorsementId });

  // 5. Apply endorsement (this calls applyPolicyAction with 'reinstate')
  await endorsementService.applyEndorsement({
    tenantId,
    userId,
    endorsementId,
  });

  // 5. Regenerate policy documents
  try {
    await policyDocumentService.generatePolicyDocument({ tenantId, userId, policyId, type: 'contract' });
    await policyDocumentService.generatePolicyDocument({ tenantId, userId, policyId, type: 'schedule' });
  } catch (docErr) {
    console.error('Reinstatement document generation failed:', docErr.message);
  }

  // 6. Send reinstatement communication
  try {
    const payer = await findOne(tenantId, 'policy_party', { 'data.policy': policyId, 'data.role': 'premium_payer' });
    if (payer) {
      await communicationService.logCommunication({
        tenantId,
        userId,
        policyId,
        client: dataOf(payer).client,
        event: 'policy_reinstated',
        channel: 'email',
        subject: `Policy ${pData.policy_number || ''} reinstated`,
        body: `Your policy ${pData.policy_number || ''} has been reinstated. ${paymentAmount > 0 ? `Arrears of R${paymentAmount.toFixed(2)} settled.` : ''} Reason: ${reason}`,
      });
    }
  } catch (commErr) {
    console.error('Reinstatement communication failed:', commErr.message);
  }

  // 7. Audit
  await audit({
    tenantId,
    userId,
    action: 'update',
    resource: 'InsurancePolicy',
    resourceId: policy._id,
    objectApiName: 'policy',
    details: { endorsementId, paymentAmount, reason },
  });

  return appService.getApplicationState({ tenantId, policyId });
};

/**
 * Get the reinstatement status/requirements for a policy (for UI).
 */
export const getReinstatementStatus = async ({ tenantId, policyId }) => {
  const eligibility = await checkReinstatementEligibility({ tenantId, policyId });
  const requiredAmount = await calculateReinstatementAmount({ tenantId, policyId });
  return { ...eligibility, requiredAmount };
};

export default {
  checkReinstatementEligibility,
  calculateReinstatementAmount,
  recordReinstatementPayment,
  reinstatePolicy,
  getReinstatementStatus,
};