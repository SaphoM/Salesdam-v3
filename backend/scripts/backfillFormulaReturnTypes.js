import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import FieldMeta from '../models/FieldMeta.js';
import logger from '../utils/logger.js';
import { inferReturnType, declaredTypesForKind } from '../services/formulaParser.js';
import { buildFieldKindMap } from '../services/validationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Backfills `formulaReturnType` on formula fields that predate it.
 *
 * The field modal had no return-type control until now, so every formula field
 * an admin created through the UI was saved without one. Those fields still
 * work — the value is stored uncoerced and rendered as plain text — but they
 * can't be re-saved from the modal until a return type is chosen, and a currency
 * formula shows as a bare number.
 *
 * The expression itself says what the type should be, so this infers it from the
 * AST and writes it back. Only definite inferences are applied:
 *   - a `number` kind is written as `number`, never `currency` or `percent` —
 *     those differ from `number` only in presentation, and guessing presentation
 *     from an expression would be wrong as often as right. Review numeric
 *     fields afterwards and switch the ones that are money to Currency.
 *   - an `unknown` kind is skipped and reported, for a human to decide.
 *
 * Idempotent: fields that already have a return type are left untouched.
 *
 * Usage:
 *   node scripts/backfillFormulaReturnTypes.js --dry-run
 *   node scripts/backfillFormulaReturnTypes.js
 */

// The declared type written for each inferred kind. `number` is the neutral
// choice for numeric formulas — see the note above.
const KIND_TO_DECLARED = {
  text: 'text',
  number: 'number',
  date: 'date',
  boolean: 'boolean',
};

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();

  const prefix = dryRun ? '[DRY RUN] ' : '';

  const pending = await FieldMeta.find({
    type: 'formula',
    formula: { $nin: [null, ''] },
    $or: [
      { formulaReturnType: { $exists: false } },
      { formulaReturnType: null },
      { formulaReturnType: '' },
    ],
  });

  if (pending.length === 0) {
    logger.info('No formula fields are missing a return type. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  logger.info(`${prefix}${pending.length} formula field(s) missing a return type.`);

  // Inference needs the sibling fields' types, which differ per tenant+object,
  // so the kind map is built once per (tenantId, objectApiName) pair.
  const kindMapCache = new Map();
  const kindsFor = async (tenantId, objectApiName) => {
    const key = `${tenantId}::${objectApiName}`;
    if (!kindMapCache.has(key)) {
      const siblings = await FieldMeta.find({ tenantId, objectApiName });
      kindMapCache.set(key, buildFieldKindMap(siblings));
    }
    return kindMapCache.get(key);
  };

  let updated = 0;
  const skipped = [];

  for (const field of pending) {
    const kinds = await kindsFor(field.tenantId, field.objectApiName);
    const kind = inferReturnType(field.formula, kinds);
    const declared = KIND_TO_DECLARED[kind];

    if (!declared) {
      skipped.push(field);
      logger.warn(
        `  skip ${field.objectApiName}.${field.apiName} (tenant ${field.tenantId}) — ` +
          `could not infer a return type from: ${field.formula}`,
      );
      continue;
    }

    if (!dryRun) {
      await FieldMeta.updateOne(
        { _id: field._id },
        { $set: { formulaReturnType: declared } },
      );
    }
    updated += 1;

    const alternatives = declaredTypesForKind(kind).filter((t) => t !== declared);
    logger.info(
      `  ${prefix}${field.objectApiName}.${field.apiName} → ${declared}` +
        (alternatives.length ? ` (could also be ${alternatives.join('/')})` : '') +
        `  | ${field.formula}`,
    );
  }

  logger.info(
    `${prefix}Done. ${updated} field(s) set, ${skipped.length} skipped for review.` +
      (dryRun ? ' Re-run without --dry-run to apply.' : ''),
  );
  if (updated > 0) {
    logger.info(
      'Numeric formulas were set to "number". Review them and switch any that ' +
        'represent money to "currency", or a ratio to "percent".',
    );
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  logger.error(`Formula return-type backfill failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
