/**
 * Automatic lapse evaluation runner (BRD §15.2).
 *
 * Run via cron, e.g.:
 *   0 2 * * * cd /path/to/backend && node scripts/run-auto-lapse.js >> /var/log/auto-lapse.log 2>&1
 *
 * Or invoke programmatically:
 *   import { runAutoLapseAllTenants } from '../services/insurance/autoLapseService.js';
 *
 * This script finds the first admin user in each insurance tenant and runs
 * the evaluation. In production, use a dedicated system service account.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Tenant from '../models/Tenant.js';
import { runAutoLapseAllTenants } from '../services/insurance/autoLapseService.js';

const run = async () => {
  await connectDB();

  // Resolve a system user per tenant (first admin) for audit trail
  const tenants = await Tenant.find({ status: 'active', hub: 'insurance' });
  if (!tenants.length) {
    console.log('No insurance tenants found.');
    process.exit(0);
  }

  for (const tenant of tenants) {
    const adminRole = await Role.findOne({ tenantId: tenant._id, name: 'admin' });
    if (!adminRole) {
      console.warn(`Tenant ${tenant.name}: no admin role found, skipping.`);
      continue;
    }
    const systemUser = await User.findOne({ tenantId: tenant._id, role: adminRole._id });
    if (!systemUser) {
      console.warn(`Tenant ${tenant.name}: no admin user found, skipping.`);
      continue;
    }

    console.log(`Running auto-lapse for tenant: ${tenant.name} (${tenant._id})`);
    try {
      const result = await runAutoLapseAllTenants(String(systemUser._id));
      console.log(`  Result: ${JSON.stringify(result)}`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  await mongoose.connection.close();
  console.log('Auto-lapse run complete.');
};

run().catch((err) => {
  console.error('Auto-lapse runner failed:', err);
  process.exit(1);
});