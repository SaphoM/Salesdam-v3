import express from 'express';
import FieldMeta from '../models/FieldMeta.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { asyncHandler, sendSuccess } from '../utils/errors.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Get all fields for a tenant (useful for cross-object lookup)
router.get('/', asyncHandler(async (req, res) => {
  const { objectApiName, type } = req.query;
  const query = { tenantId: req.tenantId };
  if (objectApiName) query.objectApiName = objectApiName;
  if (type) query.type = type;
  const fields = await FieldMeta.find(query).sort({ objectApiName: 1, displayOrder: 1 });
  sendSuccess(res, { data: fields });
}));

export default router;
