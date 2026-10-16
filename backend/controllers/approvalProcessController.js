import ApprovalProcess from '../models/ApprovalProcess.js';
import approvalProcessService from '../services/approvalProcessService.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';

/* ── Process configuration (admin) ──────────────────────────────────────── */

const listProcesses = asyncHandler(async (req, res) => {
  const { objectApiName } = req.query;
  const filter = { tenantId: req.tenantId };
  if (objectApiName) filter.objectApiName = objectApiName;
  const processes = await ApprovalProcess.find(filter).sort({ createdAt: -1 });
  sendSuccess(res, { data: processes });
});

const getProcess = asyncHandler(async (req, res) => {
  const process = await ApprovalProcess.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
  });
  if (!process) throw new AppError('Approval process not found.', 404);
  sendSuccess(res, { data: process });
});

const createProcess = asyncHandler(async (req, res) => {
  const { name, objectApiName, steps } = req.body || {};
  if (!name || !objectApiName) {
    throw new AppError('A name and object are required.', 400);
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new AppError('At least one approval step is required.', 400);
  }
  const process = await ApprovalProcess.create({
    ...req.body,
    tenantId: req.tenantId,
    createdBy: req.user._id,
  });
  sendSuccess(res, { data: process }, 'Approval process created', 201);
});

const updateProcess = asyncHandler(async (req, res) => {
  const process = await ApprovalProcess.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: req.body },
    { new: true, runValidators: true },
  );
  if (!process) throw new AppError('Approval process not found.', 404);
  sendSuccess(res, { data: process }, 'Approval process updated');
});

const deleteProcess = asyncHandler(async (req, res) => {
  const process = await ApprovalProcess.findOneAndDelete({
    _id: req.params.id,
    tenantId: req.tenantId,
  });
  if (!process) throw new AppError('Approval process not found.', 404);
  sendSuccess(res, {}, 'Approval process deleted');
});

/* ── Runtime ────────────────────────────────────────────────────────────── */

const submitForApproval = asyncHandler(async (req, res) => {
  const { objectApiName, recordId, processId } = req.body || {};
  if (!objectApiName || !recordId) {
    throw new AppError('objectApiName and recordId are required.', 400);
  }
  const request = await approvalProcessService.submit({
    tenantId: req.tenantId,
    objectApiName,
    recordId,
    processId,
    user: req.user,
  });
  if (!request) {
    return sendSuccess(res, { data: null }, 'No approval is required for this record.');
  }
  sendSuccess(res, { data: request }, 'Submitted for approval', 201);
});

const approveRequest = asyncHandler(async (req, res) => {
  const request = await approvalProcessService.decide({
    tenantId: req.tenantId,
    requestId: req.params.id,
    user: req.user,
    decision: 'approve',
    comment: req.body?.comment,
  });
  sendSuccess(res, { data: request }, 'Approval recorded');
});

const rejectRequest = asyncHandler(async (req, res) => {
  const request = await approvalProcessService.decide({
    tenantId: req.tenantId,
    requestId: req.params.id,
    user: req.user,
    decision: 'reject',
    comment: req.body?.comment,
  });
  sendSuccess(res, { data: request }, 'Rejection recorded');
});

const recallRequest = asyncHandler(async (req, res) => {
  const request = await approvalProcessService.recall({
    tenantId: req.tenantId,
    requestId: req.params.id,
    user: req.user,
  });
  sendSuccess(res, { data: request }, 'Approval recalled');
});

const getRecordState = asyncHandler(async (req, res) => {
  const { objectApiName, recordId } = req.query;
  if (!objectApiName || !recordId) {
    throw new AppError('objectApiName and recordId are required.', 400);
  }
  const request = await approvalProcessService.getState({
    tenantId: req.tenantId,
    objectApiName,
    recordId,
  });
  sendSuccess(res, { data: request });
});

const listMyPending = asyncHandler(async (req, res) => {
  const requests = await approvalProcessService.listPendingForUser({
    tenantId: req.tenantId,
    user: req.user,
  });
  sendSuccess(res, { data: requests });
});

export {
  listProcesses,
  getProcess,
  createProcess,
  updateProcess,
  deleteProcess,
  submitForApproval,
  approveRequest,
  rejectRequest,
  recallRequest,
  getRecordState,
  listMyPending,
};
