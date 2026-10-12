/**
 * Insurance billing run e2e test (BRD §13.2).
 *
 * Run: node tests/insurance-billing-run.e2e.mjs   (from backend/)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import Session from '../models/Session.js';
import DynamicRecord from '../models/DynamicRecord.js';
import AutoNumberCounter from '../models/AutoNumberCounter.js';
import { seedDefaultRoles } from '../services/roleService.js';
import { seedStandardObjects, ensureUserObject } from '../services/metadataService.js';
import { seedInsuranceObjects, seedInsuranceWorkspace } from '../services/insuranceMetadataService.js';
import { runBillingCycle } from '../services/insurance/billingRunService.js';
import { preparePremiumDebit } from '../services/insurance/billingEngine.js';

const RUN = Date.now().toString(36);
const PASSWORD = 'BillingRun123!';
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
    grace_period_days: 0,
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
    name: `ZZ_BILLINGRUN_${label}_${RUN}`,
    slug: `zz-billingrun-${label}-${RUN}`,
    hub,
    status: 'active',
    plan: 'enterprise',
  });
  await seedDefaultRoles(tenant._id);
  const adminRole = await Role.findOne({ tenantId: tenant._id, name: 'admin' });
  const user = await User.create({
    tenantId: tenant._id,
    firstName: 'Billing',
    lastName: label,
    email: `billingrun-${label}-${RUN}@example.com`,
    username: `billingrun_${label}_${RUN}`,
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

let tenantId, userId, product, pv;

try {
  await connectDB();
  const seeded = await seedTenant('a', 'insurance');
  tenantId = seeded.tenant._id;
  userId = seeded.user._id;
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

  // Create an ACTIVE policy with next_billing_date = today
  const policyIdObj = await objectIdFor(tenantId, 'policy');
  const policy = await mk(tenantId, userId, policyIdObj, 'policy', {
    status: 'active',
    status_effective_date: '2026-01-01',
    application_channel: 'website',
    product_version: String(pv._id),
    product: String(product._id),
    current_premium: 250,
    billing_frequency: 'monthly',
    next_billing_date: '2026-10-11', // today
    premium_payer: String(client._id),
    main_member: String(client._id),
    account: String(account._id),
  });
  const policyId = String(policy._id);

  // Policy party for premium payer
  const partyIdObj = await objectIdFor(tenantId, 'policy_party');
  await mk(tenantId, userId, partyIdObj, 'policy_party', {
    name: 'Premium Payer - John Doe',
    policy: policyId,
    client: String(client._id),
    role: 'premium_payer',
  });

  // Run billing cycle - should create a debit for 2026-10
  const result = await runBillingCycle(tenantId, userId);

  check('billing run processed the policy', result.processed === 1);
  check('debit created', result.created === 1);
  check('result has correct billing period', result.results[0]?.billingPeriod === '2026-10');
  check('result has correct amount', result.results[0]?.amount === 250);
  check('due date is today', result.results[0]?.dueDate === '2026-10-11');

  // Verify the premium_transaction was created
  const debits = await DynamicRecord.find({
    tenantId,
    objectApiName: 'premium_transaction',
    'data.policy': policyId,
    'data.direction': 'debit',
  });
  const firstDebit = debits[0] ? dataOf(debits[0]) : null;
  check('one debit exists in DB', debits.length === 1);
  check('debit has billing_key', !!firstDebit?.billing_key);
  check('billing_key format correct', firstDebit?.billing_key === `${policyId}|2026-10`);

  // Verify policy next_billing_date advanced by one month
  const updatedPolicy = await DynamicRecord.findOne({ tenantId, _id: policyId });
  check('next_billing_date advanced to 2026-11-11', dataOf(updatedPolicy).next_billing_date === '2026-11-11');

  // --- Idempotency: running again immediately should not create duplicate for same period ---
  // First run advanced next_billing_date to 2026-11-11, so policy is no longer due today
  const result2 = await runBillingCycle(tenantId, userId);
  check('second run creates nothing (idempotent for Oct)', result2.created === 0);

  // --- Policy not yet due should not be processed (query filters it out) ---
  const policy2IdObj = await objectIdFor(tenantId, 'policy');
  const policy2 = await mk(tenantId, userId, policy2IdObj, 'policy', {
    status: 'active',
    status_effective_date: '2026-01-01',
    application_channel: 'website',
    product_version: String(pv._id),
    product: String(product._id),
    current_premium: 300,
    billing_frequency: 'monthly',
    next_billing_date: '2026-12-01', // future
    premium_payer: String(client._id),
    main_member: String(client._id),
    account: String(account._id),
  });
  const policy2Id = String(policy2._id);
  await mk(tenantId, userId, partyIdObj, 'policy_party', {
    name: 'Premium Payer - John Doe 2',
    policy: policy2Id,
    client: String(client._id),
    role: 'premium_payer',
  });

  const result3 = await runBillingCycle(tenantId, userId);
  // Policies with future next_billing_date are excluded by the query, so processed=0
  check('policy with future next_billing_date not processed', result3.processed === 0);

} catch (err) {
  check('test harness ran without error', false, err.message);
  console.error(err);
} finally {
  await Tenant.deleteMany({ _id: tenantId });
  await Promise.all(
    [User, Role, ObjectMeta, FieldMeta, Session, DynamicRecord, AutoNumberCounter].map((M) =>
      M.deleteMany({ tenantId }).catch(() => {}),
    ),
  );
  await mongoose.connection.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);