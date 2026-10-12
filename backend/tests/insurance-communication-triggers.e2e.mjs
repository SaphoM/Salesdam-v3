/**
 * Communication triggers e2e test (BRD §16).
 *
 * Run: node tests/insurance-communication-triggers.e2e.mjs   (from backend/)
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
import * as commTemplates from '../services/insurance/communicationTemplates.js';
import * as commTriggers from '../services/insurance/communicationTriggers.js';
import * as commService from '../services/insurance/communicationService.js';
import { createDynamic } from '../services/insurance/dynamicRecords.js';

const RUN = Date.now().toString(36);
const PASSWORD = 'CommTrig123!';
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
    name: `ZZ_COMTRIG_${label}_${RUN}`,
    slug: `zz-comtrig-${label}-${RUN}`,
    hub,
    status: 'active',
    plan: 'enterprise',
  });
  await seedDefaultRoles(tenant._id);
  const adminRole = await Role.findOne({ tenantId: tenant._id, name: 'admin' });
  const user = await User.create({
    tenantId: tenant._id,
    firstName: 'Comm',
    lastName: label,
    email: `comm-${label}-${RUN}@example.com`,
    username: `comm_${label}_${RUN}`,
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

  // Create a client for premium payer
  const clientIdObj = await objectIdFor(tenantId, 'client');
  const client = await mk(tenantId, userId, clientIdObj, 'client', { name: 'John Doe', email: 'john@example.com' });

  // Create account
  const accountIdObj = await objectIdFor(tenantId, 'account');
  const account = await mk(tenantId, userId, accountIdObj, 'account', { name: 'John Account', account_number: 'ACC-001' });

  // Create active policy
  const policy = await createDynamic({
    tenantId,
    objectApiName: 'policy',
    userId,
    data: {
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
    },
  });
  const policyId = String(policy._id);

  // Policy party
  const partyIdObj = await objectIdFor(tenantId, 'policy_party');
  await mk(tenantId, userId, partyIdObj, 'policy_party', {
    name: 'Premium Payer - John Doe',
    policy: policyId,
    client: String(client._id),
    role: 'premium_payer',
  });

  // --- Test 1: Template rendering ---
  const rendered = commTemplates.renderTemplate('Hello {{client.name}}, policy {{policy.policy_number}}', {
    client: { name: 'John' },
    policy: { policy_number: 'POL-00001' },
  });
  check('template rendering works', rendered === 'Hello John, policy POL-00001');

  // --- Test 2: Create communication template ---
  const templateIdObj = await objectIdFor(tenantId, 'communication_template');
  const template = await mk(tenantId, userId, templateIdObj, 'communication_template', {
    name: 'Payment Due Email',
    api_name: 'payment_due_email',
    category: 'payment_due',
    channel: 'email',
    subject: 'Payment Due for Policy {{policy.policy_number}}',
    body: 'Dear {{client.name}},\n\nYour premium of R{{transaction.amount}} is due on {{transaction.due_date}} for policy {{policy.policy_number}}.\n\nPlease make payment to avoid lapse.',
    is_active: true,
    version: 1,
  });
  const templateId = String(template._id);
  check('communication template created', !!templateId);

  // Create templates for policy_issued and policy_lapsed
  await mk(tenantId, userId, templateIdObj, 'communication_template', {
    name: 'Policy Issued Email',
    api_name: 'policy_issued_email',
    category: 'policy_issued',
    channel: 'email',
    subject: 'Policy {{policy.policy_number}} Issued',
    body: 'Dear {{client.name}},\n\nYour policy {{policy.policy_number}} is now active.',
    is_active: true,
    version: 1,
  });
  await mk(tenantId, userId, templateIdObj, 'communication_template', {
    name: 'Policy Lapsed Email',
    api_name: 'policy_lapsed_email',
    category: 'policy_lapsed',
    channel: 'email',
    subject: 'Policy {{policy.policy_number}} Lapsed',
    body: 'Dear {{client.name}},\n\nYour policy {{policy.policy_number}} has lapsed after {{missedCount}} missed payments.',
    is_active: true,
    version: 1,
  });

  // --- Test 3: Trigger payment due communication ---
  const paymentDueResult = await commTriggers.triggerPaymentDue({
    tenantId,
    userId,
    policyId,
  });
  check('payment_due trigger runs without error', true);

  // --- Test 4: Verify communication was logged ---
  const comms = await DynamicRecord.find({ tenantId, objectApiName: 'policy_communication', 'data.policy': policyId });
  const paymentDueComm = comms.find(c => dataOf(c).event === 'payment_due');
  check('payment_due communication logged', !!paymentDueComm);
  if (paymentDueComm) {
    const d = dataOf(paymentDueComm);
    console.log('DEBUG paymentDueComm body:', d.body);
    console.log('DEBUG paymentDueComm subject:', d.subject);
    check('subject rendered with policy number', d.subject.includes(policy.policy_number || ''));
    check('body rendered with client name', d.body.includes('John'));
    check('channel is email', d.channel === 'email');
  }

  // --- Test 5: Trigger policy issued communication ---
  await commTriggers.triggerPolicyIssued({ tenantId, userId, policyId });
  const issuedComms = await DynamicRecord.find({ tenantId, objectApiName: 'policy_communication', 'data.policy': policyId });
  const issuedComm = issuedComms.find(c => dataOf(c).event === 'policy_issued');
  check('policy_issued communication logged', !!issuedComm);

  // --- Test 6: Trigger policy lapsed communication ---
  await commTriggers.triggerPolicyLapsed({ tenantId, userId, policyId, missedCount: 3 });
  const lapsedComms = await DynamicRecord.find({ tenantId, objectApiName: 'policy_communication', 'data.policy': policyId });
  const lapsedComm = lapsedComms.find(c => dataOf(c).event === 'policy_lapsed');
  check('policy_lapsed communication logged', !!lapsedComm);
  if (lapsedComm) {
    check('lapsed context includes missedCount', dataOf(lapsedComm).body.includes('3'));
  }

  // --- Test 7: Template listing ---
  const templates = await commTemplates.listTemplates(tenantId, { category: 'payment_due' });
  check('listTemplates returns created template', templates.length === 1);
  check('template has correct category', templates[0]?.category === 'payment_due');
  check('template has correct channel', templates[0]?.channel === 'email');

  // --- Test 8: Render template by ID ---
  const renderedById = await commTemplates.renderTemplateById(tenantId, templateId, {
    client: { name: 'Jane' },
    policy: { policy_number: 'POL-00002' },
    transaction: { amount: 300, due_date: '2026-02-01' },
  });
  check('renderTemplateById works', renderedById.subject === 'Payment Due for Policy POL-00002');
  check('renderTemplateById body rendered', renderedById.body.includes('Jane'));

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