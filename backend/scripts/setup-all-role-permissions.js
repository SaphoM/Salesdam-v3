/**
 * Script to setup permissions for all roles (superuser, admin, standard_user, read_only)
 *
 * Permissions:
 * - Superuser: Full access to all objects (CRUD + import/export)
 * - Admin: Full access to all objects (CRUD + import/export)
 * - Standard User: Full access to all objects (CRUD + import/export)
 * - Read Only: Read-only access to all objects
 *
 * Usage: node scripts/setup-all-role-permissions.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Role from '../models/Role.js';
import Tenant from '../models/Tenant.js';
import logger from '../utils/logger.js';

const DB_URL = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!DB_URL) {
  console.error('ERROR: Database connection string not found.');
  process.exit(1);
}

const ALL_OBJECTS = [
  'client', 'contact', 'lead', 'opportunity', 'task', 'case',
  'deal', 'order', 'product', 'quote', 'invoice', 'support_document',
  'deal_line_item', 'order_line_item',
];

const main = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(DB_URL);
    logger.info('✓ Connected to MongoDB\n');

    const tenants = await Tenant.find({});
    logger.info(`Found ${tenants.length} tenant(s)\n`);

    let totalUpdated = 0;

    for (const tenant of tenants) {
      logger.info(`━━━ Tenant: ${tenant.name} ━━━`);

      // Superuser - Full access (protected)
      const superuserRole = await Role.findOne({
        tenantId: tenant._id,
        name: 'superuser',
      });

      if (superuserRole) {
        superuserRole.objectPermissions = ALL_OBJECTS.map((obj) => ({
          objectApiName: obj,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canExport: true,
          canImport: true,
          fieldPermissions: [],
        }));
        superuserRole.isEditable = false;
        await superuserRole.save();
        logger.info('  ✓ Superuser: Full access (all objects, CRUD + import/export)');
      }

      // Admin - Full access
      const adminRole = await Role.findOne({
        tenantId: tenant._id,
        name: 'admin',
      });

      if (adminRole) {
        adminRole.objectPermissions = ALL_OBJECTS.map((obj) => ({
          objectApiName: obj,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canExport: true,
          canImport: true,
          fieldPermissions: [],
        }));
        await adminRole.save();
        logger.info('  ✓ Admin: Full access (all objects, CRUD + import/export)');
      }

      // Standard User - Full access
      const standardRole = await Role.findOne({
        tenantId: tenant._id,
        name: 'standard_user',
      });

      if (standardRole) {
        standardRole.objectPermissions = ALL_OBJECTS.map((obj) => ({
          objectApiName: obj,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canExport: true,
          canImport: true,
          fieldPermissions: [],
        }));
        await standardRole.save();
        logger.info('  ✓ Standard User: Full access (all objects, CRUD + import/export)');
      }

      // Read Only - Read-only access
      const readOnlyRole = await Role.findOne({
        tenantId: tenant._id,
        name: 'read_only',
      });

      if (readOnlyRole) {
        readOnlyRole.objectPermissions = ALL_OBJECTS.map((obj) => ({
          objectApiName: obj,
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
          canExport: false,
          canImport: false,
          fieldPermissions: [],
        }));
        await readOnlyRole.save();
        logger.info('  ✓ Read Only: Read-only access (all objects, read permission only)');
      }

      logger.info('');
      totalUpdated++;
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('SUMMARY');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`✓ Updated ${totalUpdated}/${tenants.length} tenant(s) with role permissions\n`);
    logger.info('Role Permissions:');
    logger.info('  ✓ Superuser: Create ✓ Read ✓ Update ✓ Delete ✓ Export ✓ Import ✓ (Protected)');
    logger.info('  ✓ Admin: Create ✓ Read ✓ Update ✓ Delete ✓ Export ✓ Import ✓');
    logger.info('  ✓ Standard User: Create ✓ Read ✓ Update ✓ Delete ✓ Export ✓ Import ✓');
    logger.info('  ✓ Read Only: Read ✓ (View-only access)\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error:', error.message);
    process.exit(1);
  }
};

main();
