/**
 * Billing cycle runner (BRD §13.2).
 *
 * Creates premium Debits for policies whose Next Billing Date has arrived.
 *
 * Run via cron, e.g.:
 *   0 3 * * * cd /path/to/backend && node scripts/run-billing-cycle.js >> /var/log/billing-cycle.log 2>&1
 *
 * Or invoke programmatically:
 *   import { runBillingAllTenants } from '../services/insurance/billingRunService.js';
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Tenant from '../models/Tenant.js';
import { runBillingAllTenants } from '../services/insurance/billingRunService.js';

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

    console.log(`Running billing cycle for tenant: ${tenant.name} (${tenant._id})`);
    try {
      const result = await runBillingAllTenants(String(systemUser._id));
      console.log(`  Result: ${JSON.stringify(result)}`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  await mongoose.connection.close();
  console.log('Billing cycle complete.');
};

run().catch((err) => {
  console.error('Billing cycle runner failed:', err);
  process.exit(1);
});