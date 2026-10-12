import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';
import { audit } from '../utils/auditLogger.js';
import logger from '../utils/logger.js';

/**
 * GET /api/subscription/current
 * Get current subscription details
 */
const getCurrentSubscription = asyncHandler(async (req, res) => {
  const { tenantId } = req;

  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  sendSuccess(res, {
    data: {
      plan: tenant.plan,
      status: tenant.status,
      debitOrderDay: tenant.debitOrderDay,
      registrationSource: tenant.registrationSource,
      billing: {
        paystackReference: tenant.billing?.paystackReference,
        lastPaymentDate: tenant.billing?.lastPaymentDate,
        planActivatedDate: tenant.billing?.planActivatedDate,
        nextBillingDate: tenant.billing?.nextBillingDate,
      },
      usage: tenant.usage,
      limits: tenant.limits,
    },
  });
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription and deactivate tenant
 */
const cancelSubscription = asyncHandler(async (req, res) => {
  const { tenantId, userId } = req;
  const { reason = '' } = req.body;

  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  if (tenant.status === 'deleted') {
    throw new AppError('Subscription already cancelled', 400);
  }

  // Deactivate tenant
  tenant.status = 'deleted';
  tenant.deletedAt = new Date();
  await tenant.save();

  // Deactivate all users in this tenant
  await User.updateMany(
    { tenantId },
    {
      status: 'inactive',
      lastActivity: new Date(),
    },
  );

  await audit({
    tenantId,
    userId,
    userEmail: req.user?.email,
    action: 'subscription_cancelled',
    resource: 'Subscription',
    resourceId: tenantId,
    req,
    metadata: { reason, cancellationDate: new Date() },
  });

  logger.info(`Subscription cancelled for tenant: ${tenantId}`);

  sendSuccess(
    res,
    {
      data: {
        status: 'cancelled',
        message: 'Your subscription has been cancelled',
      },
    },
    'Subscription cancelled successfully',
  );
});

/**
 * POST /api/subscription/reactivate
 * Reactivate cancelled subscription (within 30 days)
 */
const reactivateSubscription = asyncHandler(async (req, res) => {
  const { tenantId, userId } = req;

  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  if (tenant.status !== 'deleted') {
    throw new AppError('Subscription is still active', 400);
  }

  // Check if cancellation was within 30 days
  const daysSinceCancellation = Math.floor(
    (Date.now() - new Date(tenant.deletedAt)) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceCancellation > 30) {
    throw new AppError(
      'Reactivation window (30 days) has expired. Please register a new subscription.',
      400,
    );
  }

  // Reactivate tenant
  tenant.status = 'active';
  tenant.deletedAt = null;
  await tenant.save();

  // Reactivate the requesting user
  const user = await User.findById(userId);
  if (user) {
    user.status = 'active';
    await user.save();
  }

  await audit({
    tenantId,
    userId,
    userEmail: req.user?.email,
    action: 'subscription_reactivated',
    resource: 'Subscription',
    resourceId: tenantId,
    req,
  });

  logger.info(`Subscription reactivated for tenant: ${tenantId}`);

  sendSuccess(
    res,
    {
      data: {
        status: 'active',
        message: 'Your subscription has been reactivated',
      },
    },
    'Subscription reactivated successfully',
  );
});

/**
 * GET /api/subscription/cancellation-info
 * Get information about subscription cancellation
 */
const getCancellationInfo = asyncHandler(async (req, res) => {
  const { tenantId } = req;

  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  const isCancelled = tenant.status === 'deleted';
  let daysSinceCancellation = null;
  let canReactivate = false;

  if (isCancelled) {
    daysSinceCancellation = Math.floor(
      (Date.now() - new Date(tenant.deletedAt)) / (1000 * 60 * 60 * 24),
    );
    canReactivate = daysSinceCancellation <= 30;
  }

  sendSuccess(res, {
    data: {
      status: tenant.status,
      isCancelled,
      deletedAt: tenant.deletedAt,
      daysSinceCancellation,
      canReactivate,
      reactivationDeadline: isCancelled
        ? new Date(
            new Date(tenant.deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000,
          )
        : null,
      plan: tenant.plan,
      registrationSource: tenant.registrationSource,
    },
  });
});

export {
  getCurrentSubscription,
  cancelSubscription,
  reactivateSubscription,
  getCancellationInfo,
};
