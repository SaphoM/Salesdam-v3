import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import FieldMeta from '../models/FieldMeta.js';
import logger from '../utils/logger.js';
import { SALESDAM_OBJECTS } from '../config/objects/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Backfills declarative field flags from config/objects/ onto existing tenants.
 *
 * Object seeding (seedSalesdamObjects) only ever creates fields that are
 * missing — it never updates fields that already exist. So a workspace seeded
 * before a flag was added to config keeps the old value forever. This script
 * brings those workspaces in line with config.
 *
 * Only flags that config sets to `true` are applied, and only where the stored
 * value differs. Nothing is ever turned off, so this cannot clear a flag a
 * workspace legitimately has set.
 *
 * Flags are read from config, so adding `isRequired: true` (or another flag
 * below) to a standard object's field and re-running this is all that's needed.
 */
const FLAGS = ['isRequired', 'cascadeDelete'];

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();

  // Build [{ objectApiName, fieldApiName, flag }] for every flag config enables.
  const targets = SALESDAM_OBJECTS.flatMap((obj) =>
    (obj.fields || []).flatMap((field) =>
      FLAGS.filter((flag) => field[flag] === true).map((flag) => ({
        objectApiName: obj.apiName,
        fieldApiName: field.apiName,
        flag,
      })),
    ),
  );

  if (targets.length === 0) {
    logger.warn('No config fields enable any of the tracked flags — nothing to do.');
    await mongoose.disconnect();
    return;
  }

  logger.info(
    `${dryRun ? '[DRY RUN] ' : ''}Checking ${targets.length} flag assignment(s) from config.`,
  );

  let totalUpdated = 0;
  for (const { objectApiName, fieldApiName, flag } of targets) {
    // Across all tenants — this is a platform-level metadata correction.
    const filter = {
      objectApiName,
      apiName: fieldApiName,
      [flag]: { $ne: true },
    };

    const pending = await FieldMeta.countDocuments(filter);
    if (pending === 0) {
      logger.info(`  ok   ${objectApiName}.${fieldApiName}.${flag} — already set everywhere.`);
      continue;
    }

    if (dryRun) {
      logger.info(`  todo ${objectApiName}.${fieldApiName}.${flag} — ${pending} field doc(s) would be updated.`);
      totalUpdated += pending;
      continue;
    }

    const res = await FieldMeta.updateMany(filter, { $set: { [flag]: true } });
    totalUpdated += res.modifiedCount;
    logger.info(`  set  ${objectApiName}.${fieldApiName}.${flag} — updated ${res.modifiedCount} field doc(s).`);
  }

  logger.info(
    dryRun
      ? `[DRY RUN] ${totalUpdated} field document(s) would be updated. Re-run without --dry-run to apply.`
      : `Done. ${totalUpdated} field document(s) updated.`,
  );
  await mongoose.disconnect();
};

run().catch(async (err) => {
  logger.error(`Field-flag migration failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
