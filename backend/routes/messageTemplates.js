import express from 'express';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from '../controllers/messageTemplateController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

router.get('/', listTemplates);
router.get('/:id', getTemplate);
router.post('/:id/preview', previewTemplate);

// Tenant-level template management is an administrative action (§16.5).
router.post('/', requireAdmin, createTemplate);
router.put('/:id', requireAdmin, updateTemplate);
router.delete('/:id', requireAdmin, deleteTemplate);

export default router;
