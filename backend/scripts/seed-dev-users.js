/**
 * seed-dev-users.js — create local development login accounts.
 * Run: node scripts/seed-dev-users.js
 *
 * Uses the real Mongoose models so passwords are hashed by the User
 * pre-save hook and documents land in the collections the API reads.
 * Idempotent: re-running only creates missing accounts.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { seedDefaultRoles } from '../services/roleService.js';

const ACCOUNTS = [
  { username: 'superadmin', password: 'SuperAdmin123!', roleName: 'superuser', firstName: 'Super', lastName: 'Admin' },
  { username: 'salesuser', password: 'password123', roleName: 'standard_user', firstName: 'Sales', lastName: 'User' },
  { username: 'insuranceuser', password: 'password123', roleName: 'standard_user', firstName: 'Insurance', lastName: 'User' },
];

const run = async () => {
  await connectDB();

  let tenant = await Tenant.findOne({ name: 'Salesdam' });
  if (!tenant) {
    tenant = await Tenant.create({ name: 'Salesdam', slug: 'salesdam', status: 'active', plan: 'enterprise' });
  }
  await seedDefaultRoles(tenant._id);

  for (const account of ACCOUNTS) {
    const existing = await User.findOne({ tenantId: tenant._id, username: account.username });
    if (existing) {
      console.log(`skip  ${account.username} (exists)`);
      continue;
    }
    const role = await Role.findOne({ tenantId: tenant._id, name: account.roleName });
    await User.create({
      tenantId: tenant._id,
      firstName: account.firstName,
      lastName: account.lastName,
      email: `${account.username}@salesdam.com`,
      username: account.username,
      password: account.password,
      role: role?._id,
      status: 'active',
      emailVerified: true,
    });
    console.log(`create ${account.username} (${account.password})`);
  }

  console.log(`\nTenant: ${tenant._id}`);
  console.log('Accounts ready. Log in with the usernames above.');
  await mongoose.connection.close();
};

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
