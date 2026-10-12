/**
 * Insurance billing & arrears engine tests (BRD §13, §15).
 *
 * Run: node --test tests/insurance-billing.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  billingKey,
  evaluateArrears,
  preparePremiumDebit,
  allocateCredit,
  prepareCredit,
  calculatePaidThroughDate,
  BillingError,
} from '../services/insurance/billingEngine.js';

test('billingKey is deterministic and policy+period scoped', () => {
  assert.equal(billingKey('pol123', '2026-01'), 'pol123|2026-01');
  assert.equal(billingKey('pol123', '2026-02'), 'pol123|2026-02');
});

test('preparePremiumDebit generates a debit with billing_key', () => {
  const d = preparePremiumDebit({
    policyId: 'pol1',
    accountId: 'acc1',
    amount: 125.50,
    billingPeriod: '2026-01',
    dueDate: '2026-01-01',
    transactionDate: '2026-01-01',
  });
  assert.equal(d.direction, 'debit');
  assert.equal(d.type, 'policy_premium');
  assert.equal(d.amount, 125.50);
  assert.equal(d.billing_key, 'pol1|2026-01');
  assert.equal(d.status, 'posted');
  assert.equal(d.allocated_amount, 0);
});

test('preparePremiumDebit throws on missing required fields', () => {
  assert.throws(
    () => preparePremiumDebit({ policyId: 'p1', accountId: 'a1' }),
    (e) => e instanceof BillingError && e.code === 'MISSING_FIELDS',
  );
});

test('evaluateArrears: zero missed → current', () => {
  const debits = [
    { _id: 'd1', billing_period: '2026-01', due_date: '2026-01-01', amount: 100, allocated_amount: 100, status: 'posted', type: 'policy_premium' },
  ];
  const r = evaluateArrears({ debits, asOfDate: '2026-02-01' });
  assert.equal(r.arrearsStatus, 'current');
  assert.equal(r.missedCount, 0);
  assert.equal(r.lapseEligible, false);
});

test('evaluateArrears: one unpaid within grace → in_grace, not yet missed', () => {
  const debits = [
    { _id: 'd1', billing_period: '2026-01', due_date: '2026-01-01', amount: 100, allocated_amount: 0, status: 'posted', type: 'policy_premium' },
  ];
  const r = evaluateArrears({ debits, graceDays: 30, asOfDate: '2026-01-15' });
  assert.equal(r.arrearsStatus, 'in_grace');
  assert.equal(r.missedCount, 0); // not missed until grace ends (BRD §15.1)
  assert.equal(r.lapseEligible, false);
});

test('evaluateArrears: one unpaid past grace → in_arrears, counted as missed', () => {
  const debits = [
    { _id: 'd1', billing_period: '2026-01', due_date: '2026-01-01', amount: 100, allocated_amount: 0, status: 'posted', type: 'policy_premium' },
  ];
  const r = evaluateArrears({ debits, graceDays: 30, asOfDate: '2026-02-02' });
  assert.equal(r.arrearsStatus, 'in_arrears');
  assert.equal(r.missedCount, 1);
  assert.equal(r.lapseEligible, false);
});

test('evaluateArrears: three non-consecutive missed → lapsed', () => {
  const debits = [
    { _id: 'd1', billing_period: '2026-01', due_date: '2026-01-01', amount: 100, allocated_amount: 0, status: 'posted', type: 'policy_premium' },
    { _id: 'd2', billing_period: '2026-02', due_date: '2026-02-01', amount: 100, allocated_amount: 100, status: 'posted', type: 'policy_premium' }, // paid
    { _id: 'd3', billing_period: '2026-06', due_date: '2026-06-01', amount: 100, allocated_amount: 0, status: 'posted', type: 'policy_premium' },
    { _id: 'd4', billing_period: '2026-11', due_date: '2026-11-01', amount: 100, allocated_amount: 0, status: 'posted', type: 'policy_premium' },
  ];
  const r = evaluateArrears({ debits, allowedMissed: 3, graceDays: 0, asOfDate: '2026-12-01' });
  assert.equal(r.missedCount, 3);
  assert.equal(r.arrearsStatus, 'lapsed');
  assert.equal(r.lapseEligible, true);
  assert.equal(r.periodsMissed.length, 3);
  assert.equal(r.periodsMissed[0].period, '2026-01');
  assert.equal(r.periodsMissed[1].period, '2026-06');
  assert.equal(r.periodsMissed[2].period, '2026-11');
});

test('evaluateArrears: partial settlement counts as missed at cut-off', () => {
  const debits = [
    { _id: 'd1', billing_period: '2026-01', due_date: '2026-01-01', amount: 100, allocated_amount: 50, status: 'posted', type: 'policy_premium' },
  ];
  const r = evaluateArrears({ debits, graceDays: 0, asOfDate: '2026-02-01' });
  assert.equal(r.missedCount, 1);
  assert.equal(r.arrearsStatus, 'in_arrears');
});

test('evaluateArrears: configurable threshold (not hardcoded 3)', () => {
  const debits = [
    { _id: 'd1', billing_period: '2026-01', due_date: '2026-01-01', amount: 100, allocated_amount: 0, status: 'posted', type: 'policy_premium' },
    { _id: 'd2', billing_period: '2026-02', due_date: '2026-02-01', amount: 100, allocated_amount: 0, status: 'posted', type: 'policy_premium' },
  ];
  const r3 = evaluateArrears({ debits, allowedMissed: 3, asOfDate: '2026-03-01' });
  assert.equal(r3.lapseEligible, false);
  const r2 = evaluateArrears({ debits, allowedMissed: 2, asOfDate: '2026-03-01' });
  assert.equal(r2.lapseEligible, true);
});

test('allocateCredit FIFO across outstanding debits', () => {
  const debits = [
    { _id: 'd1', due_date: '2026-01-01', amount: 100, allocated_amount: 0, status: 'posted', direction: 'debit', billing_period: '2026-01', type: 'policy_premium' },
    { _id: 'd2', due_date: '2026-02-01', amount: 100, allocated_amount: 0, status: 'posted', direction: 'debit', billing_period: '2026-02', type: 'policy_premium' },
    { _id: 'd3', due_date: '2026-03-01', amount: 100, allocated_amount: 0, status: 'posted', direction: 'debit', billing_period: '2026-03', type: 'policy_premium' },
  ];
  const r = allocateCredit(debits, 150);
  assert.equal(r.allocatedTotal, 150);
  assert.equal(r.remainingCredit, 0);
  assert.equal(debits[0].allocated_amount, 100);
  assert.equal(debits[1].allocated_amount, 50);
  assert.equal(debits[2].allocated_amount, 0);
  assert.equal(debits[0].allocation_status, 'fully_allocated');
  assert.equal(debits[1].allocation_status, 'partially_allocated');
});

test('allocateCredit: single debit settled by multiple credits', () => {
  const debits = [{ _id: 'd1', due_date: '2026-01-01', amount: 200, allocated_amount: 0, status: 'posted', direction: 'debit', type: 'policy_premium' }];
  allocateCredit(debits, 80);
  assert.equal(debits[0].allocated_amount, 80);
  allocateCredit(debits, 70);
  assert.equal(debits[0].allocated_amount, 150);
  allocateCredit(debits, 50);
  assert.equal(debits[0].allocated_amount, 200);
  assert.equal(debits[0].allocation_status, 'fully_allocated');
});

test('allocateCredit: one credit allocated across multiple debits', () => {
  const debits = [
    { _id: 'd1', due_date: '2026-01-01', amount: 80, allocated_amount: 0, status: 'posted', direction: 'debit', type: 'policy_premium' },
    { _id: 'd2', due_date: '2026-02-01', amount: 100, allocated_amount: 0, status: 'posted', direction: 'debit', type: 'policy_premium' },
  ];
  const r = allocateCredit(debits, 150);
  assert.equal(r.allocatedTotal, 150);
  assert.equal(debits[0].allocated_amount, 80);
  assert.equal(debits[1].allocated_amount, 70);
});

test('prepareCredit creates a credit with external_reference', () => {
  const c = prepareCredit({
    accountId: 'acc1',
    policyId: 'pol1',
    amount: 100,
    transactionDate: '2026-02-01',
    externalReference: 'ext-123',
    paymentMethod: 'debit_order',
  });
  assert.equal(c.direction, 'credit');
  assert.equal(c.external_reference, 'ext-123');
  assert.equal(c.payment_method, 'debit_order');
  assert.equal(c.status, 'posted');
});

test('calculatePaidThroughDate: contiguous fully settled periods', () => {
  const debits = [
    { direction: 'debit', status: 'posted', billing_period: '2026-01', amount: 100, allocated_amount: 100 },
    { direction: 'debit', status: 'posted', billing_period: '2026-02', amount: 100, allocated_amount: 100 },
    { direction: 'debit', status: 'posted', billing_period: '2026-03', amount: 100, allocated_amount: 50 },
  ];
  assert.equal(calculatePaidThroughDate(debits), '2026-02-28');
});

test('calculatePaidThroughDate: gap breaks contiguity', () => {
  const debits = [
    { direction: 'debit', status: 'posted', billing_period: '2026-01', amount: 100, allocated_amount: 100 },
    { direction: 'debit', status: 'posted', billing_period: '2026-02', amount: 100, allocated_amount: 50 },
    { direction: 'debit', status: 'posted', billing_period: '2026-03', amount: 100, allocated_amount: 100 },
  ];
  assert.equal(calculatePaidThroughDate(debits), '2026-01-31');
});

test('calculatePaidThroughDate: no settled periods → null', () => {
  const debits = [
    { direction: 'debit', status: 'posted', billing_period: '2026-01', amount: 100, allocated_amount: 0 },
  ];
  assert.equal(calculatePaidThroughDate(debits), null);
});