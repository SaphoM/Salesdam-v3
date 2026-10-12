import User from '../models/User.js';
import Role from '../models/Role.js';
import Tenant from '../models/Tenant.js';
import logger from '../utils/logger.js';

/**
 * Validate that a user has all necessary permissions configured
 * Checks both app permissions and object permissions
 */
const validateUserPermissions = async (userId, tenantId) => {
  try {
    const user = await User.findOne({ _id: userId, tenantId }).populate('role');
    if (!user || !user.role) {
      logger.warn(`User ${userId} has no role assigned`);
      return { valid: false, errors: ['User has no role assigned'] };
    }

    const role = user.role;
    const tenant = await Tenant.findById(tenantId);

    const errors = [];
    const warnings = [];

    // Check app permissions are configured
    const appPermissionKeys = [
      'canManageUsers',
      'canManageRoles',
      'canManageObjects',
      'canManageAutomations',
      'canManageIntegrations',
      'canViewAnalytics',
      'canManageAnalytics',
      'canViewAuditLog',
      'canManageTenantSettings',
      'canManageApiKeys',
      'canManageWebhooks',
    ];

    for (const key of appPermissionKeys) {
      if (role.appPermissions[key] === undefined) {
        warnings.push(`App permission ${key} is not configured for role ${role.name}`);
      }
    }

    // Check object permissions for all allowed objects
    if (tenant && tenant.allowedObjects && tenant.allowedObjects.length > 0) {
      const configuredObjectApiNames = role.objectPermissions?.map(
        (p) => p.objectApiName
      ) || [];

      for (const objectApiName of tenant.allowedObjects) {
        if (!configuredObjectApiNames.includes(objectApiName)) {
          warnings.push(
            `Object permission for "${objectApiName}" is not configured for role ${role.name}`
          );
        }
      }
    }

    // For superuser, verify they have all permissions
    if (role.name.toLowerCase() === 'superuser') {
      const allAppPermissionsGranted = appPermissionKeys.every(
        (key) => role.appPermissions[key] === true
      );
      if (!allAppPermissionsGranted) {
        errors.push('Superuser role must have all app permissions enabled');
      }

      const allObjectPermissionsGranted = role.objectPermissions?.every(
        (p) => p.canCreate && p.canRead && p.canUpdate && p.canDelete
      );
      if (!allObjectPermissionsGranted) {
        errors.push('Superuser role must have full object permissions (CRUD)');
      }
    }

    const valid = errors.length === 0;
    return { valid, errors, warnings };
  } catch (error) {
    logger.error('Error validating user permissions:', error);
    return {
      valid: false,
      errors: ['Error validating permissions: ' + error.message],
    };
  }
};

/**
 * Validate all users in a tenant have proper permissions
 */
const validateTenantUserPermissions = async (tenantId) => {
  try {
    const users = await User.find({ tenantId }).populate('role');
    const results = {
      totalUsers: users.length,
      valid: 0,
      invalid: 0,
      warnings: 0,
      issues: [],
    };

    for (const user of users) {
      const validation = await validateUserPermissions(user._id, tenantId);
      if (validation.valid) {
        results.valid++;
      } else {
        results.invalid++;
        results.issues.push({
          userId: user._id,
          email: user.email,
          errors: validation.errors,
        });
      }
      if (validation.warnings && validation.warnings.length > 0) {
        results.warnings++;
      }
    }

    return results;
  } catch (error) {
    logger.error('Error validating tenant permissions:', error);
    throw error;
  }
};

/**
 * Ensure all permissions are initialized for a user when they are created
 */
const initializeUserPermissions = async (userId, tenantId) => {
  try {
    const user = await User.findOne({ _id: userId, tenantId }).populate('role');
    if (!user || !user.role) {
      throw new Error('User or role not found');
    }

    // Validate the user has the necessary permissions
    const validation = await validateUserPermissions(userId, tenantId);

    if (!validation.valid) {
      logger.warn(
        `User ${user.email} has permission issues: ${validation.errors.join(', ')}`
      );
    }

    if (validation.warnings && validation.warnings.length > 0) {
      logger.warn(`Warnings for user ${user.email}: ${validation.warnings.join(', ')}`);
    }

    return validation;
  } catch (error) {
    logger.error(`Error initializing permissions for user ${userId}:`, error);
    throw error;
  }
};

export {
  validateUserPermissions,
  validateTenantUserPermissions,
  initializeUserPermissions,
};
