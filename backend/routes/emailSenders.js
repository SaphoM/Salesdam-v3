import express from 'express';
import {
  listEmailSenders, myEmailSenders,
  createEmailSender, updateEmailSender,
  deleteEmailSender, testEmailSender,
} from '../controllers/emailSenderController.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Any authenticated user — returns only senders they're allowed to use
router.get('/mine', myEmailSenders);

// Admin-only management
router.get('/',         requireAdmin, listEmailSenders);
router.post('/',        requireAdmin, createEmailSender);
router.put('/:id',      requireAdmin, updateEmailSender);
router.delete('/:id',   requireAdmin, deleteEmailSender);
router.post('/:id/test', requireAdmin, testEmailSender);

export default router;
