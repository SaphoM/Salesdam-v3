/**
 * Debug script to check superuser role permissions
 * Usage: node scripts/debug-superuser-permissions.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Role from '../models/Role.js';
import logger from '../utils/logger.js';

const DB_URL = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!DB_URL) {
  console.error('ERROR: Database connection string not found.');
  process.exit(1);
}

const main = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(DB_URL);
    logger.info('✓ Connected to MongoDB\n');

    // Find all superuser roles
    const superuserRoles = await Role.find({ name: 'superuser' });

    if (superuserRoles.length === 0) {
      logger.warn('No superuser roles found');
      process.exit(0);
    }

    logger.info(`Found ${superuserRoles.length} superuser role(s)\n`);

    for (const role of superuserRoles) {
      logger.info(`━━━ Role: ${role.label} (Tenant: ${role.tenantId}) ━━━`);
      logger.info(`isEditable: ${role.isEditable}`);
      logger.info(`dataAccess: ${role.dataAccess}`);

      logger.info('\nApp Permissions:');
      const appPerms = role.appPermissions || {};
      for (const [key, value] of Object.entries(appPerms)) {
        logger.info(`  ${key}: ${value ? '✓' : '✗'}`);
      }

      logger.info(`\nObject Permissions: ${role.objectPermissions?.length || 0} objects`);
      if (role.objectPermissions && role.objectPermissions.length > 0) {
        for (const objPerm of role.objectPermissions.slice(0, 3)) {
          logger.info(`\n  ${objPerm.objectApiName}:`);
          logger.info(`    canCreate: ${objPerm.canCreate ? '✓' : '✗'}`);
          logger.info(`    canRead: ${objPerm.canRead ? '✓' : '✗'}`);
          logger.info(`    canUpdate: ${objPerm.canUpdate ? '✓' : '✗'}`);
          logger.info(`    canDelete: ${objPerm.canDelete ? '✓' : '✗'}`);
          logger.info(`    canExport: ${objPerm.canExport ? '✓' : '✗'}`);
          logger.info(`    canImport: ${objPerm.canImport ? '✓' : '✗'}`);
          logger.info(`    fieldPermissions: ${objPerm.fieldPermissions?.length || 0} fields`);
          if (objPerm.fieldPermissions && objPerm.fieldPermissions.length > 0) {
            const sample = objPerm.fieldPermissions[0];
            logger.info(`      Sample field: ${sample.fieldApiName} (view: ${sample.canView}, edit: ${sample.canEdit})`);
          }
        }
        if (role.objectPermissions.length > 3) {
          logger.info(`\n  ... and ${role.objectPermissions.length - 3} more objects`);
        }
      } else {
        logger.warn('  No object permissions found!');
      }

      logger.info('\n');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error:', error.message);
    process.exit(1);
  }
};

main();
