import express from 'express';
import {
  getConsent,
  updateConsent,
  checkConsent,
  listConsents,
} from '../controllers/consentController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Enforcement query — declared before the '/:subjectType/:subjectId' routes.
router.post('/check', checkConsent);
router.get('/', requireAdmin, listConsents);

router.get('/:subjectType/:subjectId', getConsent);
router.put('/:subjectType/:subjectId', updateConsent);

export default router;
