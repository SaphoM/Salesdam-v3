import express from 'express';
import Layout from '../models/Layout.js';
import ObjectMeta from '../models/ObjectMeta.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { checkAppPermission } from '../middleware/permissions.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// The user model has a single populated `role`; normalise it to an id list.
function roleIdsOf(user) {
  const role = user.role;
  if (!role) return [];
  return [role._id || role];
}

// Get layouts for an object — always fresh, never cached
router.get('/:objectApiName', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { objectApiName } = req.params;
  const layouts = await Layout.find({ tenantId: req.tenantId, objectApiName })
    .populate('assignedRoles', 'name label')
    .sort({ isDefault: -1, name: 1 });
  sendSuccess(res, { data: layouts });
}));

// Get the applicable layout for current user
router.get('/:objectApiName/resolve', asyncHandler(async (req, res) => {
  const { objectApiName } = req.params;
  const userRoleIds = roleIdsOf(req.user);

  // Try to find a role-specific layout first
  let layout = await Layout.findOne({
    tenantId: req.tenantId,
    objectApiName,
    assignedRoles: { $in: userRoleIds },
    type: req.query.type || 'detail',
  });

  // Fall back to default layout
  if (!layout) {
    layout = await Layout.findOne({
      tenantId: req.tenantId,
      objectApiName,
      isDefault: true,
      type: req.query.type || 'detail',
    });
  }

  sendSuccess(res, { data: layout });
}));

// Create layout
router.post('/', checkAppPermission('canManageObjects'), asyncHandler(async (req, res) => {
  const { objectApiName } = req.body;
  const obj = await ObjectMeta.findOne({ tenantId: req.tenantId, apiName: objectApiName });
  if (!obj) throw new AppError(`Object "${objectApiName}" not found.`, 404);

  // If this is the first layout or marked default, unset others
  if (req.body.isDefault) {
    await Layout.updateMany(
      { tenantId: req.tenantId, objectApiName, type: req.body.type || 'detail' },
      { isDefault: false }
    );
  }

  const layout = await Layout.create({
    tenantId: req.tenantId,
    objectId: obj._id,
    createdBy: req.user._id,
    ...req.body,
  });

  sendSuccess(res, { data: layout }, 'Layout created', 201);
}));

// Update layout
router.put('/:id', checkAppPermission('canManageObjects'), asyncHandler(async (req, res) => {
  const layout = await Layout.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!layout) throw new AppError('Layout not found.', 404);

  if (req.body.isDefault && !layout.isDefault) {
    await Layout.updateMany(
      { tenantId: req.tenantId, objectApiName: layout.objectApiName, type: layout.type },
      { isDefault: false }
    );
  }

  const allowed = ['name', 'description', 'isDefault', 'assignedRoles', 'tabs', 'sections', 'useTabs', 'buttons', 'relatedLists'];
  allowed.forEach(k => { if (req.body[k] !== undefined) layout[k] = req.body[k]; });
  layout.lastModifiedBy = req.user._id;
  await layout.save();

  sendSuccess(res, { data: layout }, 'Layout updated');
}));

// Delete layout
router.delete('/:id', checkAppPermission('canManageObjects'), asyncHandler(async (req, res) => {
  const layout = await Layout.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!layout) throw new AppError('Layout not found.', 404);
  if (layout.isDefault) throw new AppError('Cannot delete the default layout.', 403);
  await Layout.deleteOne({ _id: layout._id });
  sendSuccess(res, {}, 'Layout deleted');
}));

export default router;
