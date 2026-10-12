/**
 * Migration script to set default revenue and sales targets for all tenants
 * Each quarter defaults to 100000 (annual total = 400000)
 * Usage: node scripts/set-default-targets.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
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

    const tenants = await Tenant.find({});
    logger.info(`Found ${tenants.length} tenant(s)\n`);

    let updated = 0;

    for (const tenant of tenants) {
      const rt = tenant.revenueTargets || {};
      const st = tenant.salesTargets || {};

      // Check if already has non-zero targets
      const hasRevenueTargets =
        rt.q1 || rt.q2 || rt.q3 || rt.q4;
      const hasSalesTargets =
        st.q1 || st.q2 || st.q3 || st.q4;

      if (!hasRevenueTargets || !hasSalesTargets) {
        await Tenant.findByIdAndUpdate(tenant._id, {
          'revenueTargets.q1': rt.q1 || 100000,
          'revenueTargets.q2': rt.q2 || 100000,
          'revenueTargets.q3': rt.q3 || 100000,
          'revenueTargets.q4': rt.q4 || 100000,
          'salesTargets.q1': st.q1 || 100000,
          'salesTargets.q2': st.q2 || 100000,
          'salesTargets.q3': st.q3 || 100000,
          'salesTargets.q4': st.q4 || 100000,
        });
        logger.info(`✓ ${tenant.name}: Set targets to 100000 per quarter`);
        updated++;
      } else {
        logger.info(`  ${tenant.name}: Already has targets configured`);
      }
    }

    logger.info('\n' + '━'.repeat(50));
    logger.info('SUMMARY');
    logger.info('━'.repeat(50));
    logger.info(`✓ Updated ${updated}/${tenants.length} tenant(s)`);
    logger.info('✓ Revenue targets: Q1=100000, Q2=100000, Q3=100000, Q4=100000');
    logger.info('✓ Sales targets: Q1=100000, Q2=100000, Q3=100000, Q4=100000\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error:', error.message);
    process.exit(1);
  }
};

main();
