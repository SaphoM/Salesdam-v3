import express from 'express';
import Tenant from '../models/Tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';
import { audit } from '../utils/auditLogger.js';

const router = express.Router();

router.use(requireAuth);

// Get current tenant info
router.get('/current', enforceTenant, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: req.tenant });
}));

// Update tenant settings (admin only)
router.put('/current/settings', enforceTenant, requireAdmin, asyncHandler(async (req, res) => {
  const allowed = ['settings', 'name', 'logo'];
  const tenant = req.tenant;
  allowed.forEach(key => {
    if (req.body[key] !== undefined) {
      if (key === 'settings') Object.assign(tenant.settings, req.body.settings);
      else tenant[key] = req.body[key];
    }
  });
  await tenant.save();
  await audit({ tenantId: req.tenantId, userId: req.user._id, action: 'settings_change', resource: 'Tenant', req });
  sendSuccess(res, { data: tenant }, 'Settings updated');
}));

export default router;
