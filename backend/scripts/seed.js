require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Role = require('../models/Role');
const { seedDefaultRoles } = require('../services/roleService');
const { seedStandardObjects } = require('../services/metadataService');
const { seedSalesdamLayouts } = require('../services/layoutService');
const logger = require('../utils/logger');

const seed = async () => {
  await connectDB();
  logger.info('Starting database seed...');

  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';
  const name = process.env.SUPER_ADMIN_NAME || 'System Admin';

  // Check if already seeded
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.info('Database already seeded. Skipping.');
    process.exit(0);
  }

  // Create default tenant
  const tenant = await Tenant.create({
    name: 'My Company',
    slug: 'my-company',
    status: 'active',
    plan: 'enterprise',
    limits: {
      maxUsers: 100,
      maxRecords: 1000000,
      maxObjects: 100,
      maxAutomations: 100,
    },
  });

  logger.info(`Created tenant: ${tenant.slug}`);

  // Seed roles
  await seedDefaultRoles(tenant._id);
  logger.info('Seeded default roles');

  const superuserRole = await Role.findOne({
    tenantId: tenant._id,
    name: 'superuser',
  });

  // Create super admin user
  const [firstName, ...lastParts] = name.split(' ');
  const lastName = lastParts.join(' ') || 'Admin';

  const user = await User.create({
    tenantId: tenant._id,
    activeTenantId: tenant._id,
    firstName,
    lastName,
    email,
    password,
    roles: superuserRole ? [superuserRole._id] : [],
    status: 'active',
    emailVerified: true,
    tenants: [
      { tenantId: tenant._id, roles: superuserRole ? [superuserRole._id] : [] },
    ],
  });

  // Update tenant
  tenant.createdBy = user._id;
  tenant.usage.users = 1;
  await tenant.save();

  // Seed standard objects
  await seedStandardObjects(tenant._id, user._id);
  logger.info('Seeded standard CRM objects');

  // Seed Salesdam layouts
  await seedSalesdamLayouts(tenant._id, user._id);
  logger.info('Seeded Salesdam default layouts');

  logger.info(`\n✅ Seed complete!\n`);
  logger.info(`   Email:    ${email}`);
  logger.info(`   Password: ${password}`);
  logger.info(`   Tenant:   ${tenant.slug}\n`);

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
