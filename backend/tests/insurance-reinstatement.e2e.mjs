/**
 * Insurance reinstatement e2e test (BRD §15.3).
 *
 * Run: node tests/insurance-reinstatement.e2e.mjs   (from backend/)
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
import { applyPolicyAction } from '../services/insurance/applicationService.js';
import { runAutoLapseEvaluation } from '../services/insurance/autoLapseService.js';
import { runBillingCycle } from '../services/insurance/billingRunService.js';
import { reinstatePolicy, checkReinstatementEligibility, calculateReinstatementAmount, recordReinstatementPayment } from '../services/insurance/reinstatementService.js';
import { preparePremiumDebit, prepareCredit, allocateCredit } from '../services/insurance/billingEngine.js';

const RUN = Date.now().toString(36);
const PASSWORD = 'Reinstate123!';
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
    reinstatement_requires_approval: false,
    min_lapse_days: 0,
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
    name: `ZZ_REINSTATE_${label}_${RUN}`,
    slug: `zz-reinstate-${label}-${RUN}`,
    hub,
    status: 'active',
    plan: 'enterprise',
  });
  await seedDefaultRoles(tenant._id);
  const adminRole = await Role.findOne({ tenantId: tenant._id, name: 'admin' });
  const user = await User.create({
    tenantId: tenant._id,
    firstName: 'Reinst',
    lastName: label,
    email: `reinst-${label}-${RUN}@example.com`,
    username: `reinst_${label}_${RUN}`,
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

async function createLapsedPolicyWithArrears(tenantId, userId) {
  console.log('[createLapsed] Starting');
  // Create client, account, policy
  const clientIdObj = await objectIdFor(tenantId, 'client');
  console.log('[createLapsed] clientIdObj:', clientIdObj);
  const client = await mk(tenantId, userId, clientIdObj, 'client', { name: 'John Doe' });
  console.log('[createLapsed] client created:', String(client._id));
  const accountIdObj = await objectIdFor(tenantId, 'account');
  console.log('[createLapsed] accountIdObj:', accountIdObj);
  const account = await mk(tenantId, userId, accountIdObj, 'account', { name: 'John Account', account_number: 'ACC-001' });
  console.log('[createLapsed] account created:', String(account._id));
  const policyIdObj = await objectIdFor(tenantId, 'policy');
  console.log('[createLapsed] policyIdObj:', policyIdObj);
  const policy = await mk(tenantId, userId, policyIdObj, 'policy', {
    status: 'active',
    status_effective_date: '2026-01-01',
    application_channel: 'website',
    product_version: String(pv._id),
    product: String(product._id),
    current_premium: 250,
    billing_frequency: 'monthly',
    next_billing_date: '2026-01-01',
    premium_payer: String(client._id),
    main_member: String(client._id),
    account: String(account._id),
  });
  console.log('[createLapsed] policy created:', String(policy._id));
  const policyId = String(policy._id);

  // Policy party
  const partyIdObj = await objectIdFor(tenantId, 'policy_party');
  console.log('[createLapsed] partyIdObj:', partyIdObj);
  await mk(tenantId, userId, partyIdObj, 'policy_party', {
    name: 'Premium Payer - John Doe',
    policy: policyId,
    client: String(client._id),
    role: 'premium_payer',
  });
  console.log('[createLapsed] party created');

  // Create debits: Jan, Feb, Mar (all unpaid)
  const debits = [
    { period: '2026-01', amount: 250, dueDate: '2026-01-01' },
    { period: '2026-02', amount: 250, dueDate: '2026-02-01' },
    { period: '2026-03', amount: 250, dueDate: '2026-03-01' },
  ];
  console.log('[createLapsed] Creating debits...');
  const mkTxn = async (txnData) => {
    const txnId = await objectIdFor(tenantId, 'premium_transaction');
    return mk(tenantId, userId, txnId, 'premium_transaction', txnData);
  };
  for (const spec of debits) {
    const debit = preparePremiumDebit({
      policyId,
      accountId: String(account._id),
      amount: spec.amount,
      billingPeriod: spec.period,
      dueDate: spec.dueDate,
      transactionDate: spec.dueDate,
    });
    console.log('[createLapsed] Creating debit for', spec.period);
    await mkTxn(debit);
    console.log('[createLapsed] Debit created for', spec.period);
  }
  console.log('[createLapsed] Debits done');

  // Run auto-lapse (asOf 2026-04-01: 3 missed -> lapse)
  await runAutoLapseEvaluation(tenantId, userId, new Date('2026-04-01'));

  return { policyId, accountId: String(account._id), clientId: String(client._id) };
}

try {
  await connectDB();
  console.log('[test] DB connected');
  const seeded = await seedTenant('a', 'insurance');
  console.log('[test] Tenant seeded');
  tenantId = seeded.tenant._id;
  userId = seeded.user._id;
  product = seeded.product;
  pv = seeded.pv;

  // Create a lapsed policy with arrears
  const { policyId, accountId, clientId } = await createLapsedPolicyWithArrears(tenantId, userId);
  console.log('[test] Lapsed policy created:', policyId);

  // Verify policy is lapsed
  const lapsedPolicy = await DynamicRecord.findOne({ tenantId, _id: policyId });
  check('policy is lapsed', dataOf(lapsedPolicy).status === 'lapsed');

  // Check eligibility - should show outstanding arrears
  const eligibility = await checkReinstatementEligibility({ tenantId, policyId });
  check('eligibility shows arrears', eligibility.requirements.outstandingArrears === 3);
  check('eligibility total outstanding', eligibility.requirements.totalOutstanding === 750);
  check('eligible but with reasons', eligibility.eligible === true); // tenant config allows with payment

  // Calculate reinstatement amount
  const requiredAmount = await calculateReinstatementAmount({ tenantId, policyId });
  check('reinstatement amount = 750', requiredAmount === 750);

  // Try to reinstate without payment - should fail
  try {
    await reinstatePolicy({ tenantId, userId, policyId, reason: 'Test reinstate' });
    check('reinstate without payment fails', false);
  } catch (e) {
    check('reinstate without payment throws', e.message.includes('Arrears of R750.00 must be paid'));
  }

  // Reinstate with full payment
  const state = await reinstatePolicy({
    tenantId,
    userId,
    policyId,
    reason: 'Customer paid arrears',
    paymentAmount: 750,
    paymentExternalRef: 'REINSTATE-001',
    paymentMethod: 'debit_order',
  });
  check('reinstate succeeds', state.policy.status === 'active');

  // Verify policy is active
  const reinstatedPolicy = await DynamicRecord.findOne({ tenantId, _id: policyId });
  check('policy status active', dataOf(reinstatedPolicy).status === 'active');
  check('policy status effective date updated', !!dataOf(reinstatedPolicy).status_effective_date);

  // Verify arrears cleared
  const txns = await DynamicRecord.find({ tenantId, objectApiName: 'premium_transaction', 'data.policy': policyId });
  const debitsAfter = txns.filter(t => dataOf(t).direction === 'debit' && dataOf(t).status === 'posted');
  const stillOutstanding = debitsAfter.filter(d => Number(dataOf(d).amount) > Number(dataOf(d).allocated_amount || 0) + 0.005);
  check('all debits settled', stillOutstanding.length === 0);

  // Verify credit created
  const credits = txns.filter(t => dataOf(t).direction === 'credit' && dataOf(t).status === 'posted');
  check('reinstatement credit created', credits.length === 1);
  check('credit amount 750', Number(dataOf(credits[0]).amount) === 750);
  check('credit fully allocated', Number(dataOf(credits[0]).allocated_amount || 0) === 750);

  // Verify endorsement created
  const endorsements = await DynamicRecord.find({ tenantId, objectApiName: 'policy_endorsement', 'data.policy': policyId });
  check('reinstatement endorsement created', endorsements.length === 1);
  check('endorsement type reinstatement', dataOf(endorsements[0]).change_type === 'reinstatement');
  check('endorsement applied', dataOf(endorsements[0]).status === 'applied');

  // Verify status history has lapse -> active transition
  const history = await DynamicRecord.find({ tenantId, objectApiName: 'policy_status_history', 'data.policy': policyId });
  const reinstateEntry = history.find(h => dataOf(h).to_status === 'active' && dataOf(h).from_status === 'lapsed');
  check('status history has reinstate entry', !!reinstateEntry);

  // Verify communication logged
  const comms = await DynamicRecord.find({ tenantId, objectApiName: 'policy_communication', 'data.policy': policyId });
  const reinstateComm = comms.find(c => dataOf(c).event === 'policy_reinstated');
  check('reinstatement communication logged', !!reinstateComm);

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