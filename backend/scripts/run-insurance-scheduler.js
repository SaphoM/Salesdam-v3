/**
 * Insurance Scheduler Runner (BRD §13.2, §15.2, §16.2).
 *
 * Runs all periodic insurance tasks for all insurance tenants.
 * Designed to be invoked daily via cron:
 *   0 2 * * * cd /path/to/backend && node scripts/run-insurance-scheduler.js >> /var/log/insurance-scheduler.log 2>&1
 *
 * Or via external scheduler (systemd timer, Cloud Scheduler, etc.)
 *
 * The script resolves a system user per tenant (first admin) for audit trail.
 * In production, use a dedicated system service account.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Tenant from '../models/Tenant.js';
import { runInsuranceSchedulerAllTenants } from '../services/insurance/schedulerService.js';

const run = async () => {
  await connectDB();

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

    console.log(`Running insurance scheduler for tenant: ${tenant.name} (${tenant._id})`);
    try {
      const result = await runInsuranceSchedulerAllTenants(String(systemUser._id));
      console.log(`  Result: ${JSON.stringify(result)}`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  await mongoose.connection.close();
  console.log('Insurance scheduler complete.');
};

run().catch((err) => {
  console.error('Insurance scheduler failed:', err);
  process.exit(1);
});