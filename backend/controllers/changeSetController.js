import ChangeSet from '../models/ChangeSet.js';
import changeSetService from '../services/changeSetService.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';

const createChangeSet = asyncHandler(async (req, res) => {
  const { name, description, components } = req.body || {};
  const changeSet = await changeSetService.build({
    tenantId: req.tenantId,
    name,
    description,
    components,
    user: req.user,
  });
  sendSuccess(res, { data: changeSet }, 'Change set created', 201);
});

const listChangeSets = asyncHandler(async (req, res) => {
  const data = await ChangeSet.find({ tenantId: req.tenantId }).sort({
    createdAt: -1,
  });
  sendSuccess(res, { data });
});

const getChangeSet = asyncHandler(async (req, res) => {
  const changeSet = await ChangeSet.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
  });
  if (!changeSet) throw new AppError('Change set not found.', 404);
  sendSuccess(res, { data: changeSet });
});

const validateChangeSet = asyncHandler(async (req, res) => {
  const changeSet = await ChangeSet.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
  });
  if (!changeSet) throw new AppError('Change set not found.', 404);
  const { targetTenantId } = req.body || {};
  if (!targetTenantId) throw new AppError('targetTenantId is required.', 400);

  const result = await changeSetService.validate({ changeSet, targetTenantId });
  changeSet.validations.push({
    by: req.user._id,
    targetTenantId,
    valid: result.valid,
    missing: result.missing,
  });
  changeSet.status = result.valid ? 'validated' : 'failed';
  await changeSet.save();

  sendSuccess(
    res,
    { data: result },
    result.valid ? 'Dependencies satisfied' : 'Dependencies missing',
  );
});

const deployChangeSet = asyncHandler(async (req, res) => {
  const changeSet = await ChangeSet.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
  });
  if (!changeSet) throw new AppError('Change set not found.', 404);
  const { targetTenantId } = req.body || {};
  if (!targetTenantId) throw new AppError('targetTenantId is required.', 400);

  const result = await changeSetService.deploy({
    changeSet,
    targetTenantId,
    user: req.user,
  });
  sendSuccess(res, { data: result }, 'Change set deployed', 201);
});

const deploymentLog = asyncHandler(async (req, res) => {
  const { targetTenantId } = req.query;
  if (!targetTenantId) {
    throw new AppError('targetTenantId is required.', 400);
  }
  const result = await changeSetService.listDeploymentLog({
    tenantId: targetTenantId,
    limit: req.query.limit,
    skip: req.query.skip,
  });
  sendSuccess(res, {
    data: result.items,
    meta: { total: result.total, limit: result.limit, skip: result.skip },
  });
});

export {
  createChangeSet,
  listChangeSets,
  getChangeSet,
  validateChangeSet,
  deployChangeSet,
  deploymentLog,
};
