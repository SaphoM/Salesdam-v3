import express from 'express';
import {
  getEffectiveConfig,
  updateTenantConfig,
  resetTenantConfig,
  getSystemDefaults,
  setSystemDefault,
  resetSystemDefault,
} from '../controllers/configurationController.js';
import {
  requireAuth,
  requireAdmin,
  requireSuperuser,
} from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Platform-wide defaults (operator level) — superuser only.
router.get('/defaults', requireSuperuser, getSystemDefaults);
router.put('/defaults/:key', requireSuperuser, setSystemDefault);
router.delete('/defaults/:key', requireSuperuser, resetSystemDefault);

// Tenant-level view and overrides.
router.get('/', getEffectiveConfig);
router.put('/:key', requireAdmin, updateTenantConfig);
router.delete('/:key', requireAdmin, resetTenantConfig);

export default router;
