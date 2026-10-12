/**
 * Policy endorsements / amendments (BRD §17) e2e.
 *
 * Proves: amendments move draft → [pending_approval →] approved → applied only
 * through legal transitions; an unapproved endorsement cannot be applied;
 * cover/life changes are repriced by the authoritative engine and write a new
 * effective-dated Policy Premium History row; every change is recorded as a
 * policy_endorsement_item; and tenant isolation holds on every route.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import DynamicRecord from '../models/DynamicRecord.js';
import Session from '../models/Session.js';
import Workspace from '../models/Workspace.js';
import AutoNumberCounter from '../models/AutoNumberCounter.js';
import { seedDefaultRoles } from '../services/roleService.js';
import { seedStandardObjects, ensureUserObject } from '../services/metadataService.js';
import { seedInsuranceObjects, seedInsuranceWorkspace } from '../services/insuranceMetadataService.js';
import connectDB from '../config/db.js';
import app from '../app.js';

const RUN = Date.now().toString(36);
const PASSWORD = 'InsEnd123!';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
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
  const product = await mk(tenantId, userId, productId, 'product', { name: 'Funeral Plan' });
  const pv = await mk(tenantId, userId, pvId, 'product_version', {
    name: 'FP v1',
    product: String(product._id),
    status: 'active',
    effective_from: '2026-01-01',
    allow_spouse: true,
    allow_children: false,
    allow_extended_family: false,
    min_entry_age: 18,
    max_entry_age: 65,
    allows_manual_premium_override: false,
  });
  const cover = (name, rate_category, cover_amount, premium) =>
    mk(tenantId, userId, bcId, 'benefit_cover', {
      name,
      product_version: String(pv._id),
      rate_category,
      cover_amount,
      min_age: 18,
      max_age: 65,
      premium,
      effective_from: '2026-01-01',
    });
  await cover('main only 100k', 'main_member_only', 100000, 250);
  await cover('main only 200k', 'main_member_only', 200000, 400);
  await cover('main+spouse 200k', 'main_member_spouse', 200000, 500);
  return { pv };
};

const seedTenant = async (label) => {
  const tenant = await Tenant.create({
    name: `ZZ_INSEND_${label}_${RUN}`,
    slug: `zz-insend-${label}-${RUN}`,
    hub: 'insurance',
    status: 'active',
    plan: 'enterprise',
  });
  await seedDefaultRoles(tenant._id);
  const adminRole = await Role.findOne({ tenantId: tenant._id, name: 'admin' });
  const user = await User.create({
    tenantId: tenant._id,
    firstName: 'End',
    lastName: label,
    email: `insend-${label}-${RUN}@example.com`,
    username: `insend_${label}_${RUN}`,
    password: PASSWORD,
    role: adminRole._id,
    status: 'active',
    emailVerified: true,
  });
  await seedStandardObjects(tenant._id, user._id);
  await ensureUserObject(tenant._id, user._id);
  await seedInsuranceObjects(tenant._id, user._id);
  await seedInsuranceWorkspace(tenant._id, user._id);
  const { pv } = await seedPlan(tenant._id, user._id);
  return { tenant, user, pv };
};

let server;
let tenantIds = [];

const main = async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://localhost:${server.address().port}`;

  const req = async (path, { method = 'GET', cookie, body } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* no body */ }
    return { status: res.status, json };
  };

  const login = async (username) => {
    const res = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: PASSWORD }),
    });
    return (res.headers.get('set-cookie') || '').split(';')[0];
  };

  const issuePolicy = async (cookie, pvId, suffix) => {
    const started = await req('/api/v1/insurance/applications', {
      method: 'POST',
      cookie,
      body: { channel: 'website', product_version_id: String(pvId) },
    });
    const id = started.json?.data?.policy?.id;
    await req(`/api/v1/insurance/applications/${id}/main-member`, {
      method: 'PUT',
      cookie,
      body: { id_number: `END-${suffix}-${RUN}`, age: 30, cover_amount: 100000 },
    });
    await req(`/api/v1/insurance/applications/${id}/premium-payer`, {
      method: 'PUT',
      cookie,
      body: { id_number: `PAY-${suffix}-${RUN}`, name: 'Premium Payer' },
    });
    await req(`/api/v1/insurance/applications/${id}/acceptance`, {
      method: 'POST',
      cookie,
      body: { channel: 'website', accepted_terms_version: '1.0' },
    });
    await req(`/api/v1/insurance/applications/${id}/submit`, { method: 'POST', cookie });
    await req(`/api/v1/insurance/policies/${id}/issue`, { method: 'POST', cookie });
    return id;
  };

  const endorse = (cookie, policyId, body) =>
    req(`/api/v1/insurance/policies/${policyId}/endorsements`, { method: 'POST', cookie, body });

  const act = (cookie, id, action, body) =>
    req(`/api/v1/insurance/endorsements/${id}/${action}`, { method: 'POST', cookie, body });

  try {
    const A = await seedTenant('a');
    const B = await seedTenant('b');
    tenantIds = [A.tenant._id, B.tenant._id];
    const ca = await login(A.user.username);
    const cb = await login(B.user.username);
    check('tenant A admin authenticates', !!ca);
    check('tenant B admin authenticates', !!cb);

    const policyId = await issuePolicy(ca, A.pv._id, 'e1');
    const policyRead = await req(`/api/v1/insurance/policies/${policyId}`, { cookie: ca });
    check('policy issued active at premium 250', policyRead.json?.data?.policy?.current_premium === 250, `${policyRead.json?.data?.policy?.current_premium}`);

    // ── Cover amount change (reprices + writes premium history) ────────────────
    const created = await endorse(ca, policyId, { change_type: 'cover_amount_change', reason: 'client request' });
    const endId = created.json?.data?.endorsement?.id;
    check('endorsement create → 201', created.status === 201, `HTTP ${created.status}`);
    check('endorsement starts draft', created.json?.data?.endorsement?.status === 'draft');
    check('endorsement gets an auto number', !!created.json?.data?.endorsement?.endorsement_number);

    const applyDraft = await act(ca, endId, 'apply', { cover_amount: 200000 });
    check('applying an unapproved endorsement → 409', applyDraft.status === 409, `HTTP ${applyDraft.status}`);

    const submitted = await act(ca, endId, 'submit');
    check('submit → pending_approval', submitted.json?.data?.endorsement?.status === 'pending_approval');
    const approved = await act(ca, endId, 'approve');
    check('approve → approved', approved.json?.data?.endorsement?.status === 'approved');

    const applied = await act(ca, endId, 'apply', { cover_amount: 200000 });
    check('apply → applied', applied.status === 200 && applied.json?.data?.endorsement?.status === 'applied', `HTTP ${applied.status}`);
    check('change recorded as an endorsement item', (applied.json?.data?.items || []).some((i) => i.field_api_name === 'insured_life.cover_amount' && i.new_value === '200000'));

    const afterCover = await req(`/api/v1/insurance/policies/${policyId}`, { cookie: ca });
    check('cover change reprices to 400', afterCover.json?.data?.policy?.current_premium === 400, `${afterCover.json?.data?.policy?.current_premium}`);
    const mainLife = afterCover.json?.data?.insured_lives?.find((l) => l.relation === 'main_member');
    check('main member cover updated on the policy', Number(mainLife?.cover_amount) === 200000, `${mainLife?.cover_amount}`);

    const hist1 = await DynamicRecord.find({ tenantId: A.tenant._id, objectApiName: 'policy_premium_history', 'data.policy': policyId });
    check('a premium history row is written', hist1.length === 1, `${hist1.length}`);
    const h1 = hist1[0]?.data;
    check('history holds previous → new premium', Number(h1?.get('previous_premium')) === 250 && Number(h1?.get('new_premium')) === 400);

    // ── Add insured life (straight-through: requires_approval false) ───────────
    const addLife = await endorse(ca, policyId, { change_type: 'add_insured_life', requires_approval: false });
    const addLifeId = addLife.json?.data?.endorsement?.id;
    const addSubmitted = await act(ca, addLifeId, 'submit');
    check('straight-through submit → approved', addSubmitted.json?.data?.endorsement?.status === 'approved');
    const addApplied = await act(ca, addLifeId, 'apply', { relation: 'spouse', id_number: `SPOUSE-${RUN}`, name: 'Spouse One', age: 28 });
    check('add insured life → applied', addApplied.status === 200 && addApplied.json?.data?.endorsement?.status === 'applied', `HTTP ${addApplied.status}`);

    const afterSpouse = await req(`/api/v1/insurance/policies/${policyId}`, { cookie: ca });
    check('adding a spouse reprices to 500', afterSpouse.json?.data?.policy?.current_premium === 500, `${afterSpouse.json?.data?.policy?.current_premium}`);
    const spouseLife = (afterSpouse.json?.data?.insured_lives || []).find((l) => l.relation === 'spouse');
    check('new spouse life exists on the policy', !!spouseLife);

    // ── End insured life (preserves the record, reprices back) ─────────────────
    const endLife = await endorse(ca, policyId, { change_type: 'end_insured_life' });
    const endLifeId = endLife.json?.data?.endorsement?.id;
    await act(ca, endLifeId, 'submit');
    await act(ca, endLifeId, 'approve');
    const endApplied = await act(ca, endLifeId, 'apply', { insured_life_id: spouseLife.id });
    check('end insured life → applied', endApplied.status === 200, `HTTP ${endApplied.status}`);
    const afterEnd = await req(`/api/v1/insurance/policies/${policyId}`, { cookie: ca });
    check('ending the spouse reprices back to 400', afterEnd.json?.data?.policy?.current_premium === 400, `${afterEnd.json?.data?.policy?.current_premium}`);
    const endedSpouse = (afterEnd.json?.data?.insured_lives || []).find((l) => l.id === spouseLife.id);
    check('ended life is preserved with status ended', endedSpouse?.status === 'ended');

    const hist = await DynamicRecord.find({ tenantId: A.tenant._id, objectApiName: 'policy_premium_history', 'data.policy': policyId }).sort({ createdAt: 1 });
    check('three effective-dated premium rows now exist', hist.length === 3, `${hist.length}`);
    const closed = hist.filter((h) => h.data?.get('effective_to'));
    check('prior premium rows are closed (effective_to set)', closed.length === 2, `closed=${closed.length}`);

    // ── Rejection path ─────────────────────────────────────────────────────────
    const rej = await endorse(ca, policyId, { change_type: 'payment_method_change' });
    const rejId = rej.json?.data?.endorsement?.id;
    await act(ca, rejId, 'submit');
    const rejNoReason = await act(ca, rejId, 'reject');
    check('rejecting without a reason → 400', rejNoReason.status === 400, `HTTP ${rejNoReason.status}`);
    const rejOk = await act(ca, rejId, 'reject', { reason: 'not allowed' });
    check('reject with a reason → rejected', rejOk.json?.data?.endorsement?.status === 'rejected');
    const applyRejected = await act(ca, rejId, 'apply');
    check('a rejected endorsement cannot be applied → 409', applyRejected.status === 409, `HTTP ${applyRejected.status}`);

    // ── Invalid change type ────────────────────────────────────────────────────
    const invalid = await endorse(ca, policyId, { change_type: 'teleport' });
    check('invalid change type → 400', invalid.status === 400, `HTTP ${invalid.status}`);

    // ── Listing ────────────────────────────────────────────────────────────────
    const listed = await req(`/api/v1/insurance/policies/${policyId}/endorsements`, { cookie: ca });
    check('policy lists its endorsements', (listed.json?.data || []).length === 4, `${(listed.json?.data || []).length}`);

    // ── Cancellation endorsement drives the policy lifecycle ───────────────────
    const cancelEnd = await endorse(ca, policyId, { change_type: 'cancellation', reason: 'client request' });
    const cancelEndId = cancelEnd.json?.data?.endorsement?.id;
    await act(ca, cancelEndId, 'submit');
    await act(ca, cancelEndId, 'approve');
    const cancelApplied = await act(ca, cancelEndId, 'apply');
    check('cancellation endorsement → applied', cancelApplied.status === 200, `HTTP ${cancelApplied.status}`);
    const afterCancel = await req(`/api/v1/insurance/policies/${policyId}`, { cookie: ca });
    check('cancellation endorsement cancels the policy', afterCancel.json?.data?.policy?.status === 'cancelled', `${afterCancel.json?.data?.policy?.status}`);

    // ── Isolation: B cannot touch A's endorsement ──────────────────────────────
    const crossRead = await req(`/api/v1/insurance/endorsements/${endId}`, { cookie: cb });
    check("tenant B cannot read tenant A's endorsement (IDOR)", crossRead.status === 404, `HTTP ${crossRead.status}`);
    const crossList = await req(`/api/v1/insurance/policies/${policyId}/endorsements`, { cookie: cb });
    check("tenant B sees no endorsements for tenant A's policy", (crossList.json?.data || []).length === 0 && crossRead.status === 404);
  } catch (err) {
    check('test harness ran without error', false, `${err.message}\n${err.stack}`);
  }
};

await connectDB();
await main();
server?.close();
await Tenant.deleteMany({ slug: { $regex: '^zz-insend-' } });
await Promise.all(
  [User, Role, ObjectMeta, FieldMeta, DynamicRecord, Session, Workspace, AutoNumberCounter].map((M) =>
    M.deleteMany({ tenantId: { $in: tenantIds } }).catch(() => {}),
  ),
);
await mongoose.connection.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
