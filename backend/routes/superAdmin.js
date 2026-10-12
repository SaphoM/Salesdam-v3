import express from 'express';
import {
  getGlobalStats,
  listAllTenants,
  getTenantDetail,
  createTenant,
  updateTenant,
  suspendTenant,
  activateTenant,
  deleteTenant,
  getTenantUsers,
  updateUserStatus,
  listAllUsers,
  getAuditLogs,
} from '../controllers/superAdminController.js';
import { requireAuth, requireSuperuser } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant, requireSuperuser);

router.get('/stats', getGlobalStats);
router.get('/audit-logs', getAuditLogs);

router.get('/tenants', listAllTenants);
router.post('/tenants', createTenant);
router.get('/tenants/:id', getTenantDetail);
router.put('/tenants/:id', updateTenant);
router.patch('/tenants/:id/suspend', suspendTenant);
router.patch('/tenants/:id/activate', activateTenant);
router.delete('/tenants/:id', deleteTenant);
router.get('/tenants/:id/users', getTenantUsers);
router.patch('/tenants/:id/users/:userId/status', updateUserStatus);

router.get('/users', listAllUsers);

export default router;
