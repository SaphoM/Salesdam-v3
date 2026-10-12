/**
 * Policy approval before issue (BRD §11.2).
 *
 * If a Product Version has `requires_approval === true`, the policy must receive
 * an explicit approval (underwriting/management sign-off) before it can be
 * issued/activated. The approval record is a `policy_approval` metadata record.
 *
 * shortcut: BRD references a shared "Approval Process Builder" — not present in
 * the repo. This implements a single-decision gate on the policy. Replace with
 * the core builder when it lands.
 */
import { findOne, findMany, createDynamic, updateDynamic } from './dynamicRecords.js';
import { dataOf } from './pricingService.js';
import * as appService from './applicationService.js';
import { AppError, ValidationError } from '../../utils/errors.js';
import { audit } from '../../utils/auditLogger.js';

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const idOf = (rec) => String(rec._id);
const now = () => new Date();

const loadPolicy = async (tenantId, id) => {
  const policy = await findOne(tenantId, 'policy', { _id: id });
  if (!policy) throw new AppError('Policy not found.', 404);
  return policy;
};

const loadApproval = async (tenantId, id) => {
  const approval = await findOne(tenantId, 'policy_approval', { _id: id });
  if (!approval) throw new AppError('Approval not found.', 404);
  return approval;
};

/** Check if the product version requires approval before issue. */
export const requiresApproval = async (tenantId, productVersionId) => {
  const pv = await findOne(tenantId, 'product_version', { _id: productVersionId });
  return pv ? dataOf(pv).requires_approval === true : false;
};

/** Create a pending approval record when an application is submitted. */
export const createApprovalIfRequired = async ({ tenantId, userId, policy, productVersionId }) => {
  if (!(await requiresApproval(tenantId, productVersionId))) return null;

  const approval = await createDynamic({
    tenantId,
    objectApiName: 'policy_approval',
    userId,
    data: {
      policy: idOf(policy),
      status: APPROVAL_STATUS.PENDING,
      requested_by: String(userId),
      reason: 'Policy requires approval before issue per Product Version configuration.',
    },
  });
  await audit({
    tenantId,
    userId,
    action: 'create',
    resource: 'PolicyApproval',
    resourceId: approval._id,
    objectApiName: 'policy_approval',
    details: { policy: idOf(policy) },
  });
  return approval;
};

/** Get the approval state for a policy. */
export const getApprovalState = async ({ tenantId, policyId }) => {
  const approvals = await findMany(tenantId, 'policy_approval', { 'data.policy': String(policyId) });
  return approvals.map((a) => ({ id: String(a._id), ...dataOf(a) }));
};

/** Approve the policy. */
export const approvePolicy = async ({ tenantId, userId, approvalId }) => {
  const approval = await loadApproval(tenantId, approvalId);
  const aData = dataOf(approval);
  if (aData.status !== APPROVAL_STATUS.PENDING) {
    throw new AppError('Only a pending approval can be decided.', 409);
  }
  await updateDynamic(approval, {
    status: APPROVAL_STATUS.APPROVED,
    decision_by: String(userId),
    decision_date: now(),
  }, userId);
  await audit({
    tenantId,
    userId,
    action: 'update',
    resource: 'PolicyApproval',
    resourceId: approval._id,
    objectApiName: 'policy_approval',
    details: { decision: 'approved' },
  });
  return getApprovalState({ tenantId, policyId: aData.policy });
};

/** Reject the policy (requires a reason). */
export const rejectPolicy = async ({ tenantId, userId, approvalId, body = {} }) => {
  if (!body.reason || !String(body.reason).trim()) {
    throw new ValidationError(['A reason is required to reject a policy.'], 400, {
      fieldErrors: { reason: 'Rejection reason is required.' },
    });
  }
  const approval = await loadApproval(tenantId, approvalId);
  const aData = dataOf(approval);
  if (aData.status !== APPROVAL_STATUS.PENDING) {
    throw new AppError('Only a pending approval can be decided.', 409);
  }
  await updateDynamic(approval, {
    status: APPROVAL_STATUS.REJECTED,
    decision_by: String(userId),
    decision_date: now(),
    decision_reason: body.reason,
  }, userId);
  await audit({
    tenantId,
    userId,
    action: 'update',
    resource: 'PolicyApproval',
    resourceId: approval._id,
    objectApiName: 'policy_approval',
    details: { decision: 'rejected', reason: body.reason },
  });
  return getApprovalState({ tenantId, policyId: aData.policy });
};

export default {
  APPROVAL_STATUS,
  requiresApproval,
  createApprovalIfRequired,
  approvePolicy,
  rejectPolicy,
  getApprovalState,
};