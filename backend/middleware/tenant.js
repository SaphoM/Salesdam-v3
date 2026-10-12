import Tenant from '../models/Tenant.js';
import { AppError } from '../utils/errors.js';

/**
 * enforceTenant - Loads the active tenant and verifies it's accessible by the user.
 * Must run AFTER requireAuth.
 * Attaches req.tenant to the request.
 */
const enforceTenant = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      throw new AppError('Tenant context is required.', 400);
    }

    const tenant = await Tenant.findById(req.tenantId);

    if (!tenant) {
      throw new AppError('Tenant not found.', 404);
    }

    if (tenant.status === 'deleted') {
      throw new AppError('This workspace has been deleted.', 410);
    }

    if (tenant.status === 'suspended') {
      // Superuser can still access suspended tenants for admin actions
      if (!req.user || !req.user.role || req.user.role.name !== 'superuser') {
        throw new AppError(
          'This workspace has been suspended. Please contact support.',
          403,
        );
      }
    }

    // Verify user belongs to this tenant (users only belong to one tenant)
    if (req.user && req.user.role && req.user.role.name !== 'superuser') {
      const belongsToTenant = req.user.tenantId.toString() === req.tenantId;

      if (!belongsToTenant) {
        throw new AppError('You do not have access to this workspace.', 403);
      }
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * injectTenantId - Middleware that auto-injects tenantId into req.body and query.
 * Use AFTER enforceTenant to ensure every operation is scoped to the tenant.
 */
const injectTenantId = (req, res, next) => {
  if (req.tenantId) {
    if (req.body && typeof req.body === 'object') {
      req.body.tenantId = req.tenantId;
    }
  }
  next();
};

export { enforceTenant, injectTenantId };
