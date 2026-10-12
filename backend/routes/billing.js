import express from 'express';
import {
  getPublicPlans,
  verifyTransaction,
  getAdminPlans,
  getPaymentDetails,
  getInvoices,
  getUpdatePaymentUrl,
} from '../controllers/billingController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

/**
 * GET /api/billing/public-plans
 * Get list of public plans (no auth required)
 */
router.get('/public-plans', getPublicPlans);

/**
 * POST /api/billing/verify-transaction
 * Verify Paystack transaction (can be called by payment callback)
 */
router.post('/verify-transaction', verifyTransaction);

// Admin billing routes
router.use(requireAuth, enforceTenant);

/**
 * GET /api/billing/admin/plans
 * Get all Paystack plans for admin use
 */
router.get('/admin/plans', requireAdmin, getAdminPlans);

/**
 * GET /api/billing/admin/payment-details
 * Get current payment method from Paystack
 */
router.get('/admin/payment-details', requireAdmin, getPaymentDetails);

/**
 * GET /api/billing/admin/invoices
 * Get transaction history from Paystack
 */
router.get('/admin/invoices', requireAdmin, getInvoices);

/**
 * POST /api/billing/admin/update-payment-url
 * Get Paystack checkout URL to update payment method
 */
router.post('/admin/update-payment-url', requireAdmin, getUpdatePaymentUrl);

export default router;
