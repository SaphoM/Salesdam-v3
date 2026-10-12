import express from 'express';
import {
  getCurrentSubscription,
  cancelSubscription,
  reactivateSubscription,
  getCancellationInfo,
} from '../controllers/subscriptionController.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

// All subscription endpoints require authentication
router.use(requireAuth, enforceTenant);

/**
 * GET /api/subscription/current
 * Get current subscription details
 */
router.get('/current', getCurrentSubscription);

/**
 * GET /api/subscription/cancellation-info
 * Get cancellation information
 */
router.get('/cancellation-info', getCancellationInfo);

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post('/cancel', cancelSubscription);

/**
 * POST /api/subscription/reactivate
 * Reactivate cancelled subscription
 */
router.post('/reactivate', reactivateSubscription);

export default router;
