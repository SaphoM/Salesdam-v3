import express from 'express';
import {
  getActionButtons,
  createActionButton,
  updateActionButton,
  deleteActionButton,
  reorderActionButtons,
} from '../controllers/actionButtonController.js';

import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { checkAppPermission } from '../middleware/permissions.js';

const router = express.Router();

/**
 * All routes require auth + tenant
 */
router.use(requireAuth, enforceTenant);

/* =========================
   ACTION BUTTONS
   Base: /api/action-buttons
========================= */

/**
 * GET /api/action-buttons/:objectApiName
 */
router.get(
  '/:objectApiName',
  checkAppPermission('canManageObjects'),
  getActionButtons,
);

/**
 * POST /api/action-buttons/:objectApiName
 */
router.post(
  '/:objectApiName',
  checkAppPermission('canManageObjects'),
  createActionButton,
);

/**
 * PUT /api/action-buttons/:objectApiName/:actionId
 */
router.put(
  '/:objectApiName/:actionId',
  checkAppPermission('canManageObjects'),
  updateActionButton,
);

/**
 * DELETE /api/action-buttons/:objectApiName/:actionId
 */
router.delete(
  '/:objectApiName/:actionId',
  checkAppPermission('canManageObjects'),
  deleteActionButton,
);

/**
 * POST /api/action-buttons/:objectApiName/reorder
 */
router.post(
  '/:objectApiName/reorder',
  checkAppPermission('canManageObjects'),
  reorderActionButtons,
);

export default router;
