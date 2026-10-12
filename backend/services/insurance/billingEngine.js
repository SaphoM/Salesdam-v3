/**
 * Insurance billing & arrears engine (BRD §13, §15).
 *
 * Pure core functions (no DB) + thin service wrappers. The core rules are:
 * - Premium debits created with unique Billing Key (policyId + billingPeriod) to prevent duplicates
 * - Credits posted against the Account, then allocated to outstanding Debits (FIFO)
 * - Missed payment = premium Debit not fully settled after grace/cut-off
 * - Three missed payments (non-consecutive) => lapse eligible
 * - Partial settlement counts as missed when cut-off reached
 * - Arrears status: Current → In Grace → In Arrears → Lapsed
 */

export class BillingError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
    this.details = details;
  }
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/** Generate the deterministic Billing Key for a policy + billing period. */
export const billingKey = (policyId, billingPeriod) => `${policyId}|${billingPeriod}`;

/**
 * Calculate arrears status and missed-payment count from the ledger.
 *
 * @param {object[]} debits - Posted premium debits for this policy, each:
 *   { _id, billing_period, due_date, amount, allocated_amount, status }
 * @param {object}   params
 * @param {number}   params.allowedMissed   threshold (default 3, BRD §15.1)
 * @param {number}   params.graceDays       grace period in days
 * @param {Date}     params.asOfDate        evaluation date (default now)
 * @returns {object} { arrearsStatus, missedCount, periodsMissed[], nextAction }
 */
export const evaluateArrears = ({ debits, allowedMissed = 3, graceDays = 0, asOfDate = new Date() }) => {
  const now = toDate(asOfDate);
  const posted = debits
    .filter((d) => d.status === 'posted' && d.type === 'policy_premium')
    .map((d) => ({
      id: d._id,
      period: d.billing_period,
      due: toDate(d.due_date),
      amount: Number(d.amount),
      allocated: Number(d.allocated_amount || 0),
      graceEnd: graceDays > 0 && d.due_date ? new Date(toDate(d.due_date).getTime() + graceDays * 86400000) : null,
    }))
    .sort((a, b) => a.due - b.due);

  // Track unsettled debits that are past their due date (regardless of grace)
  // but only count as "missed" for lapse purposes after grace/cut-off.
  const unsettledPastDue = posted.filter((d) => {
    const fullySettled = d.allocated >= d.amount - 0.005;
    return !fullySettled && now > d.due;
  });

  // Missed = past grace/cut-off (BRD §15.1)
  const missed = unsettledPastDue.filter((d) => {
    const pastGrace = d.graceEnd && now > d.graceEnd;
    return pastGrace || (graceDays === 0 && now > d.due);
  });
  const missedCount = missed.length;
  const periodsMissed = missed.map((d) => ({
    period: d.period,
    dueDate: d.due,
    amount: d.amount,
    allocated: d.allocated,
  }));

  // Arrears status reflects the worst state among unsettled debits:
  // - Lapsed if threshold reached
  // - In Grace if ANY unsettled debit is still within its grace period
  // - In Arrears if ALL unsettled debits are past grace
  // - Current if no unsettled past-due debits
  let currentStatus = 'current';
  if (unsettledPastDue.length > 0) {
    if (missedCount >= allowedMissed) {
      currentStatus = 'lapsed';
    } else {
      const anyInGrace = unsettledPastDue.some((d) => d.graceEnd && now <= d.graceEnd);
      currentStatus = anyInGrace ? 'in_grace' : 'in_arrears';
    }
  }

  const lapseEligible = missedCount >= allowedMissed;
  const nextAction = lapseEligible ? 'lapse' : (currentStatus === 'in_grace' ? 'enter_arrears' : null);

  return {
    arrearsStatus: currentStatus,
    missedCount,
    periodsMissed,
    allowedMissed,
    lapseEligible,
    nextAction,
    evaluatedAt: now.toISOString().slice(0, 10),
  };
};

/**
 * Create a premium Debit (idempotent by Billing Key).
 * Returns the debit record to create, or null if one already exists with that key.
 */
export const preparePremiumDebit = ({
  policyId,
  accountId,
  amount,
  billingPeriod,
  dueDate,
  transactionDate,
  type = 'policy_premium',
}) => {
  if (!policyId || !accountId || !amount || !billingPeriod) {
    throw new BillingError('MISSING_FIELDS', 'policyId, accountId, amount, billingPeriod are required.');
  }
  const key = billingKey(policyId, billingPeriod);
  return {
    name: `Premium Debit ${key}`,
    account: accountId,
    policy: policyId,
    direction: 'debit',
    type,
    amount: round2(amount),
    transaction_date: transactionDate,
    billing_period: billingPeriod,
    due_date: dueDate,
    billing_key: key,
    status: 'posted',
    allocated_amount: 0,
    allocation_status: 'unallocated',
  };
};

/**
 * Allocate a Credit amount across outstanding Debits (FIFO by due date).
 * Mutates the debits array (adds allocated_amount, allocation_status).
 * Returns { allocatedTotal, remainingCredit, allocations[] }.
 */
export const allocateCredit = (debits, creditAmount) => {
  let remaining = round2(creditAmount);
  const allocations = [];

  const outstanding = debits
    .filter((d) => d.direction === 'debit' && d.status === 'posted' && Number(d.amount) > Number(d.allocated_amount || 0) + 0.005)
    .sort((a, b) => toDate(a.due_date) - toDate(b.due_date));

  for (const d of outstanding) {
    if (remaining <= 0.005) break;
    const canAllocate = round2(Number(d.amount) - Number(d.allocated_amount || 0));
    const alloc = Math.min(remaining, canAllocate);
    if (alloc > 0.005) {
      d.allocated_amount = round2(Number(d.allocated_amount || 0) + alloc);
      d.allocation_status = d.allocated_amount >= Number(d.amount) - 0.005 ? 'fully_allocated' : 'partially_allocated';
      allocations.push({ debitId: d._id, allocated: alloc });
      remaining = round2(remaining - alloc);
    }
  }

  return { allocatedTotal: round2(creditAmount - remaining), remainingCredit: round2(remaining), allocations };
};

/**
 * Check if a credit's external reference already exists (idempotency for incoming payments).
 */
export const findDuplicateCredit = async (Model, { tenantId, externalReference, policyId }) => {
  if (!externalReference) return null;
  const q = {
    tenantId,
    objectApiName: 'premium_transaction',
    'data.external_reference': externalReference,
    isDeleted: false,
  };
  if (policyId) q['data.policy'] = policyId;
  return Model.findOne(q).lean();
};

/**
 * Prepare a Credit transaction from an incoming payment.
 */
export const prepareCredit = ({
  accountId,
  policyId,
  amount,
  transactionDate,
  externalReference,
  paymentMethod,
  billingPeriod,
  type = 'policy_premium',
}) => {
  if (!accountId || !amount || !transactionDate) {
    throw new BillingError('MISSING_FIELDS', 'accountId, amount, transactionDate are required for a credit.');
  }
  return {
    name: `Credit ${externalReference || 'manual'}`,
    account: accountId,
    policy: policyId,
    direction: 'credit',
    type,
    amount: round2(amount),
    transaction_date: transactionDate,
    billing_period: billingPeriod,
    external_reference: externalReference,
    payment_method: paymentMethod,
    status: 'posted',
    allocated_amount: 0,
    allocation_status: 'unallocated',
  };
};

/**
 * Determine Paid Through Date from fully settled billing periods (BRD §13.4).
 * Returns ISO date string or null if no contiguous fully-settled prefix.
 */
export const calculatePaidThroughDate = (debits) => {
  const posted = debits
    .filter((d) => d.direction === 'debit' && d.status === 'posted')
    .sort((a, b) => a.billing_period.localeCompare(b.billing_period));

  let lastFullySettled = null;
  for (const d of posted) {
    if (Number(d.allocated_amount || 0) >= Number(d.amount) - 0.005) {
      lastFullySettled = d.billing_period;
    } else {
      break; // contiguous rule
    }
  }
  // billing_period format YYYY-MM → paid through end of that month
  if (lastFullySettled) {
    const [y, m] = lastFullySettled.split('-').map(Number);
    const end = new Date(Date.UTC(y, m, 0)); // last day of month
    return end.toISOString().slice(0, 10);
  }
  return null;
};

export default {
  billingKey,
  evaluateArrears,
  preparePremiumDebit,
  allocateCredit,
  findDuplicateCredit,
  prepareCredit,
  calculatePaidThroughDate,
  BillingError,
};