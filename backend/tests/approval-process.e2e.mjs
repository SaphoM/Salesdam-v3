/**
 * approval-process.e2e.mjs — generic approval-process builder (Core BRD §8).
 *
 * Boots the real Express app, seeds a tenant with an admin, a submitter (with
 * a manager), and two approvers, then exercises configurable single-step,
 * multi-step, manager, field, queue, reject, recall and record-lock behaviour.
 *
 * Run: node tests/approval-process.e2e.mjs   (from backend/)
 * Exits non-zero if any check fails.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import app from '../app.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Session from '../models/Session.js';
import ObjectMeta from '../models/ObjectMeta.js';
import DynamicRecord from '../models/DynamicRecord.js';
import Notification from '../models/Notification.js';
import ApprovalProcess from '../models/ApprovalProcess.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import TenantConfiguration from '../models/TenantConfiguration.js';
import configurationService from '../services/configurationService.js';
import { seedDefaultRoles } from '../services/roleService.js';

const RUN = Date.now().toString(36);
const PASSWORD = 'ApprTest123!';
const THRESHOLD_KEY = 'approvals.threshold_amount';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

const req = async (path, { method = 'GET', cookie, body } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

const loginCookie = async (username) => {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  return setCookie.map((c) => c.split(';')[0]).find((c) => c.startsWith('crm.sid=')) || '';
};

let tenantId = null;
let tenantBId = null;

try {
  await connectDB();

  const tenant = await Tenant.create({
    name: `ZZ_APPR_${RUN}`, slug: `zz-appr-${RUN}`, status: 'active', plan: 'enterprise',
  });
  tenantId = tenant._id;
  await seedDefaultRoles(tenant._id);
  const adminRole = await Role.findOne({ tenantId, name: 'admin' });
  const stdRole = await Role.findOne({ tenantId, name: 'standard_user' });

  const mkUser = (label, role, extra = {}) =>
    User.create({
      tenantId, firstName: label, lastName: 'APPR',
      email: `${label}-${RUN}@example.com`, username: `${label}_${RUN}`,
      password: PASSWORD, role: role._id, status: 'active', emailVerified: true,
      ...extra,
    });

  const adminUser = await mkUser('admin', adminRole);
  const manager = await mkUser('manager', stdRole);
  const submitter = await mkUser('submitter', stdRole, { manager: manager._id });
  const approverA = await mkUser('approvera', stdRole);
  const approverB = await mkUser('approverb', stdRole);

  const objectMeta = await ObjectMeta.create({
    tenantId, name: 'Policy', label: 'Policy', pluralLabel: 'Policies',
    apiName: 'policy', nameFieldApiName: 'name', isActive: true, searchable: true,
  });

  const mkRecord = (data, owner = submitter) =>
    DynamicRecord.create({
      tenantId, objectId: objectMeta._id, objectApiName: 'policy',
      data, createdBy: submitter._id, ownerId: owner._id,
    });

  await configurationService.set({
    key: THRESHOLD_KEY, tenantId, value: 1000,
  });

  const cookieAdmin = await loginCookie(adminUser.username);
  const cookieSubmitter = await loginCookie(submitter.username);
  const cookieA = await loginCookie(approverA.username);
  const cookieB = await loginCookie(approverB.username);
  const cookieManager = await loginCookie(manager.username);
  check('all users can log in', Boolean(cookieAdmin && cookieSubmitter && cookieA && cookieB && cookieManager));

  const createProcess = async (body) =>
    req('/api/v1/approval-processes', { method: 'POST', cookie: cookieAdmin, body });

  // ── Single step, entry criteria via TenantConfiguration ─────────────────
  const single = await createProcess({
    name: 'Single Approval', objectApiName: 'policy',
    entryCriteria: {
      logic: 'AND',
      conditions: [{ field: 'amount', operator: 'greater_than', value: THRESHOLD_KEY, valueType: 'tenantConfig' }],
    },
    steps: [{ order: 1, name: 'Review', approverType: 'user', approverUserId: approverA._id }],
    actions: { onApprove: { fieldUpdates: [{ field: 'status', value: 'Approved' }] } },
  });
  check('admin can create an approval process', single.status === 201, `HTTP ${single.status}`);
  const singleId = single.json?.data?._id;

  const recQualify = await mkRecord({ name: 'Q1', amount: 5000, status: 'Draft' });
  const submitOk = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recQualify._id, processId: singleId },
  });
  check('record meeting criteria is submitted', submitOk.status === 201, `HTTP ${submitOk.status}`);
  check(
    'first step routes to the named approver',
    String(submitOk.json?.data?.steps?.[0]?.approverUserId) === String(approverA._id) &&
      submitOk.json?.data?.status === 'pending',
    JSON.stringify(submitOk.json?.data?.steps?.[0]),
  );

  const recLow = await mkRecord({ name: 'Q2', amount: 500 });
  const submitFail = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recLow._id, processId: singleId },
  });
  check('record failing criteria is rejected for an explicit process', submitFail.status === 400, `HTTP ${submitFail.status}`);

  const autoLow = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recLow._id },
  });
  check('auto-submit returns no-approval when nothing matches', autoLow.status === 200 && autoLow.json?.data === null, `HTTP ${autoLow.status}`);

  const dup = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recQualify._id, processId: singleId },
  });
  check('a record already pending cannot be resubmitted', dup.status === 400, `HTTP ${dup.status}`);

  const requestId = submitOk.json?.data?._id;

  const wrongApprover = await req(`/api/v1/approval-processes/${requestId}/approve`, {
    method: 'POST', cookie: cookieB, body: { comment: 'nope' },
  });
  check('a non-approver cannot approve', wrongApprover.status === 403, `HTTP ${wrongApprover.status}`);

  const approved = await req(`/api/v1/approval-processes/${requestId}/approve`, {
    method: 'POST', cookie: cookieA, body: { comment: 'ok' },
  });
  check('the named approver approves the request', approved.status === 200 && approved.json?.data?.status === 'approved', `HTTP ${approved.status} status=${approved.json?.data?.status}`);

  const afterApprove = await DynamicRecord.findById(recQualify._id);
  check('onApprove field update is applied', afterApprove.getField('status') === 'Approved', `status=${afterApprove.getField('status')}`);

  const notifyCount = await Notification.countDocuments({ tenantId, userId: submitter._id, 'data.approvalRequestId': requestId });
  check('submitter is notified on approval', notifyCount >= 1, `count=${notifyCount}`);

  // ── Reject flow ─────────────────────────────────────────────────────────
  const recReject = await mkRecord({ name: 'R1', amount: 9000, status: 'Draft' });
  const rejectSubmit = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recReject._id, processId: singleId },
  });
  const rejectId = rejectSubmit.json?.data?._id;
  const rejected = await req(`/api/v1/approval-processes/${rejectId}/reject`, {
    method: 'POST', cookie: cookieA, body: { comment: 'missing docs' },
  });
  check('approver can reject with a reason', rejected.status === 200 && rejected.json?.data?.status === 'rejected', `HTTP ${rejected.status}`);
  check(
    'rejection reason is recorded in history',
    rejected.json?.data?.history?.some((h) => h.action === 'rejected' && h.comment === 'missing docs'),
    JSON.stringify(rejected.json?.data?.history?.map((h) => h.action)),
  );
  const recRejectAfter = await DynamicRecord.findById(recReject._id);
  check('rejected record keeps its status field (no onApprove update)', recRejectAfter.getField('status') === 'Draft', `status=${recRejectAfter.getField('status')}`);

  // ── Multi-step sequential ───────────────────────────────────────────────
  const multi = await createProcess({
    name: 'Two Step', objectApiName: 'policy',
    steps: [
      { order: 1, name: 'First', approverType: 'user', approverUserId: approverA._id },
      { order: 2, name: 'Second', approverType: 'user', approverUserId: approverB._id },
    ],
  });
  const multiId = multi.json?.data?._id;
  const recMulti = await mkRecord({ name: 'M1', amount: 7000 });
  const multiSubmit = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recMulti._id, processId: multiId },
  });
  const multiReqId = multiSubmit.json?.data?._id;
  check(
    'second step starts waiting',
    multiSubmit.json?.data?.steps?.[0]?.status === 'pending' &&
      multiSubmit.json?.data?.steps?.[1]?.status === 'waiting',
    JSON.stringify(multiSubmit.json?.data?.steps?.map((s) => s.status)),
  );

  const step1 = await req(`/api/v1/approval-processes/${multiReqId}/approve`, {
    method: 'POST', cookie: cookieA, body: {},
  });
  check(
    'approving step one advances to step two without finalising',
    step1.json?.data?.status === 'pending' &&
      step1.json?.data?.currentStep === 1 &&
      step1.json?.data?.steps?.[1]?.status === 'pending' &&
      String(step1.json?.data?.steps?.[1]?.approverUserId) === String(approverB._id),
    `status=${step1.json?.data?.status} step=${step1.json?.data?.currentStep}`,
  );

  const pendingB = await req('/api/v1/approval-processes/pending/mine', { cookie: cookieB });
  check(
    'the next approver sees the request in their pending queue',
    pendingB.status === 200 && pendingB.json?.data?.some((r) => r._id === multiReqId),
    `HTTP ${pendingB.status}`,
  );

  const step2 = await req(`/api/v1/approval-processes/${multiReqId}/approve`, {
    method: 'POST', cookie: cookieB, body: {},
  });
  check('final step approves the whole request', step2.json?.data?.status === 'approved', `status=${step2.json?.data?.status}`);

  // ── Recall + record lock ────────────────────────────────────────────────
  const lockProc = await createProcess({
    name: 'Locked Process', objectApiName: 'policy',
    steps: [{ order: 1, approverType: 'user', approverUserId: approverA._id }],
    actions: { onSubmit: { fieldUpdates: [{ field: 'status', value: 'Pending Review' }], lockRecord: true } },
  });
  const lockProcId = lockProc.json?.data?._id;
  const recLock = await mkRecord({ name: 'L1', amount: 100, status: 'Draft' });
  const lockSubmit = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recLock._id, processId: lockProcId },
  });
  const lockReqId = lockSubmit.json?.data?._id;
  check('onSubmit applies the field update', lockSubmit.json?.data?.locked === true, `locked=${lockSubmit.json?.data?.locked}`);
  const recLockAfter = await DynamicRecord.findById(recLock._id);
  check('onSubmit field value is written to the record', recLockAfter.getField('status') === 'Pending Review', `status=${recLockAfter.getField('status')}`);

  const blocked = await req(`/api/v1/records/policy/${recLock._id}`, {
    method: 'PUT', cookie: cookieAdmin, body: { name: 'Edited' },
  });
  check('a locked record rejects edits with 423', blocked.status === 423, `HTTP ${blocked.status}`);

  const recallWrong = await req(`/api/v1/approval-processes/${lockReqId}/recall`, { method: 'POST', cookie: cookieA, body: {} });
  check('a non-submitter cannot recall', recallWrong.status === 403, `HTTP ${recallWrong.status}`);

  const recalled = await req(`/api/v1/approval-processes/${lockReqId}/recall`, { method: 'POST', cookie: cookieSubmitter, body: {} });
  check('the submitter can recall a pending request', recalled.status === 200 && recalled.json?.data?.status === 'recalled', `HTTP ${recalled.status}`);

  const recRestored = await DynamicRecord.findById(recLock._id);
  check('recall restores the pre-submit field value', recRestored.getField('status') === 'Draft', `status=${recRestored.getField('status')}`);

  const unblocked = await req(`/api/v1/records/policy/${recLock._id}`, {
    method: 'PUT', cookie: cookieAdmin, body: { name: 'Edited' },
  });
  check('recall unlocks the record', unblocked.status === 200, `HTTP ${unblocked.status}`);

  // ── Manager approver ────────────────────────────────────────────────────
  const mgrProc = await createProcess({
    name: 'Manager Process', objectApiName: 'policy',
    steps: [{ order: 1, approverType: 'manager' }],
  });
  const mgrProcId = mgrProc.json?.data?._id;
  const recMgr = await mkRecord({ name: 'MG1', amount: 10 });
  const mgrSubmit = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recMgr._id, processId: mgrProcId },
  });
  check(
    'manager approver resolves to the submitter manager',
    String(mgrSubmit.json?.data?.steps?.[0]?.approverUserId) === String(manager._id),
    `approver=${mgrSubmit.json?.data?.steps?.[0]?.approverUserId}`,
  );

  // ── Field approver ──────────────────────────────────────────────────────
  const fieldProc = await createProcess({
    name: 'Field Process', objectApiName: 'policy',
    steps: [{ order: 1, approverType: 'field', approverFieldApiName: 'approver_id' }],
  });
  const fieldProcId = fieldProc.json?.data?._id;
  const recField = await mkRecord({ name: 'F1', approver_id: approverB._id });
  const fieldSubmit = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recField._id, processId: fieldProcId },
  });
  check(
    'field approver resolves from a record field',
    String(fieldSubmit.json?.data?.steps?.[0]?.approverUserId) === String(approverB._id),
    `approver=${fieldSubmit.json?.data?.steps?.[0]?.approverUserId}`,
  );

  // ── Queue approver ──────────────────────────────────────────────────────
  const queueProc = await createProcess({
    name: 'Queue Process', objectApiName: 'policy',
    steps: [{ order: 1, approverType: 'queue', approverRoleId: stdRole._id }],
  });
  const queueProcId = queueProc.json?.data?._id;
  const recQueue = await mkRecord({ name: 'QU1' });
  const queueSubmit = await req('/api/v1/approval-processes/submit', {
    method: 'POST', cookie: cookieSubmitter,
    body: { objectApiName: 'policy', recordId: recQueue._id, processId: queueProcId },
  });
  const queueReqId = queueSubmit.json?.data?._id;
  check('queue step carries no single approver', !queueSubmit.json?.data?.steps?.[0]?.approverUserId, '');

  const adminNotInQueue = await req(`/api/v1/approval-processes/${queueReqId}/approve`, { method: 'POST', cookie: cookieAdmin, body: {} });
  check('a user outside the queue role cannot approve', adminNotInQueue.status === 403, `HTTP ${adminNotInQueue.status}`);

  const queueApprove = await req(`/api/v1/approval-processes/${queueReqId}/approve`, { method: 'POST', cookie: cookieB, body: {} });
  check('any member of the queue role can approve', queueApprove.status === 200 && queueApprove.json?.data?.status === 'approved', `HTTP ${queueApprove.status}`);

  // ── Tenant isolation ────────────────────────────────────────────────────
  const tenantB = await Tenant.create({
    name: `ZZ_APPR_B_${RUN}`, slug: `zz-appr-b-${RUN}`, status: 'active', plan: 'enterprise',
  });
  tenantBId = tenantB._id;
  await seedDefaultRoles(tenantB._id);
  const roleB = await Role.findOne({ tenantId: tenantB._id, name: 'admin' });
  const userB = await User.create({
    tenantId: tenantB._id, firstName: 'Other', lastName: 'Tenant',
    email: `other-${RUN}@example.com`, username: `other_${RUN}`,
    password: PASSWORD, role: roleB._id, status: 'active', emailVerified: true,
  });
  const cookieOther = await loginCookie(userB.username);
  const listOther = await req('/api/v1/approval-processes', { cookie: cookieOther });
  check('another tenant sees none of this tenant processes', listOther.status === 200 && listOther.json?.data?.length === 0, `count=${listOther.json?.data?.length}`);

  const stateOther = await req(`/api/v1/approval-processes/state?objectApiName=policy&recordId=${recQualify._id}`, { cookie: cookieOther });
  check('another tenant cannot read this record approval state', stateOther.status === 200 && stateOther.json?.data === null, `data=${JSON.stringify(stateOther.json?.data)}`);
} catch (err) {
  check('test harness ran without error', false, err.message);
} finally {
  if (tenantId || tenantBId) {
    const ids = [tenantId, tenantBId].filter(Boolean);
    await Tenant.deleteMany({ _id: { $in: ids } });
    await Promise.all([
      User, Role, Session, ObjectMeta, DynamicRecord, Notification,
      ApprovalProcess, ApprovalRequest,
    ].map((M) => M.deleteMany({ tenantId: { $in: ids } }).catch(() => {})));
    await TenantConfiguration.deleteMany({ tenantId: { $in: ids } });
  }
  server.close();
  await mongoose.connection.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
