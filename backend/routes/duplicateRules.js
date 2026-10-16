import express from 'express';
import {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  checkDuplicates,
} from '../controllers/duplicateRuleController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Dry-run check (any authenticated user) — declared before '/:id'.
router.post('/check', checkDuplicates);

router.get('/', requireAdmin, listRules);
router.post('/', requireAdmin, createRule);
router.get('/:id', requireAdmin, getRule);
router.put('/:id', requireAdmin, updateRule);
router.delete('/:id', requireAdmin, deleteRule);

export default router;
