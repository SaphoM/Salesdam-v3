import express from 'express';
import DashboardFolder from '../models/DashboardFolder.js';
import Dashboard from '../models/Dashboard.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';

const router = express.Router();
router.use(requireAuth, enforceTenant);

// GET /api/dashboard-folders
router.get('/', asyncHandler(async (req, res) => {
  const folders = await DashboardFolder.find({ tenantId: req.tenantId }).sort({ order: 1, name: 1 });
  sendSuccess(res, { data: folders });
}));

// POST /api/dashboard-folders
router.post('/', asyncHandler(async (req, res) => {
  const { name, color, icon } = req.body;
  if (!name) throw new AppError('Folder name is required.', 400);

  const exists = await DashboardFolder.findOne({ tenantId: req.tenantId, name });
  if (exists) throw new AppError(`A folder named "${name}" already exists.`, 409);

  const count = await DashboardFolder.countDocuments({ tenantId: req.tenantId });
  const folder = await DashboardFolder.create({
    tenantId: req.tenantId,
    name, color, icon,
    order: count,
    createdBy: req.user._id,
  });
  sendSuccess(res, { data: folder }, 'Folder created', 201);
}));

// PUT /api/dashboard-folders/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const folder = await DashboardFolder.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!folder) throw new AppError('Folder not found.', 404);

  ['name', 'color', 'icon', 'order'].forEach(k => {
    if (req.body[k] !== undefined) folder[k] = req.body[k];
  });
  await folder.save();
  sendSuccess(res, { data: folder }, 'Folder updated');
}));

// DELETE /api/dashboard-folders/:id
// Moves dashboards in the folder to "no folder" before deleting
router.delete('/:id', asyncHandler(async (req, res) => {
  const folder = await DashboardFolder.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!folder) throw new AppError('Folder not found.', 404);

  await Dashboard.updateMany(
    { tenantId: req.tenantId, folderId: folder._id },
    { folderId: null }
  );
  await DashboardFolder.deleteOne({ _id: folder._id });
  sendSuccess(res, {}, 'Folder deleted');
}));

export default router;
