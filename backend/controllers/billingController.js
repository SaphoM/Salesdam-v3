import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';
import paystackService from '../services/paystackService.js';
import Tenant from '../models/Tenant.js';
import logger from '../utils/logger.js';
import { getPlanCodeMapping } from '../config/planMapping.js';

/**
 * GET /api/billing/public-plans
 * Get list of active plans or free plan if Paystack is disabled
 */
const getPublicPlans = asyncHandler(async (req, res) => {
  // Check if Paystack is enabled
  const paystackEnabled = process.env.ENABLE_PAYSTACK_CHECKOUT !== 'false';

  if (!paystackEnabled) {
    // Return only the free plan
    const freePlan = {
      id: 'free',
      name: 'Free',
      amount: 0,
      interval: 'monthly',
      description: 'Free plan with full features',
      planTier: 'free',
      plan_code: 'free',
      plan_name: 'Free Plan',
    };
    return sendSuccess(res, {
      data: [freePlan],
      paystackEnabled: false,
    });
  }

  try {
    const result = await paystackService.getPlans();

    if (!result.success) {
      throw new AppError('Failed to fetch plans from Paystack', 400);
    }

    // Convert plan amounts from cents to base currency and map plan codes
    const planMapping = getPlanCodeMapping();
    const plansWithConvertedAmounts = result.data.map(plan => ({
      ...plan,
      amount: Math.round(plan.amount / 100),
      planTier: planMapping[plan.plan_code] || 'standard',
    }));

    sendSuccess(res, {
      data: plansWithConvertedAmounts,
      paystackEnabled: true,
    });
  } catch (error) {
    logger.error('Error fetching plans:', error);
    throw new AppError('Unable to fetch pricing plans. Please try again later.', 500);
  }
});

/**
 * GET /api/admin/billing/plans
 * Get all Paystack plans for admin use
 */
const getAdminPlans = asyncHandler(async (req, res) => {
  try {
    const result = await paystackService.getPlans();

    if (!result.success) {
      throw new AppError('Failed to fetch plans from Paystack', 400);
    }

    const planMapping = getPlanCodeMapping();
    const plansWithConvertedAmounts = result.data.map(plan => {
      const tier = planMapping[plan.plan_code] || 'standard';
      return {
        id: tier,
        name: plan.name,
        amount: Math.round(plan.amount / 100),
        interval: plan.interval,
        description: plan.description,
        planCode: plan.plan_code,
      };
    });

    sendSuccess(res, {
      data: plansWithConvertedAmounts,
    });
  } catch (error) {
    logger.error('Error fetching admin plans:', error);
    throw new AppError('Unable to fetch pricing plans. Please try again later.', 500);
  }
});

/**
 * GET /api/admin/billing/payment-details
 * Get current payment method from Paystack
 */
const getPaymentDetails = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);

  if (!tenant.billing.customerId) {
    return sendSuccess(res, { data: null });
  }

  try {
    const result = await paystackService.getCustomer(tenant.billing.customerId);

    if (!result.success) {
      throw new AppError('Failed to fetch payment details from Paystack', 400);
    }

    const customer = result.data;
    const authorizations = customer.authorizations || [];
    const defaultAuth = authorizations.find(a => a.is_default) || authorizations[0];

    const paymentDetails = defaultAuth ? {
      type: 'card',
      cardBrand: defaultAuth.brand,
      cardLast4: defaultAuth.last4,
      cardExp: `${defaultAuth.exp_month}/${defaultAuth.exp_year}`,
    } : null;

    sendSuccess(res, { data: paymentDetails });
  } catch (error) {
    logger.error('Error fetching payment details:', error);
    throw new AppError('Unable to fetch payment details. Please try again later.', 500);
  }
});

/**
 * GET /api/admin/billing/invoices
 * Get transaction history (invoices) from Paystack
 */
const getInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);

  if (!tenant.billing.customerId) {
    return sendSuccess(res, { data: [], pagination: { total: 0, page, limit } });
  }

  try {
    const result = await paystackService.getCustomerTransactions(
      tenant.billing.customerId,
      limit,
      page,
    );

    if (!result.success) {
      throw new AppError('Failed to fetch invoices from Paystack', 400);
    }

    const invoices = result.data.map(tx => ({
      id: `INV-${tx.reference}`,
      reference: tx.reference,
      amount: Math.round(tx.amount / 100),
      date: tx.created_at,
      status: tx.status === 'success' ? 'Paid' : 'Pending',
      authorization: tx.authorization?.brand,
    }));

    sendSuccess(res, {
      data: invoices,
      pagination: { total: result.total, page, limit },
    });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    throw new AppError('Unable to fetch invoices. Please try again later.', 500);
  }
});

/**
 * POST /api/admin/billing/update-payment-url
 * Get Paystack checkout URL to update payment method
 */
const getUpdatePaymentUrl = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);

  if (!tenant.billing.customerId) {
    throw new AppError('No customer record found', 400);
  }

  try {
    // Get the current subscription amount or use a minimal amount
    const amount = tenant.billing.nextBillingDate ? 10000 : 50000; // Minimum amount in cents

    const result = await paystackService.initializePayment(
      tenant.companyProfile?.email || 'noreply@salesdam.com',
      amount / 100, // Convert back to ZAR
      {
        customerId: tenant.billing.customerId,
        tenantId: tenant._id.toString(),
        action: 'update_payment_method',
      },
    );

    if (!result.success) {
      throw new AppError('Failed to generate payment update URL', 400);
    }

    sendSuccess(res, {
      data: {
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        reference: result.data.reference,
      },
    });
  } catch (error) {
    logger.error('Error generating payment update URL:', error);
    throw new AppError('Unable to generate payment update URL. Please try again later.', 500);
  }
});

/**
 * POST /api/billing/verify-transaction
 * Verify Paystack transaction
 */
const verifyTransaction = asyncHandler(async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    throw new AppError('Payment reference is required', 400);
  }

  const result = await paystackService.verifyTransaction(reference);

  if (!result.success) {
    throw new AppError(
      'Payment verification failed',
      400,
    );
  }

  sendSuccess(res, {
    data: result.data,
  });
});

export {
  getPublicPlans,
  verifyTransaction,
  getAdminPlans,
  getPaymentDetails,
  getInvoices,
  getUpdatePaymentUrl,
};
