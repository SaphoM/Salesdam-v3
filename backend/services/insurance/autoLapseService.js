/**
 * Automatic arrears evaluation & lapse service (BRD §13.4, §15.2).
 *
 * Runs on a schedule (e.g., daily via cron) to evaluate all active policies
 * against their premium ledger and transition eligible policies to Lapsed.
 *
 * Usage:
 *   - As a standalone script: node scripts/run-auto-lapse.js
 *   - Via external cron: (schedule) node /path/to/scripts/run-auto-lapse.js
 *   - Or imported and called from a Flow/scheduler.
 *
 * The service is tenant-aware: it processes each tenant's active policies.
 */

import DynamicRecord from '../../models/DynamicRecord.js';
import { evaluateArrears, calculatePaidThroughDate, allocateCredit, BillingError } from './billingEngine.js';
import { applyPolicyAction } from './applicationService.js';
import { findOne, findMany, updateDynamic } from './dynamicRecords.js';
import { AppError } from '../../utils/errors.js';

const POLICY_STATUS = {
  STARTED: 'application_started',
  QUOTED: 'quote_generated',
  SUBMITTED: 'application_submitted',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARREARS: 'in_arrears',
  LAPSED: 'lapsed',
  CANCELLED: 'cancelled',
  CLOSED: 'closed',
};

const now = () => new Date().toISOString().slice(0, 10);

/** Convert a DynamicRecord to plain object. */
const dataOf = (rec) => {
  const d = rec?.data;
  if (!d) return {};
  if (typeof d.get === 'function') {
    const out = {};
    for (const [k, v] of d) out[k] = v;
    return out;
  }
  return d;
};

/**
 * Load the billing configuration for a policy from its Product Version.
 */
const loadPolicyBillingConfig = async (tenantId, policy) => {
  const pData = dataOf(policy);
  const pvId = pData.product_version;
  if (!pvId) return { graceDays: 0, allowedMissed: 3, stopBillingOnLapse: true };

  const pv = await findOne(tenantId, 'product_version', { _id: pvId });
  if (!pv) return { graceDays: 0, allowedMissed: 3, stopBillingOnLapse: true };

  const pvData = dataOf(pv);
  return {
    graceDays: Number(pvData.grace_period_days) || 0,
    allowedMissed: Number(pvData.max_missed_payments) || 3,
    stopBillingOnLapse: pvData.stop_billing_on_lapse !== false, // default true
  };
};

/**
 * Load posted premium transactions (debits + credits) for a policy.
 */
const loadPremiumTransactions = async (tenantId, policyId) => {
  const txns = await findMany(
    tenantId,
    'premium_transaction',
    { 'data.policy': policyId },
    { createdAt: 1 },
  );
  return txns.map((t) => ({ _id: String(t._id), ...dataOf(t) }));
};

/**
 * Evaluate and update a single policy's arrears state.
 * Returns { lapsed: boolean, arrearsStatus, paidThroughDate, missedCount }.
 */
const evaluatePolicyArrears = async (tenantId, policy, userId, asOfDate) => {
  const pData = dataOf(policy);

  // Only evaluate policies that can go into arrears.
  if (![POLICY_STATUS.ACTIVE, POLICY_STATUS.INACTIVE, POLICY_STATUS.ARREARS].includes(pData.status)) {
    return { evaluated: false, reason: `Status ${pData.status} not eligible` };
  }

  const config = await loadPolicyBillingConfig(tenantId, policy);
  const txns = await loadPremiumTransactions(tenantId, pData._id || String(policy._id));

  // Split debits and credits
  const debits = txns.filter((t) => t.direction === 'debit');
  const credits = txns.filter((t) => t.direction === 'credit');

  if (debits.length === 0) {
    return { evaluated: false, reason: 'No premium debits found' };
  }

  // Allocate credits to debits (FIFO) before evaluating arrears
  for (const credit of credits.filter((c) => c.status === 'posted')) {
    allocateCredit(debits, Number(credit.amount));
  }

  // Evaluate arrears
  const evaluation = evaluateArrears({
    debits,
    allowedMissed: config.allowedMissed,
    graceDays: config.graceDays,
    asOfDate: asOfDate || new Date(),
  });

  // Calculate paid through date
  const paidThrough = calculatePaidThroughDate(debits);

  // Update policy fields
  const updates = {
    arrears_status: evaluation.arrearsStatus,
    paid_through_date: paidThrough,
  };

  // Grace period end date for the earliest unsettled debit
  const earliestUnsettled = debits
    .filter((d) => d.status === 'posted' && Number(d.allocated_amount || 0) < Number(d.amount) - 0.005)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

  if (earliestUnsettled && config.graceDays > 0) {
    const due = new Date(earliestUnsettled.due_date);
    due.setDate(due.getDate() + config.graceDays);
    updates.grace_period_end_date = due.toISOString().slice(0, 10);
  }

  await updateDynamic(policy, updates, userId);

  // Trigger automatic lapse if eligible
  if (evaluation.lapseEligible) {
    try {
      await applyPolicyAction({
        tenantId,
        userId,
        policyId: String(policy._id),
        action: 'lapse',
        reason: `Automatic lapse: ${evaluation.missedCount} missed payments (threshold ${config.allowedMissed})`,
      });
      return { lapsed: true, ...evaluation, paidThroughDate: paidThrough };
    } catch (e) {
      // Transition may fail if policy already lapsed/cancelled; log and continue
      console.error(`Auto-lapse failed for policy ${String(policy._id)}:`, e.message);
      return { lapsed: false, error: e.message, ...evaluation, paidThroughDate: paidThrough };
    }
  }

  return { lapsed: false, ...evaluation, paidThroughDate: paidThrough };
};

/**
 * Run the automatic arrears evaluation for all active policies in a tenant.
 *
 * @param {Date} [asOfDate] - Evaluation date (defaults to now). Useful for testing/historical runs.
 * @returns {object} { processed, lapsed, errors, results[] }
 */
export const runAutoLapseEvaluation = async (tenantId, systemUserId, asOfDate) => {
  const policies = await findMany(
    tenantId,
    'policy',
    { 'data.status': { $in: [POLICY_STATUS.ACTIVE, POLICY_STATUS.INACTIVE, POLICY_STATUS.ARREARS] } },
  );

  if (!policies.length) {
    return { processed: 0, lapsed: 0, errors: 0, results: [] };
  }

  const results = [];
  let lapsedCount = 0;
  let errorCount = 0;

  for (const policy of policies) {
    try {
      const result = await evaluatePolicyArrears(tenantId, policy, systemUserId, asOfDate);
      results.push({ policyId: String(policy._id), policyNumber: dataOf(policy).policy_number, ...result });
      if (result.lapsed) lapsedCount++;
    } catch (e) {
      errorCount++;
      results.push({ policyId: String(policy._id), error: e.message });
      console.error(`Auto-lapse evaluation error for policy ${String(policy._id)}:`, e.message);
    }
  }

  return {
    processed: policies.length,
    lapsed: lapsedCount,
    errors: errorCount,
    results,
  };
};

/**
 * Run across all tenants (for a system-level cron).
 */
export const runAutoLapseAllTenants = async (systemUserId) => {
  const tenants = await DynamicRecord.db.db
    .collection('tenants')
    .find({ status: 'active', hub: 'insurance' })
    .toArray();

  const allResults = [];
  for (const tenant of tenants) {
    try {
      const tenantResult = await runAutoLapseEvaluation(String(tenant._id), systemUserId);
      allResults.push({ tenantId: String(tenant._id), tenantName: tenant.name, ...tenantResult });
    } catch (e) {
      console.error(`Auto-lapse failed for tenant ${tenant.name}:`, e.message);
      allResults.push({ tenantId: String(tenant._id), tenantName: tenant.name, error: e.message });
    }
  }
  return allResults;
};

export default {
  runAutoLapseEvaluation,
  runAutoLapseAllTenants,
  evaluatePolicyArrears,
  loadPolicyBillingConfig,
  loadPremiumTransactions,
};