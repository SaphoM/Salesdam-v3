import express from 'express';
import {
  createChangeSet,
  listChangeSets,
  getChangeSet,
  validateChangeSet,
  deployChangeSet,
  deploymentLog,
  rollbackDeployment,
  cloneSandbox,
} from '../controllers/changeSetController.js';
import {
  requireAuth,
  requireAdmin,
  requireSuperuser,
} from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Cross-tenant operations (validate/deploy/log/rollback/sandbox) are
// operator-level: they read or write another tenant's metadata, so only
// superusers may use them.
router.get('/deployment-log', requireSuperuser, deploymentLog);
router.post(
  '/deployment-log/:logId/rollback',
  requireSuperuser,
  rollbackDeployment,
);
router.post('/sandbox', requireSuperuser, cloneSandbox);
router.post('/:id/validate', requireSuperuser, validateChangeSet);
router.post('/:id/deploy', requireSuperuser, deployChangeSet);

// Packaging stays within the caller's own tenant (admin).
router.get('/', requireAdmin, listChangeSets);
router.post('/', requireAdmin, createChangeSet);
router.get('/:id', requireAdmin, getChangeSet);

export default router;
