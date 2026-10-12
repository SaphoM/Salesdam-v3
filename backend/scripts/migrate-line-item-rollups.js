/**
 * migrate-line-item-rollups.js
 *
 * Brings existing tenants onto the line-item rollup model:
 *
 *   deal_line_item.line_cost   (hidden helper formula) quantity × unit_price
 *   order_line_item.line_cost  (hidden helper formula) quantity × unit_price
 *
 *   deal.line_items_cost_total     (hidden helper rollup) SUM of line_cost
 *   deal.line_items_selling_total  (hidden helper rollup) SUM of subtotal
 *   deal.purchase_price            currency → formula over the cost rollup
 *   deal.order_value               currency → formula over the selling rollup
 *
 *   order.line_items_selling_total (hidden helper rollup) SUM of subtotal
 *   order.order_value              currency → formula over the selling rollup
 *
 * Field definitions are read from config/objects so this script can never drift
 * from the seed definitions.
 *
 * Then every existing record is recalculated: line items first (so the helper
 * values exist), then deals and orders (rollups, then the formulas over them).
 *
 * Safe to re-run — field upserts are idempotent and recalculation is derived
 * entirely from the line items.
 *
 * Usage:  node scripts/migrate-line-item-rollups.js [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import FieldMeta from '../models/FieldMeta.js';
import ObjectMeta from '../models/ObjectMeta.js';
import DynamicRecord from '../models/DynamicRecord.js';
import { SALESDAM_OBJECTS } from '../config/objects/index.js';
import { computeAndSetFormulaValues } from '../services/formulaService.js';
import { setRollupValuesOnRecord } from '../services/rollupService.js';
import { buildSearchText } from '../services/searchService.js';

config();

const DRY_RUN = process.argv.includes('--dry-run');

// Which fields this migration owns, in dependency order.
const TARGETS = [
  // `subtotal` is re-pointed at the rounded formula: the unrounded version
  // stored values like 57499.99999999999, which then fed the parent's total.
  { objectApiName: 'deal_line_item', fields: ['line_cost', 'subtotal'] },
  { objectApiName: 'order_line_item', fields: ['line_cost', 'subtotal'] },
  {
    objectApiName: 'deal',
    fields: [
      'line_items_cost_total',
      'line_items_selling_total',
      'purchase_price',
      'order_value',
    ],
  },
  {
    objectApiName: 'order',
    fields: ['line_items_selling_total', 'order_value'],
  },
];

// Parent objects get recalculated after their line items.
const PARENT_OBJECTS = ['deal', 'order'];
const LINE_ITEM_OBJECTS = ['deal_line_item', 'order_line_item'];

// Properties this migration is allowed to overwrite on a field that already
// exists. Label, section and displayOrder are deliberately excluded so a tenant
// that relabelled or repositioned a field keeps their customisation.
const MANAGED_PROPS = [
  'type',
  'isReadOnly',
  'isHidden',
  'precision',
  'scale',
  'formula',
  'formulaReturnType',
  'rollupObjectApiName',
  'rollupRelationField',
  'rollupType',
  'rollupField',
  'helpText',
];

const findDefinition = (objectApiName, fieldApiName) => {
  const obj = SALESDAM_OBJECTS.find((o) => o.apiName === objectApiName);
  const def = obj?.fields?.find((f) => f.apiName === fieldApiName);
  if (!def) {
    throw new Error(
      `config/objects has no definition for ${objectApiName}.${fieldApiName}`,
    );
  }
  return def;
};

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set. Add it to backend/.env');
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✓ Connected to MongoDB${DRY_RUN ? '  (DRY RUN — no writes)' : ''}`);
};

/**
 * Create or update the FieldMeta for one field on one tenant's object.
 * @returns 'created' | 'updated' | 'unchanged' | 'skipped'
 */
async function upsertField(tenantId, objectApiName, fieldApiName, stats) {
  const objectMeta = await ObjectMeta.findOne({ tenantId, apiName: objectApiName });
  if (!objectMeta) return 'skipped';

  const def = findDefinition(objectApiName, fieldApiName);
  const existing = await FieldMeta.findOne({
    tenantId,
    objectApiName,
    apiName: fieldApiName,
  });

  if (!existing) {
    if (!DRY_RUN) {
      await FieldMeta.create({
        tenantId,
        objectId: objectMeta._id,
        objectApiName,
        ...def,
      });
    }
    stats.created.push(`${objectApiName}.${fieldApiName}`);
    return 'created';
  }

  // Only touch the managed properties, and only when they actually differ.
  const changes = {};
  for (const prop of MANAGED_PROPS) {
    if (def[prop] === undefined) continue;
    const current = existing[prop];
    if (String(current ?? '') !== String(def[prop])) changes[prop] = def[prop];
  }

  // Converting to a formula must clear any leftover currency default, which
  // would otherwise be written back over the computed value on create.
  if (def.type === 'formula' && existing.defaultValue != null) {
    changes.defaultValue = null;
  }

  if (Object.keys(changes).length === 0) return 'unchanged';

  if (!DRY_RUN) {
    Object.assign(existing, changes);
    await existing.save();
  }
  stats.updated.push(
    `${objectApiName}.${fieldApiName} (${Object.keys(changes).join(', ')})`,
  );
  return 'updated';
}

/**
 * The field list to recalculate against.
 *
 * On a real run the database already matches the canonical definitions. On a dry
 * run nothing was written, so the definitions are overlaid in memory — otherwise
 * the recalculation would run against the old `currency` fields, compute
 * nothing, and report "no values changed" no matter what the real impact is.
 */
async function effectiveFields(tenantId, objectApiName) {
  const stored = await FieldMeta.find({ tenantId, objectApiName }).lean();
  if (!DRY_RUN) return stored;

  const owned = TARGETS.find((t) => t.objectApiName === objectApiName)?.fields || [];
  const merged = stored.map((f) => ({ ...f }));

  for (const fieldApiName of owned) {
    const def = findDefinition(objectApiName, fieldApiName);
    const idx = merged.findIndex((f) => f.apiName === fieldApiName);
    const overlay = {};
    MANAGED_PROPS.forEach((p) => {
      if (def[p] !== undefined) overlay[p] = def[p];
    });
    if (idx === -1) {
      merged.push({ apiName: fieldApiName, label: def.label, ...overlay });
    } else {
      merged[idx] = { ...merged[idx], ...overlay };
    }
  }
  return merged;
}

/** Recalculate formula values on every record of an object. */
async function recalcFormulas(tenantId, objectApiName, stats) {
  const fields = await effectiveFields(tenantId, objectApiName);
  if (fields.length === 0) return 0;

  const cursor = DynamicRecord.find({
    tenantId,
    objectApiName,
    isDeleted: false,
  }).cursor();

  let touched = 0;
  for await (const record of cursor) {
    await computeAndSetFormulaValues(record, fields);
    if (!DRY_RUN) {
      record._searchText = await buildSearchText(record, fields);
      await record.save();
    }
    touched++;
  }
  stats.recalculated[objectApiName] =
    (stats.recalculated[objectApiName] || 0) + touched;
  return touched;
}

/**
 * Recalculate rollups then formulas on every parent record, and report where a
 * previously hand-entered price is being replaced by a different computed total
 * — that is the one visible behaviour change of this migration.
 */
async function recalcParents(tenantId, objectApiName, stats) {
  const fields = await effectiveFields(tenantId, objectApiName);
  if (fields.length === 0) return 0;

  const watched = objectApiName === 'deal'
    ? ['purchase_price', 'order_value']
    : ['order_value'];

  // On a dry run the child `line_cost` field does not exist in the database yet,
  // so the rollup would find nothing to aggregate. Hand it the same overlaid
  // definitions used for the parent.
  const childFields = {};
  for (const childObjectApiName of LINE_ITEM_OBJECTS) {
    childFields[childObjectApiName] = await effectiveFields(
      tenantId,
      childObjectApiName,
    );
  }

  const cursor = DynamicRecord.find({
    tenantId,
    objectApiName,
    isDeleted: false,
  }).cursor();

  let touched = 0;
  for await (const record of cursor) {
    const before = {};
    watched.forEach((apiName) => {
      before[apiName] = record.getField(apiName);
    });

    await setRollupValuesOnRecord(tenantId, record, fields, {
      childFieldsByObject: childFields,
    });
    await computeAndSetFormulaValues(record, fields);

    watched.forEach((apiName) => {
      const prev = before[apiName];
      const next = record.getField(apiName);
      const prevNum = Number(prev);
      const nextNum = Number(next);
      const hadManualValue = prev !== undefined && prev !== null && prev !== '';
      if (hadManualValue && Math.abs((prevNum || 0) - (nextNum || 0)) > 0.005) {
        stats.replaced.push({
          objectApiName,
          recordId: String(record._id),
          field: apiName,
          from: prevNum,
          to: nextNum,
        });
      }
    });

    if (!DRY_RUN) {
      record._searchText = await buildSearchText(record, fields);
      await record.save();
    }
    touched++;
  }
  stats.recalculated[objectApiName] =
    (stats.recalculated[objectApiName] || 0) + touched;
  return touched;
}

const main = async () => {
  console.log('🚀 Line item rollup migration');
  console.log('==============================================');

  await connectDB();

  // Every tenant that has a deal or an order object.
  const tenantIds = await ObjectMeta.distinct('tenantId', {
    apiName: { $in: PARENT_OBJECTS },
  });
  console.log(`Found ${tenantIds.length} tenant(s) with deal/order metadata\n`);

  const stats = {
    created: [],
    updated: [],
    recalculated: {},
    replaced: [],
  };

  for (const tenantId of tenantIds) {
    const short = String(tenantId).slice(-8);

    // ── 1. Field metadata ───────────────────────────────────────────────────
    for (const target of TARGETS) {
      for (const fieldApiName of target.fields) {
        const outcome = await upsertField(
          tenantId,
          target.objectApiName,
          fieldApiName,
          stats,
        );
        if (outcome === 'created' || outcome === 'updated') {
          console.log(
            `  [${short}] ${outcome}: ${target.objectApiName}.${fieldApiName}`,
          );
        }
      }
    }

    // ── 2. Line items first, so line_cost / subtotal exist ──────────────────
    for (const objectApiName of LINE_ITEM_OBJECTS) {
      await recalcFormulas(tenantId, objectApiName, stats);
    }

    // ── 3. Parents: rollups, then the formulas that read them ───────────────
    for (const objectApiName of PARENT_OBJECTS) {
      await recalcParents(tenantId, objectApiName, stats);
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('\n----------------------------------------------');
  console.log(`Fields created:  ${stats.created.length}`);
  [...new Set(stats.created)].forEach((f) => console.log(`   + ${f}`));
  console.log(`Fields updated:  ${stats.updated.length}`);
  [...new Set(stats.updated)].forEach((f) => console.log(`   ~ ${f}`));

  console.log('\nRecords recalculated:');
  Object.entries(stats.recalculated).forEach(([obj, n]) =>
    console.log(`   ${obj}: ${n}`),
  );

  if (stats.replaced.length > 0) {
    // The previous values only existed in the records being overwritten, so
    // write them out before/alongside the change — this file is the only way
    // back to the hand-entered figures.
    if (!DRY_RUN) {
      const backupDir = path.resolve('migration-backups');
      fs.mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        backupDir,
        `line-item-rollups-replaced-${stamp}.json`,
      );
      fs.writeFileSync(backupPath, JSON.stringify(stats.replaced, null, 2), 'utf8');
      console.log(`\n💾 Previous values saved to ${backupPath}`);
    }

    console.log(
      `\n⚠️  ${stats.replaced.length} previously hand-entered value(s) replaced by the line-item total:`,
    );
    stats.replaced.slice(0, 25).forEach((r) =>
      console.log(
        `   ${r.objectApiName} ${r.recordId} ${r.field}: ${r.from} → ${r.to}`,
      ),
    );
    if (stats.replaced.length > 25) {
      console.log(`   …and ${stats.replaced.length - 25} more`);
    }
    console.log(
      '   These records had no line items, or line items that total a different amount.',
    );
  } else {
    console.log('\nNo hand-entered values differed from the computed totals.');
  }

  console.log('==============================================');
  console.log(DRY_RUN ? '✅ Dry run complete — nothing written' : '✅ Migration complete');
};

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
