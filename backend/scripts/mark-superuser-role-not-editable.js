/**
 * Script to mark all existing superuser roles as non-editable
 * Usage: node scripts/mark-superuser-role-not-editable.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Role from '../models/Role.js';
import logger from '../utils/logger.js';

// Try multiple common environment variable names
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
  console.error('   node scripts/mark-superuser-role-not-editable.js');
  console.error('');
  process.exit(1);
}

const main = async () => {
  try {
    // Connect to database
    logger.info(`Connecting to MongoDB at: ${DB_URL.replace(/mongodb\+srv:\/\/.*:.*@/, 'mongodb+srv://***:***@')}`);
    await mongoose.connect(DB_URL);
    logger.info('✓ Connected to MongoDB');

    // Find all superuser roles across all tenants
    const superuserRoles = await Role.find({ name: 'superuser' });

    if (superuserRoles.length === 0) {
      logger.info('No superuser roles found to update.');
      process.exit(0);
    }

    logger.info(`Found ${superuserRoles.length} superuser role(s) to update.`);

    // Update all superuser roles to be non-editable
    const result = await Role.updateMany(
      { name: 'superuser' },
      { $set: { isEditable: false } }
    );

    logger.info(`✓ Updated ${result.modifiedCount} superuser role(s)`);
    logger.info('✓ All superuser roles are now marked as non-editable');

    // List the updated roles
    const updatedRoles = await Role.find({ name: 'superuser' });
    updatedRoles.forEach((role) => {
      logger.info(`  - Tenant ${role.tenantId}: ${role.label} (editable: ${role.isEditable})`);
    });

    process.exit(0);
  } catch (error) {
    logger.error('Error updating superuser roles:', error);
    process.exit(1);
  }
};

main();
