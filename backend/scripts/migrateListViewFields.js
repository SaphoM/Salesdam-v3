import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import logger from '../utils/logger.js';
import { SALESDAM_OBJECTS } from '../config/objects/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Brings existing tenants in line with the object config for the list-view work.
 *
 * `seedSalesdamObjects` only ever CREATES missing fields — it never updates
 * existing ones and never revisits object-level settings. So for a workspace
 * seeded before this change:
 *   - the new fields (deal.countdown, task.countdown, product.product_type,
 *     contact.name, lead.is_converted) do not exist
 *   - product.sku still reads "SKU" rather than "Product Code"
 *   - lead.nameFieldApiName is still first_name, not technical_scope
 *   - the line-item subtotal fields have no formulaReturnType (the config used a
 *     key the schema ignored)
 *
 * This script fixes all of the above. It is idempotent and only ever adds or
 * corrects — it never deletes a field.
 *
 * Usage:
 *   npm run migrate:list-view-fields -- --dry-run
 *   npm run migrate:list-view-fields
 */

// Fields added by this change, keyed by object api name.
const NEW_FIELDS = {
  lead: ['is_converted'],
  deal: ['countdown'],
  task: ['countdown'],
  product: ['product_type'],
  contact: ['name'],
};

// Object-level settings to correct.
const OBJECT_SETTINGS = {
  lead: {
    nameFieldApiName: 'technical_scope',
    searchFields: ['technical_scope', 'first_name', 'last_name', 'email', 'phone'],
  },
};

// Existing fields whose definition changed (label / formula metadata).
const FIELD_CORRECTIONS = [
  { objectApiName: 'product', apiName: 'sku', set: { name: 'Product Code', label: 'Product Code' } },
  { objectApiName: 'deal_line_item', apiName: 'subtotal', set: { formulaReturnType: 'currency' } },
  { objectApiName: 'order_line_item', apiName: 'subtotal', set: { formulaReturnType: 'currency' } },
];

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();

  const prefix = dryRun ? '[DRY RUN] ' : '';
  let added = 0;
  let corrected = 0;
  let settingsChanged = 0;

  // ── 1. Add the new fields ────────────────────────────────────────────────
  for (const [objectApiName, apiNames] of Object.entries(NEW_FIELDS)) {
    const config = SALESDAM_OBJECTS.find((o) => o.apiName === objectApiName);
    if (!config) {
      logger.warn(`  skip ${objectApiName} — not found in config.`);
      continue;
    }

    for (const apiName of apiNames) {
      const definition = (config.fields || []).find((f) => f.apiName === apiName);
      if (!definition) {
        logger.warn(`  skip ${objectApiName}.${apiName} — not declared in config.`);
        continue;
      }

      // One ObjectMeta per tenant, so add the field to each.
      const objects = await ObjectMeta.find({ apiName: objectApiName }).select('_id tenantId');
      for (const obj of objects) {
        const exists = await FieldMeta.findOne({
          tenantId: obj.tenantId,
          objectId: obj._id,
          apiName,
        });
        if (exists) continue;

        if (!dryRun) {
          await FieldMeta.create({
            ...definition,
            tenantId: obj.tenantId,
            objectId: obj._id,
            objectApiName,
          });
        }
        added += 1;
      }
      logger.info(`  ${prefix}${objectApiName}.${apiName} — checked ${objects.length} tenant(s).`);
    }
  }

  // ── 2. Correct existing field definitions ────────────────────────────────
  for (const { objectApiName, apiName, set } of FIELD_CORRECTIONS) {
    const filter = { objectApiName, apiName };
    const pending = await FieldMeta.countDocuments({
      ...filter,
      $or: Object.entries(set).map(([k, v]) => ({ [k]: { $ne: v } })),
    });
    if (pending === 0) {
      logger.info(`  ok   ${objectApiName}.${apiName} — already correct.`);
      continue;
    }
    if (!dryRun) {
      const res = await FieldMeta.updateMany(filter, { $set: set });
      corrected += res.modifiedCount;
    } else {
      corrected += pending;
    }
    logger.info(`  ${prefix}${objectApiName}.${apiName} — ${pending} doc(s) to correct.`);
  }

  // ── 3. Object-level settings ─────────────────────────────────────────────
  for (const [objectApiName, set] of Object.entries(OBJECT_SETTINGS)) {
    const pending = await ObjectMeta.countDocuments({
      apiName: objectApiName,
      nameFieldApiName: { $ne: set.nameFieldApiName },
    });

    // Only switch the name field if the target field actually exists for that
    // tenant, otherwise record titles would resolve to nothing.
    const objects = await ObjectMeta.find({ apiName: objectApiName }).select('_id tenantId nameFieldApiName');
    for (const obj of objects) {
      if (obj.nameFieldApiName === set.nameFieldApiName) continue;

      const target = await FieldMeta.findOne({
        tenantId: obj.tenantId,
        objectId: obj._id,
        apiName: set.nameFieldApiName,
      });
      if (!target) {
        logger.warn(
          `  skip ${objectApiName} (tenant ${obj.tenantId}) — field "${set.nameFieldApiName}" does not exist.`,
        );
        continue;
      }

      if (!dryRun) {
        await ObjectMeta.updateOne({ _id: obj._id }, { $set: set });
      }
      settingsChanged += 1;
    }
    logger.info(`  ${prefix}${objectApiName} name field — ${pending} tenant(s) pending.`);
  }

  logger.info(
    `${prefix}Done. ${added} field(s) added, ${corrected} field(s) corrected, ${settingsChanged} object setting(s) updated.` +
      (dryRun ? ' Re-run without --dry-run to apply.' : ''),
  );
  await mongoose.disconnect();
};

run().catch(async (err) => {
  logger.error(`List-view field migration failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
