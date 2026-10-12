import express from 'express';
import File from '../models/File.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { asyncHandler, sendSuccess, AppError, paginate } from '../utils/errors.js';
import { audit } from '../utils/auditLogger.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// List files — optionally filter by related record
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, objectApiName, recordId, pdfTemplateId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const query = { tenantId: req.tenantId, isActive: true };
  if (objectApiName) query['relatedTo.objectApiName'] = objectApiName;
  if (recordId)      query['relatedTo.recordId'] = recordId;
  if (pdfTemplateId) query.pdfTemplateId = pdfTemplateId;

  const [files, total] = await Promise.all([
    File.find(query).select('-data').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    File.countDocuments(query),
  ]);
  sendSuccess(res, paginate(files, total, page, limit));
}));

// Get single file (with data)
router.get('/:id', asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!file) throw new AppError('File not found.', 404);
  sendSuccess(res, { data: file });
}));

// Create / save a file
router.post('/', asyncHandler(async (req, res) => {
  const { name, mimeType, data, url, relatedTo, pdfTemplateId, tags, description } = req.body;
  if (!name)     throw new AppError('name is required.', 400);
  if (!mimeType) throw new AppError('mimeType is required.', 400);

  let sizeBytes = 0;
  if (data) {
    // base64 string — approximate byte size
    sizeBytes = Math.round((data.length * 3) / 4);
  }

  const file = await File.create({
    tenantId: req.tenantId,
    createdBy: req.user._id,
    name, mimeType, data, url, relatedTo, pdfTemplateId, tags, description, sizeBytes,
  });
  await audit({ tenantId: req.tenantId, userId: req.user._id, action: 'create', resource: 'File', resourceId: file._id, req });
  sendSuccess(res, { data: { ...file.toObject(), data: undefined } }, 'File saved', 201);
}));

// Update metadata (not data)
router.put('/:id', asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!file) throw new AppError('File not found.', 404);
  const { name, description, tags, relatedTo } = req.body;
  if (name)        file.name = name;
  if (description) file.description = description;
  if (tags)        file.tags = tags;
  if (relatedTo)   file.relatedTo = relatedTo;
  file.lastModifiedBy = req.user._id;
  await file.save();
  sendSuccess(res, { data: { ...file.toObject(), data: undefined } });
}));

// Soft-delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!file) throw new AppError('File not found.', 404);
  file.isActive = false;
  file.lastModifiedBy = req.user._id;
  await file.save();
  await audit({ tenantId: req.tenantId, userId: req.user._id, action: 'delete', resource: 'File', resourceId: file._id, req });
  sendSuccess(res, {}, 'File deleted');
}));

export default router;
