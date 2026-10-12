import mongoose from 'mongoose';
import DynamicRecord from '../models/DynamicRecord.js';
import FieldMeta from '../models/FieldMeta.js';
import { evaluateFormula } from './formulaParser.js';
import logger from '../utils/logger.js';

/**
 * Rollup summary fields — Salesforce-style aggregation of child (detail) records
 * onto a parent (master) record.
 *
 * A rollup field is configured with:
 *   rollupObjectApiName  child object to aggregate     e.g. 'deal_line_item'
 *   rollupRelationField  lookup on the child pointing back at the parent, e.g. 'deal'
 *   rollupType           COUNT | SUM | AVG | MIN | MAX
 *   rollupField          field on the child to aggregate (ignored for COUNT)
 *   rollupFilter         optional formula; only children where it is true count
 *
 * Values are computed and persisted on the parent whenever a child changes, so
 * list views and filters can read them straight from stored data.
 */

const AGGREGATE_TYPES = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);

/**
 * Lookup values are written as strings by the record API but some internal
 * paths store a real ObjectId. Match either form so a rollup never silently
 * misses children.
 */
function parentIdMatches(parentRecordId) {
  const asString = String(parentRecordId);
  const matches = [asString];
  if (mongoose.isValidObjectId(asString)) {
    matches.push(new mongoose.Types.ObjectId(asString));
  }
  return matches;
}

/** Read a field off a record whose `data` may be a Map or a plain object. */
function readField(record, apiName) {
  const data = record?.data;
  if (!data) return undefined;
  return data instanceof Map || typeof data.get === 'function'
    ? data.get(apiName)
    : data[apiName];
}

/** Flatten a record's `data` into a plain context object for formula evaluation. */
function toContext(record) {
  const data = record?.data;
  if (!data) return {};
  if (data instanceof Map || typeof data.entries === 'function') {
    return Object.fromEntries(data.entries ? data.entries() : data);
  }
  return { ...data };
}

/**
 * Resolve the aggregated value for one child record.
 *
 * When the aggregated field is itself a formula, it is evaluated live rather
 * than read from storage. Formula values are only persisted by the write paths
 * that call computeAndSetFormulaValues, so a child written by any other path
 * would otherwise contribute nothing to the rollup.
 */
function childValue(child, aggFieldMeta, aggFieldApiName) {
  if (aggFieldMeta?.type === 'formula' && aggFieldMeta.formula) {
    try {
      return evaluateFormula(aggFieldMeta.formula, toContext(child));
    } catch {
      return readField(child, aggFieldApiName);
    }
  }
  return readField(child, aggFieldApiName);
}

/**
 * computeRollupValue
 *
 * Calculates the rollup summary value for a single rollup field on a parent record.
 *
 * @param {string} tenantId
 * @param {string} parentRecordId - _id of the parent record being read/saved
 * @param {object} rollupField    - FieldMeta document with type === 'rollup_summary'
 * @param {object}   [options]
 * @param {object[]} [options.childFields] - preloaded FieldMeta for the child object
 * @param {object}   [options.session]     - mongoose session, so children written
 *                                          inside an open transaction are visible
 * @returns {number|null}         - Computed value, or null when unconfigured / no data
 */
export async function computeRollupValue(
  tenantId,
  parentRecordId,
  rollupField,
  { childFields = null, session = null } = {},
) {
  try {
    const {
      rollupObjectApiName,
      rollupRelationField,
      rollupType,
      rollupField: aggFieldApiName,
      rollupFilter,
    } = rollupField;

    if (!rollupObjectApiName || !rollupRelationField || !rollupType) return null;

    const type = String(rollupType).toUpperCase();
    if (!AGGREGATE_TYPES.has(type)) return null;
    if (type !== 'COUNT' && !aggFieldApiName) return null;

    const query = {
      tenantId,
      objectApiName: rollupObjectApiName,
      isDeleted: false,
      [`data.${rollupRelationField}`]: { $in: parentIdMatches(parentRecordId) },
    };

    // A COUNT with no filter is a pure count — no need to load any documents.
    if (type === 'COUNT' && !rollupFilter) {
      const countQuery = DynamicRecord.countDocuments(query);
      if (session) countQuery.session(session);
      return countQuery;
    }

    // The whole `data` map is needed: formula aggregates and filter expressions
    // both reference sibling fields on the child.
    const childQuery = DynamicRecord.find(query).select('data').lean();
    if (session) childQuery.session(session);
    const children = await childQuery;

    let matching = children;
    if (rollupFilter) {
      matching = children.filter((child) => {
        try {
          return Boolean(evaluateFormula(rollupFilter, toContext(child)));
        } catch (err) {
          // A filter that cannot be evaluated excludes the child rather than
          // silently counting it — an unparseable filter must not inflate totals.
          logger.warn(
            `Rollup filter error on field ${rollupField.apiName}: ${err.message}`,
          );
          return false;
        }
      });
    }

    if (type === 'COUNT') return matching.length;

    const aggFieldMeta = (
      childFields ||
      (await FieldMeta.find({
        tenantId,
        objectApiName: rollupObjectApiName,
        apiName: aggFieldApiName,
      }).lean())
    ).find((f) => f.apiName === aggFieldApiName);

    // A rollup over a field that no longer exists is a configuration error, not
    // a zero — reporting 0 would silently understate the total.
    if (!aggFieldMeta) {
      logger.warn(
        `Rollup field "${rollupField.apiName}" aggregates missing field "${aggFieldApiName}" on "${rollupObjectApiName}"`,
      );
      return null;
    }

    const values = matching
      .map((child) => parseFloat(childValue(child, aggFieldMeta, aggFieldApiName)))
      .filter((v) => !isNaN(v));

    if (values.length === 0) {
      // Salesforce reports an empty SUM/AVG as 0 and an empty MIN/MAX as blank.
      return type === 'SUM' ? 0 : null;
    }

    switch (type) {
      case 'SUM': return values.reduce((a, b) => a + b, 0);
      case 'AVG': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'MIN': return Math.min(...values);
      case 'MAX': return Math.max(...values);
      default: return null;
    }
  } catch (err) {
    logger.warn(
      `Rollup compute error for field ${rollupField?.apiName}: ${err.message}`,
    );
    return null;
  }
}

/**
 * computeRollupsForRecord
 *
 * Computes every rollup field for one parent record and returns an
 * { apiName: value } map. Child field metadata is loaded once per child object
 * rather than once per rollup field.
 */
export async function computeRollupsForRecord(
  tenantId,
  parentRecordId,
  rollupFields,
  { session = null, childFieldsByObject: provided = null } = {},
) {
  const result = {};
  if (!rollupFields?.length || !parentRecordId) return result;

  const childObjectNames = [
    ...new Set(rollupFields.map((f) => f.rollupObjectApiName).filter(Boolean)),
  ];
  const childFieldsByObject = {};
  await Promise.all(
    childObjectNames.map(async (objectApiName) => {
      // A caller can supply the child field metadata — the migration does this
      // so a dry run can evaluate against definitions not yet written to the DB.
      if (provided?.[objectApiName]) {
        childFieldsByObject[objectApiName] = provided[objectApiName];
        return;
      }
      const q = FieldMeta.find({ tenantId, objectApiName }).lean();
      if (session) q.session(session);
      childFieldsByObject[objectApiName] = await q;
    }),
  );

  await Promise.all(
    rollupFields.map(async (field) => {
      const value = await computeRollupValue(tenantId, parentRecordId, field, {
        childFields: childFieldsByObject[field.rollupObjectApiName],
        session,
      });
      if (value !== null) result[field.apiName] = value;
    }),
  );

  return result;
}

/**
 * injectRollupValues
 *
 * Computes all rollup values for a parent record and writes them into a flat
 * data object (mutated in place). Used on read so a detail view always reflects
 * the current children even if a write path missed a refresh.
 */
export async function injectRollupValues(
  tenantId,
  parentRecordId,
  dataObj,
  rollupFields,
  { session = null } = {},
) {
  if (!rollupFields?.length) return;
  const values = await computeRollupsForRecord(
    tenantId,
    parentRecordId,
    rollupFields,
    { session },
  );
  Object.assign(dataObj, values);
}

/**
 * setRollupValuesOnRecord
 *
 * Computes and assigns rollup values onto a DynamicRecord instance (without
 * saving). Call this before computeAndSetFormulaValues so formula fields that
 * reference a rollup see the fresh number.
 *
 * @returns {boolean} true when at least one value was written
 */
export async function setRollupValuesOnRecord(
  tenantId,
  record,
  fields,
  { session = null, childFieldsByObject = null } = {},
) {
  const rollupFields = (fields || []).filter((f) => f.type === 'rollup_summary');
  if (!rollupFields.length || !record?._id) return false;

  const values = await computeRollupsForRecord(
    tenantId,
    record._id,
    rollupFields,
    { session, childFieldsByObject },
  );
  const entries = Object.entries(values);
  entries.forEach(([apiName, value]) => record.setField(apiName, value));
  return entries.length > 0;
}

/**
 * refreshRollupOnParent
 *
 * Called when a child record is created / updated / deleted. Recomputes every
 * rollup field on the parent that aggregates this child object, then recomputes
 * the parent's formula fields — a formula that reads a rollup would otherwise
 * keep its stale stored value — and rebuilds the parent's search text.
 *
 * @param {string} tenantId
 * @param {string} childObjectApiName   e.g. 'deal_line_item'
 * @param {string} parentRecordId
 * @param {string} parentObjectApiName  e.g. 'deal'
 */
export async function refreshRollupOnParent(
  tenantId,
  childObjectApiName,
  parentRecordId,
  parentObjectApiName,
) {
  try {
    if (!parentRecordId || !parentObjectApiName) return;

    // Every field on the parent is needed: the rollups to recompute, plus the
    // formula fields and search config that depend on them.
    const parentFields = await FieldMeta.find({
      tenantId,
      objectApiName: parentObjectApiName,
    });

    const rollupFields = parentFields.filter(
      (f) =>
        f.type === 'rollup_summary' &&
        f.rollupObjectApiName === childObjectApiName,
    );
    if (!rollupFields.length) return;

    const parent = await DynamicRecord.findOne({
      _id: parentRecordId,
      tenantId,
      objectApiName: parentObjectApiName,
      isDeleted: false,
    });
    if (!parent) return;

    const values = await computeRollupsForRecord(
      tenantId,
      parentRecordId,
      rollupFields,
    );
    Object.entries(values).forEach(([apiName, value]) =>
      parent.setField(apiName, value),
    );

    // Imported lazily: formulaService imports nothing from here, but keeping the
    // dependency dynamic avoids any future cycle between the two services.
    const { computeAndSetFormulaValues } = await import('./formulaService.js');
    await computeAndSetFormulaValues(parent, parentFields);

    const { buildSearchText } = await import('./searchService.js');
    parent._searchText = await buildSearchText(parent, parentFields);

    await parent.save();
  } catch (err) {
    logger.warn(`refreshRollupOnParent error: ${err.message}`);
  }
}
