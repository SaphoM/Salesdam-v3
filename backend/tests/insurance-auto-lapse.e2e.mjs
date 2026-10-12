/**
 * Insurance auto-lapse service e2e test (BRD §15.2).
 *
 * Run: node tests/insurance-auto-lapse.e2e.mjs   (from backend/)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import Session from '../models/Session.js'
import DynamicRecord from '../models/DynamicRecord.js';
import AutoNumberCounter from '../models/AutoNumberCounter.js';
import { seedDefaultRoles } from '../services/roleService.js';
import { seedStandardObjects, ensureUserObject } from '../services/metadataService.js';
import { seedInsuranceObjects, seedInsuranceWorkspace } from '../services/insuranceMetadataService.js';
import { applyPolicyAction } from '../services/insurance/applicationService.js';
import { runAutoLapseEvaluation } from '../services/insurance/autoLapseService.js';
import { preparePremiumDebit, prepareCredit, allocateCredit, billingKey } from '../services/insurance/billingEngine.js';

const RUN = Date.now().toString(36);
const PASSWORD = 'AutoLapse123!';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

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

const objectIdFor = async (tenantId, apiName) => {
  const obj = await ObjectMeta.findOne({ tenantId, apiName });
  if (!obj) throw new Error(`object ${apiName} not seeded`);
  return obj._id;
};

const mk = (tenantId, userId, objectId, objectApiName, data) =>
  DynamicRecord.create({ tenantId, objectId, objectApiName, data, createdBy: userId, ownerId: userId });

// Create a premium transaction with auto-number
const mkTxn = async (tenantId, userId, txnData) => {
  const txnId = await objectIdFor(tenantId, 'premium_transaction');
  return mk(tenantId, userId, txnId, 'premium_transaction', txnData);
};

const seedPlan = async (tenantId, userId) => {
  const productId = await objectIdFor(tenantId, 'product');
  const pvId = await objectIdFor(tenantId, 'product_version');
  const bcId = await objectIdFor(tenantId, 'benefit_cover');
  const crId = await objectIdFor(tenantId, 'child_benefit_rule');

  const product = await mk(tenantId, userId, productId, 'product', { name: 'Funeral Plan' });
  const pv = await mk(tenantId, userId, pvId, 'product_version', {
    name: 'FP v1',
    product: String(product._id),
    status: 'active',
    effective_from: '2026-01-01',
    allow_spouse: true,
    allow_children: true,
    allow_extended_family: true,
    max_spouses: 1,
    max_children: 5,
    max_extended_family: 3,
    min_entry_age: 18,
    max_entry_age: 65,
    grace_period_days: 0, // no grace for this test
    max_missed_payments: 3,
    allows_manual_premium_override: false,
  });

  const cover = (rate_category, cover_amount, premium) =>
    mk(tenantId, userId, bcId, 'benefit_cover', {
      name: `${rate_category} ${cover_amount}`,
      product_version: String(pv._id),
      rate_category,
      cover_amount,
      min_age: 18,
      max_age: 65,
      premium,
      underwriter_rate: Math.round(premium * 0.8),
      markup: Math.round(premium * 0.2),
      waiting_period_months: 6,
      effective_from: '2026-01-01',
    });
  await cover('main_member_only', 100000, 250);
  await cover('main_member_spouse', 100000, 300);
  await cover('main_member_children', 100000, 350);
  await cover('main_member_spouse_children', 100000, 420);
  await cover('extended_family', 50000, 150);

  await mk(tenantId, userId, crId, 'child_benefit_rule', {
    name: 'Child 0-21',
    product_version: String(pv._id),
    min_age: 0,
    max_age: 21,
    percent_of_main_cover: 50,
    max_child_cover: 20000,
    effective_from: '2026-01-01',
  });

  return { product, pv };
};

const seedTenant = async (label, hub) => {
  const tenant = await Tenant.create({
    name: `ZZ_AUTOLAPSE_${label}_${RUN}`,
    slug: `zz-autolapse-${label}-${RUN}`,
    hub,
    status: 'active',
    plan: 'enterprise',
  });
  await seedDefaultRoles(tenant._id);
  const adminRole = await Role.findOne({ tenantId: tenant._id, name: 'admin' });
  const user = await User.create({
    tenantId: tenant._id,
    firstName: 'Auto',
    lastName: label,
    email: `autolapse-${label}-${RUN}@example.com`,
    username: `autolapse_${label}_${RUN}`,
    password: PASSWORD,
    role: adminRole._id,
    status: 'active',
    emailVerified: true,
  });
  await seedStandardObjects(tenant._id, user._id);
  await ensureUserObject(tenant._id, user._id);
  await seedInsuranceObjects(tenant._id, user._id);
  await seedInsuranceWorkspace(tenant._id, user._id);
  const plan = await seedPlan(tenant._id, user._id);
  return { tenant, user, adminRole, ...plan };
};

let tenantId, userId, adminRole, product, pv, tenantBId;

try {
  await connectDB();
  const seeded = await seedTenant('a', 'insurance');
  tenantId = seeded.tenant._id;
  userId = seeded.user._id;
  adminRole = seeded.adminRole;
  product = seeded.product;
  pv = seeded.pv;

  // Create a client for premium payer and main member
  const clientIdObj = await objectIdFor(tenantId, 'client');
  const client = await mk(tenantId, userId, clientIdObj, 'client', {
    name: 'John Doe',
    email: 'john@example.com',
  });

  // Create an account for the premium payer
  const accountIdObj = await objectIdFor(tenantId, 'account');
  const account = await mk(tenantId, userId, accountIdObj, 'account', {
    name: 'John Doe Premium Account',
    account_number: 'ACC-001',
    currency: 'ZAR',
    email: 'john@example.com',
  });

  // Create an ACTIVE policy directly (bypassing the application flow)
  const policyIdObj = await objectIdFor(tenantId, 'policy');
  const policy = await mk(tenantId, userId, policyIdObj, 'policy', {
    status: 'active',
    status_effective_date: '2026-01-01',
    application_channel: 'website',
    product_version: String(pv._id),
    product: String(product._id),
    current_premium: 250,
    billing_frequency: 'monthly',
    premium_payer: String(client._id),
    main_member: String(client._id),
    account: String(account._id),
  });
  const policyId = String(policy._id);

  // Create policy_party for premium payer
  const partyIdObj = await objectIdFor(tenantId, 'policy_party');
  await mk(tenantId, userId, partyIdObj, 'policy_party', {
    name: 'Premium Payer - John Doe',
    policy: policyId,
    client: String(client._id),
    role: 'premium_payer',
  });

  // Create 4 monthly premium debits: Jan, Feb, Mar, Apr (all 250)
  const debits = [
    { period: '2026-01', amount: 250, dueDate: '2026-01-01' },
    { period: '2026-02', amount: 250, dueDate: '2026-02-01' },
    { period: '2026-03', amount: 250, dueDate: '2026-03-01' },
    { period: '2026-04', amount: 250, dueDate: '2026-04-01' },
  ];

  for (const spec of debits) {
    const debit = preparePremiumDebit({
      policyId,
      accountId: String(account._id),
      amount: spec.amount,
      billingPeriod: spec.period,
      dueDate: spec.dueDate,
      transactionDate: spec.dueDate,
    });
    await mkTxn(tenantId, userId, debit);
  }

  // Pay only February (full payment)
  const credit = prepareCredit({
    accountId: String(account._id),
    policyId,
    amount: 250,
    transactionDate: '2026-02-05',
    externalReference: 'PAY-FEB-001',
    paymentMethod: 'debit_order',
  });
  await mkTxn(tenantId, userId, credit);

  // Run auto-lapse evaluation with allowedMissed=3, graceDays=0, asOfDate=2026-05-01
  // Jan (unpaid=missed), Feb (paid), Mar (unpaid=missed), Apr (unpaid=missed) = 3 missed → lapse
  const result = await runAutoLapseEvaluation(tenantId, userId);

  check('auto-lapse processed the policy', result.processed === 1);
  check('policy lapsed', result.lapsed === 1);
  check('result reports 3 missed', result.results[0]?.missedCount === 3);

  // Verify policy status is now LAPSED
  const lapsedPolicy = await DynamicRecord.findOne({ tenantId, _id: policyId });
  check('policy status is LAPSED', dataOf(lapsedPolicy).status === 'lapsed');

  // Verify arrears_status is LAPSED
  check('arrears_status updated to LAPSED', dataOf(lapsedPolicy).arrears_status === 'lapsed');

  // Verify policy_status_history entry for lapse
  const history = await DynamicRecord.find({ tenantId, objectApiName: 'policy_status_history', 'data.policy': policyId });
  const lapseEntry = history.find((h) => dataOf(h).to_status === 'lapsed');
  check('policy_status_history has lapse entry', !!lapseEntry);

  // --- Second tenant: policy with grace period, should NOT lapse yet ---
  const seededB = await seedTenant('b', 'insurance');
  tenantBId = seededB.tenant._id;
  const userBId = seededB.user._id;

  // Create client, account, policy for tenant B with grace period
  const clientBIdObj = await objectIdFor(tenantBId, 'client');
  const clientB = await mk(tenantBId, userBId, clientBIdObj, 'client', { name: 'Jane Smith' });
  const accountBIdObj = await objectIdFor(tenantBId, 'account');
  const accountB = await mk(tenantBId, userBId, accountBIdObj, 'account', { name: 'Jane Account', account_number: 'ACC-002' });
  const policyBIdObj = await objectIdFor(tenantBId, 'policy');
  const policyB = await mk(tenantBId, userBId, policyBIdObj, 'policy', {
    status: 'active',
    status_effective_date: '2026-01-01',
    application_channel: 'website',
    product_version: String(pv._id),
    product: String(product._id),
    current_premium: 250,
    billing_frequency: 'monthly',
    premium_payer: String(clientB._id),
    main_member: String(clientB._id),
    account: String(accountB._id),
  });
  const policyBId = String(policyB._id);

  // Policy party for B
  const partyBIdObj = await objectIdFor(tenantBId, 'policy_party');
  await mk(tenantBId, userBId, partyBIdObj, 'policy_party', {
    name: 'Premium Payer - Jane Smith',
    policy: policyBId,
    client: String(clientB._id),
    role: 'premium_payer',
  });

  // Create debits for B: Jan, Feb (Jan unpaid, Feb unpaid) - only 2 missed, within grace
  const debitsB = [
    { period: '2026-01', amount: 250, dueDate: '2026-01-01' },
    { period: '2026-02', amount: 250, dueDate: '2026-02-01' },
  ];
  const mkTxnB = async (txnData) => {
    const txnId = await objectIdFor(tenantBId, 'premium_transaction');
    return mk(tenantBId, userBId, txnId, 'premium_transaction', txnData);
  };
  for (const spec of debitsB) {
    const debit = preparePremiumDebit({
      policyId: policyBId,
      accountId: String(accountB._id),
      amount: spec.amount,
      billingPeriod: spec.period,
      dueDate: spec.dueDate,
      transactionDate: spec.dueDate,
    });
    await mkTxnB(debit);
  }

  // Product version for B has grace period - but we used the same pv which has grace_period_days: 0
  // Let's create a new product version for B with grace
  const pvBIdObj = await objectIdFor(tenantBId, 'product_version');
  const pvB = await mk(tenantBId, userBId, pvBIdObj, 'product_version', {
    name: 'FP v1 Grace',
    product: String(product._id),
    status: 'active',
    effective_from: '2026-01-01',
    allow_spouse: true,
    allow_children: true,
    allow_extended_family: true,
    max_spouses: 1,
    max_children: 5,
    max_extended_family: 3,
    min_entry_age: 18,
    max_entry_age: 65,
    grace_period_days: 30, // 30 days grace
    max_missed_payments: 3,
    allows_manual_premium_override: false,
  });

  // Update policy B to use the new product version
  await DynamicRecord.updateOne(
    { tenantId: tenantBId, _id: policyBId },
    { $set: { 'data.product_version': String(pvB._id) } }
  );

  // Run auto-lapse for tenant B (asOfDate = 2026-02-15, within grace)
  const resultB = await runAutoLapseEvaluation(tenantBId, userBId, new Date('2026-02-15'));
  check('tenant B policy not lapsed (within grace)', resultB.lapsed === 0);
  check('tenant B arrears_status is IN_GRACE', resultB.results[0]?.arrearsStatus === 'in_grace');

} catch (err) {
  check('test harness ran without error', false, err.message);
  console.error(err);
} finally {
  const tenantIds = [tenantId, tenantBId].filter(Boolean);
  await Tenant.deleteMany({ _id: { $in: tenantIds } });
  await Promise.all(
    [User, Role, ObjectMeta, FieldMeta, Session, DynamicRecord, AutoNumberCounter].map((M) =>
      M.deleteMany({ tenantId: { $in: tenantIds } }).catch(() => {}),
    ),
  );
  await mongoose.connection.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);