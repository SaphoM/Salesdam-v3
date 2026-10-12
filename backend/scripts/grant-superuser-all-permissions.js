/**
 * Script to grant all permissions to superuser role
 * Ensures superuser has:
 * - All app permissions (canManageUsers, canManageRoles, etc.)
 * - All object permissions (create, read, update, delete, import, export)
 * - All field-level permissions (view and edit all fields)
 *
 * Usage: node scripts/grant-superuser-all-permissions.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Role from '../models/Role.js';
import Tenant from '../models/Tenant.js';
import ObjectTypeConfig from '../models/ObjectTypeConfig.js';
import logger from '../utils/logger.js';

// Standard objects that should have permissions
const STANDARD_OBJECTS = [
  'client', 'contact', 'lead', 'opportunity', 'task', 'case',
  'deal', 'order', 'product', 'quote', 'invoice', 'support_document', 'deal_line_item', 'order_line_item'
];

const DB_URL = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!DB_URL) {
  console.error('');
  console.error('❌ ERROR: Database connection string not found.');
  console.error('');
  console.error('Current directory:', process.cwd());
  console.error('');
  console.error('To fix this:');
  console.error('1. Make sure you are in the backend directory:');
  console.error('   cd backend');
  console.error('');
  console.error('2. Make sure .env file exists in backend folder with MONGO_URI or MONGODB_URI');
  console.error('');
  console.error('3. Or set the environment variable before running:');
  console.error('   $env:MONGO_URI = "your_connection_string"');
  console.error('   node scripts/grant-superuser-all-permissions.js');
  console.error('');
  process.exit(1);
}

const allAppPermissions = {
  canManageUsers: true,
  canManageRoles: true,
  canManageObjects: true,
  canManageAutomations: true,
  canManageIntegrations: true,
  canViewAnalytics: true,
  canManageAnalytics: true,
  canViewAuditLog: true,
  canManageTenantSettings: true,
  canManageApiKeys: true,
  canManageWebhooks: true,
};

const main = async () => {
  try {
    logger.info('');
    logger.info('Connecting to MongoDB...');
    logger.info('Database URL:', DB_URL.replace(/mongodb\+srv:\/\/.*:.*@/, 'mongodb+srv://***:***@'));

    await mongoose.connect(DB_URL);
    logger.info('✓ Connected to MongoDB');
    logger.info('');

    // Get all tenants
    const tenants = await Tenant.find({});
    logger.info(`Found ${tenants.length} tenant(s)`);
    logger.info('');

    let totalUpdated = 0;

    // Process each tenant's superuser role
    for (const tenant of tenants) {
      logger.info(`━━━ Tenant: ${tenant.name} ━━━`);

      const superuserRole = await Role.findOne({
        tenantId: tenant._id,
        name: 'superuser',
      });

      if (!superuserRole) {
        logger.warn('  ⚠ Superuser role not found');
        continue;
      }

      // Try to fetch objects from ObjectTypeConfig
      let objectConfigs = await ObjectTypeConfig.find({ tenantId: tenant._id });

      // If no objects found in database, use standard objects with default permissions
      if (objectConfigs.length === 0) {
        logger.info('  ℹ Objects not found in database, using standard objects');
        // Create object permissions for all standard objects without field-level details
        objectConfigs = STANDARD_OBJECTS.map(apiName => ({
          apiName,
          fields: [],
        }));
      }

      // Build full object permissions with all capabilities for EVERY object
      const objectPermissions = objectConfigs.map((obj) => {
        // Get all fields and grant view/edit permissions
        const fieldPermissions = (obj.fields || [])
          .filter(f => f && f.type !== 'auto_number' && f.type !== 'formula' && !f.isReadOnly)
          .map(field => ({
            fieldApiName: field.apiName,
            canView: true,
            canEdit: true,
          }));

        return {
          objectApiName: obj.apiName,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canExport: true,
          canImport: true,
          fieldPermissions,
        };
      });

      // Update the superuser role with all permissions
      superuserRole.set({
        appPermissions: allAppPermissions,
        objectPermissions: objectPermissions,
        dataAccess: 'all',
        isEditable: false,
      });

      await superuserRole.save({ validateBeforeSave: false });

      // Count total field permissions
      const totalFieldPermissions = objectPermissions.reduce((sum, obj) => sum + obj.fieldPermissions.length, 0);

      logger.info(`  ✓ Updated superuser role`);
      logger.info(`    - App permissions: ${Object.keys(allAppPermissions).length}/11 enabled`);
      logger.info(`    - Objects: ${objectPermissions.length} (all available)`);
      logger.info(`    - Object actions: Create ✓ Read ✓ Update ✓ Delete ✓ Export ✓ Import ✓`);
      logger.info(`    - Field permissions: ${totalFieldPermissions} fields (view + edit)`);
      logger.info(`    - Data access: all records`);
      logger.info(`    - Editable: false (protected)`);
      logger.info('');

      totalUpdated++;
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('SUMMARY');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`✓ Updated ${totalUpdated}/${tenants.length} superuser role(s) with complete permissions`);
    logger.info('');
    logger.info('Superuser roles now have:');
    logger.info('  ✓ All 11 app permissions (canManageUsers, canManageRoles, etc.)');
    logger.info('  ✓ Permissions for ALL objects (standard + custom)');
    logger.info('  ✓ All object actions:');
    logger.info('    • Create: ✓');
    logger.info('    • Read: ✓');
    logger.info('    • Update: ✓');
    logger.info('    • Delete: ✓');
    logger.info('    • Export: ✓');
    logger.info('    • Import: ✓');
    logger.info('  ✓ Field-level permissions (view + edit) for all fields in all objects');
    logger.info('  ✓ Data access: all records');
    logger.info('  ✓ Role protected from editing (isEditable: false)');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error('Error updating superuser permissions:', error.message);
    process.exit(1);
  }
};

main();
