/**
 * Scheduled billing run (BRD §13.2).
 *
 * Creates premium Debit transactions for policies whose Next Billing Date
 * has arrived and are eligible for billing. Designed to be invoked by a
 * Flow, cron, or scheduler daily.
 *
 * Rules:
 * - Only ACTIVE policies with next_billing_date <= today
 * - Uses Policy Premium History effective premium for the billing period
 * - Creates a Debit with unique Billing Key (policyId|billingPeriod) — idempotent
 * - Advances policy next_billing_date and due_date by one month
 * - Logs communication if configured
 */

import DynamicRecord from '../../models/DynamicRecord.js';
import FieldMeta from '../../models/FieldMeta.js';
import { findOne, findMany, updateDynamic, createDynamic } from './dynamicRecords.js';
import { preparePremiumDebit, billingKey } from './billingEngine.js';
import * as communicationService from './communicationService.js';
import { AppError } from '../../utils/errors.js';

const POLICY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARREARS: 'in_arrears',
  LAPSED: 'lapsed',
  CANCELLED: 'cancelled',
  CLOSED: 'closed',
};

const now = () => new Date().toISOString().slice(0, 10);

const addMonths = (isoDate, months) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + Number(months));
  return d.toISOString().slice(0, 10);
};

const lastDayOfMonth = (isoDate) => {
  const [y, m] = isoDate.split('-').map(Number);
  const end = new Date(Date.UTC(y, m, 0));
  return end.toISOString().slice(0, 10);
};

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
 * Load the effective premium for a policy at a given billing period.
 * Reads Policy Premium History; falls back to policy.current_premium.
 */
const getEffectivePremium = async (tenantId, policyId, billingPeriod) => {
  const history = await findMany(
    tenantId,
    'policy_premium_history',
    { 'data.policy': policyId },
    { createdAt: 1 },
  );

  const effective = history
    .map((h) => ({ ...dataOf(h), _id: String(h._id) }))
    .filter((h) => {
      const from = h.effective_from ? h.effective_from.slice(0, 10) : null;
      const to = h.effective_to ? h.effective_to.slice(0, 10) : null;
      if (from && from > billingPeriod) return false;
      if (to && to <= billingPeriod) return false;
      return true;
    })
    .sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''))[0];

  if (effective && effective.new_premium != null) {
    return Number(effective.new_premium);
  }

  // Fallback to policy.current_premium
  const policy = await findOne(tenantId, 'policy', { _id: policyId });
  if (policy && dataOf(policy).current_premium != null) {
    return Number(dataOf(policy).current_premium);
  }

  throw new AppError(`No premium amount configured for policy ${policyId}.`, 422);
};

/**
 * Check if a policy is eligible for billing this period.
 * Returns { eligible: boolean, reason?: string }
 */
const isBillingEligible = async (tenantId, policy) => {
  const p = dataOf(policy);

  // Status must be active or in_arrears (can still bill)
  if (![POLICY_STATUS.ACTIVE, POLICY_STATUS.INACTIVE, POLICY_STATUS.ARREARS].includes(p.status)) {
    return { eligible: false, reason: `Status ${p.status} not billable` };
  }

  // Must have an account
  if (!p.account) {
    return { eligible: false, reason: 'No premium account linked' };
  }

  // Next billing date must be <= today
  const nextBilling = p.next_billing_date;
  if (!nextBilling || nextBilling > now()) {
    return { eligible: false, reason: 'Next billing date not yet reached' };
  }

  // Must have a product version with pricing
  if (!p.product_version) {
    return { eligible: false, reason: 'No product version on policy' };
  }

  // Check if already billed for this period (idempotency via billing key)
  const period = nextBilling.slice(0, 7); // YYYY-MM
  const key = billingKey(String(policy._id), period);
  const existing = await DynamicRecord.findOne({
    tenantId,
    objectApiName: 'premium_transaction',
    'data.billing_key': key,
    isDeleted: false,
  });
  if (existing) {
    return { eligible: false, reason: 'Already billed for this period' };
  }

  return { eligible: true };
};

/**
 * Run the billing cycle for a single tenant.
 *
 * @param {string} tenantId
 * @param {string} systemUserId - user to record as creator/modifier
 * @returns {object} { processed, created, skipped, errors, results[] }
 */
export const runBillingCycle = async (tenantId, systemUserId) => {
  const today = now();

  // Find active policies where next_billing_date <= today
  const policies = await findMany(
    tenantId,
    'policy',
    {
      'data.status': { $in: [POLICY_STATUS.ACTIVE, POLICY_STATUS.INACTIVE, POLICY_STATUS.ARREARS] },
      'data.next_billing_date': { $lte: today },
    },
  );

  if (!policies.length) {
    return { processed: 0, created: 0, skipped: 0, errors: 0, results: [] };
  }

  const results = [];
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const policy of policies) {
    const policyId = String(policy._id);
    const pData = dataOf(policy);

    try {
      const check = await isBillingEligible(tenantId, policy);
      if (!check.eligible) {
        skipped++;
        results.push({ policyId, policyNumber: pData.policy_number, created: false, reason: check.reason });
        continue;
      }

      // Determine billing period and dates
      const nextBilling = pData.next_billing_date;
      const billingPeriod = nextBilling.slice(0, 7); // YYYY-MM
      const dueDate = nextBilling;
      const transactionDate = today;

      // Get effective premium for this period
      const amount = await getEffectivePremium(tenantId, policyId, billingPeriod);

      // Create the premium Debit
      const debit = preparePremiumDebit({
        policyId,
        accountId: pData.account,
        amount,
        billingPeriod,
        dueDate,
        transactionDate,
      });

      await createDynamic({
        tenantId,
        objectApiName: 'premium_transaction',
        userId: systemUserId,
        data: debit,
      });

      // Advance next_billing_date and due_date by one month
      const newNextBilling = addMonths(nextBilling, 1);
      const newDueDate = addMonths(dueDate, 1);

      await updateDynamic(policy, {
        next_billing_date: newNextBilling,
        // due_date is on the transaction, not the policy
      }, systemUserId);

      // Log billing communication
      try {
        const payer = await findOne(tenantId, 'policy_party', {
          'data.policy': policyId,
          'data.role': 'premium_payer',
        });
        if (payer) {
          await communicationService.logCommunication({
            tenantId,
            userId: systemUserId,
            policyId,
            client: dataOf(payer).client,
            event: 'payment_due',
            channel: 'email',
            subject: `Premium due for policy ${pData.policy_number || ''}`,
            body: `Your premium of R${amount.toFixed(2)} is due on ${dueDate} for the period ${billingPeriod}.`,
          });
        }
      } catch (commErr) {
        console.error('Billing communication failed:', commErr.message);
      }

      created++;
      results.push({ policyId, policyNumber: pData.policy_number, created: true, amount, billingPeriod, dueDate });
    } catch (e) {
      errors++;
      results.push({ policyId, policyNumber: pData.policy_number, created: false, error: e.message });
      console.error(`Billing run error for policy ${policyId}:`, e.message);
    }
  }

  return {
    processed: policies.length,
    created,
    skipped,
    errors,
    results,
  };
};

/**
 * Run billing cycle across all insurance tenants (system-level cron).
 */
export const runBillingAllTenants = async (systemUserId) => {
  const tenants = await DynamicRecord.db.db
    .collection('tenants')
    .find({ status: 'active', hub: 'insurance' })
    .toArray();

  const allResults = [];
  for (const tenant of tenants) {
    try {
      const tenantResult = await runBillingCycle(String(tenant._id), systemUserId);
      allResults.push({ tenantId: String(tenant._id), tenantName: tenant.name, ...tenantResult });
    } catch (e) {
      console.error(`Billing run failed for tenant ${tenant.name}:`, e.message);
      allResults.push({ tenantId: String(tenant._id), tenantName: tenant.name, error: e.message });
    }
  }
  return allResults;
};

export default { runBillingCycle, runBillingAllTenants, getEffectivePremium, isBillingEligible };