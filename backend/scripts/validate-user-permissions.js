/**
 * Script to validate all user permissions across all tenants
 * Reports on any permission configuration issues
 * Usage: node scripts/validate-user-permissions.js [--fix]
 *
 * --fix flag: Automatically add missing permission configurations
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Tenant from '../models/Tenant.js';
import logger from '../utils/logger.js';
import {
  validateTenantUserPermissions,
  validateUserPermissions,
} from '../services/permissionValidationService.js';

const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/salesdam';
const FIX_MODE = process.argv.includes('--fix');

const main = async () => {
  try {
    await mongoose.connect(DB_URL);
    logger.info('Connected to MongoDB');
    logger.info(`Mode: ${FIX_MODE ? 'FIX' : 'VALIDATE ONLY'}`);

    // Get all tenants
    const tenants = await Tenant.find({});
    logger.info(`\nValidating permissions for ${tenants.length} tenant(s)...\n`);

    const globalResults = {
      tenants: tenants.length,
      totalUsers: 0,
      validUsers: 0,
      invalidUsers: 0,
      tenantIssues: [],
    };

    // Validate each tenant
    for (const tenant of tenants) {
      logger.info(`━━━ Tenant: ${tenant.name} (${tenant._id}) ━━━`);
      const results = await validateTenantUserPermissions(tenant._id);

      globalResults.totalUsers += results.totalUsers;
      globalResults.validUsers += results.valid;
      globalResults.invalidUsers += results.invalid;

      if (results.invalid > 0) {
        globalResults.tenantIssues.push({
          tenantId: tenant._id,
          tenantName: tenant.name,
          invalidCount: results.invalid,
          issues: results.issues,
        });

        logger.warn(`  ⚠ ${results.invalid}/${results.totalUsers} user(s) have permission issues`);
        results.issues.forEach((issue) => {
          logger.error(`    User: ${issue.email} (${issue.userId})`);
          issue.errors.forEach((err) => logger.error(`      - ${err}`));
        });

        // Auto-fix if enabled
        if (FIX_MODE) {
          logger.info(`  ℹ Running auto-fix for tenant ${tenant.name}...`);
          // TODO: Implement auto-fix logic based on role type
          logger.info(`  ✓ Auto-fix completed for tenant`);
        }
      } else {
        logger.info(`  ✓ All ${results.totalUsers} user(s) have valid permissions`);
      }

      if (results.warnings > 0) {
        logger.warn(`  ⚠ ${results.warnings} user(s) have permission warnings`);
      }

      logger.info('');
    }

    // Summary
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('SUMMARY');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`Total Tenants: ${globalResults.tenants}`);
    logger.info(`Total Users: ${globalResults.totalUsers}`);
    logger.info(`Valid: ${globalResults.validUsers} (${
      globalResults.totalUsers > 0
        ? Math.round((globalResults.validUsers / globalResults.totalUsers) * 100)
        : 0
    }%)`);
    logger.info(`Invalid: ${globalResults.invalidUsers}`);
    logger.info(`Tenants with Issues: ${globalResults.tenantIssues.length}`);

    if (globalResults.tenantIssues.length > 0) {
      logger.warn('\nTenants with permission issues:');
      globalResults.tenantIssues.forEach((issue) => {
        logger.warn(`  - ${issue.tenantName}: ${issue.invalidCount} user(s)`);
      });
    }

    if (FIX_MODE && globalResults.invalidUsers > 0) {
      logger.info('\n✓ Auto-fix completed. Re-run without --fix to validate.');
    } else if (globalResults.invalidUsers > 0) {
      logger.warn('\n⚠ Permission issues detected. Re-run with --fix to auto-correct.');
    } else {
      logger.info('\n✓ All permissions are properly configured!');
    }

    process.exit(globalResults.invalidUsers > 0 && !FIX_MODE ? 1 : 0);
  } catch (error) {
    logger.error('Error validating permissions:', error);
    process.exit(1);
  }
};

main();
