import mongoose from 'mongoose';

/**
 * Translates list-view filter conditions into a MongoDB query.
 *
 * Two problems this fixes:
 *
 * 1. The old `listRecords` filter assigned request values straight into the
 *    query (`query['data.' + key] = value`), so a caller could pass
 *    `{"x": {"$where": "..."}}` and have it executed. Values are now only ever
 *    used as operands of a whitelisted operator, never as raw query fragments.
 *
 * 2. Every key was force-prefixed with `data.`, making the root columns
 *    (`createdAt`, `updatedAt`, `ownerId`, `_id`) unreachable — which is why the
 *    built-in "My Records" and "Created Today" views returned nothing.
 */

// Fields that live on the document root rather than inside the `data` map.
const ROOT_FIELDS = new Set([
  '_id',
  'ownerId',
  'createdAt',
  'updatedAt',
  'createdBy',
  'lastModifiedBy',
]);

// Sentinel resolved to the requesting user, so a saved view can mean
// "assigned to whoever is looking at it".
export const CURRENT_USER = '@me';

const OBJECT_ID_FIELDS = new Set(['_id', 'ownerId', 'createdBy', 'lastModifiedBy']);

/** Resolves the queryable path for a field api name. */
const pathFor = (field) =>
  ROOT_FIELDS.has(field) ? field : `data.${field}`;

/*
 * ── Operand coercion ────────────────────────────────────────────────────────
 *
 * validationService stores numbers as JS numbers, dates as Date objects and
 * booleans as booleans inside the `data` map. Filter values, on the other hand,
 * arrive from the UI and the query string as strings.
 *
 * Mongo only ever compares values of the same BSON type, so `{ $gt: '100' }`
 * never matches a stored `100` and `{ $eq: '2026-08-16' }` never matches a
 * stored Date. Every operand therefore has to be coerced to the type the field
 * is actually stored as before it reaches the query — otherwise the numeric,
 * date and currency operators silently return nothing.
 */

const NUMERIC_TYPES = new Set(['number', 'currency', 'percent', 'rollup_summary']);
const DATE_TYPES = new Set(['date', 'datetime']);

/** Root columns aren't FieldMeta rows, so their types are known statically. */
const ROOT_FIELD_TYPES = {
  _id: 'id',
  ownerId: 'id',
  createdBy: 'id',
  lastModifiedBy: 'id',
  createdAt: 'datetime',
  updatedAt: 'datetime',
};

const NUMERIC_STRING = /^-?\d+(\.\d+)?$/;
const DATE_STRING = /^\d{4}-\d{2}-\d{2}([T ]|$)/;

/** The declared type of a field, or null when there's no metadata for it. */
const typeFor = (field, ctx) =>
  ROOT_FIELD_TYPES[field] || ctx?.fieldTypes?.[field] || null;

const toObjectId = (value) =>
  mongoose.isValidObjectId(value)
    ? new mongoose.Types.ObjectId(String(value))
    : value;

/** Coerces one operand to the BSON type a field of `type` is stored as. */
const coerceToType = (type, value) => {
  if (value === null || value === undefined) return value;

  if (type === 'id') return toObjectId(value);

  if (NUMERIC_TYPES.has(type)) {
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }

  if (DATE_TYPES.has(type)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d;
  }

  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    return !(value === 'false' || value === '0' || value === 0);
  }

  return value;
};

/** Best guess at the intended type when there's no field metadata to go on. */
const inferOperand = (value) => {
  if (typeof value !== 'string') return value;
  if (NUMERIC_STRING.test(value)) return Number(value);
  if (DATE_STRING.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return value;
};

/**
 * The operand(s) to compare a field against.
 *
 * With a known field type there is exactly one — the coerced value. With no
 * metadata (ad-hoc `?filter=` queries, formula fields) both the inferred and the
 * raw form are returned, and the caller ORs them: Mongo compares within a single
 * BSON type, so whichever form doesn't match the stored type simply matches
 * nothing rather than producing a wrong result.
 */
const operandsFor = (field, value, ctx) => {
  const type = typeFor(field, ctx);
  if (type) return [coerceToType(type, value)];

  // Legacy behaviour for the root id columns is preserved by ROOT_FIELD_TYPES
  // above; this covers anything else that stores an id.
  if (OBJECT_ID_FIELDS.has(field)) return [toObjectId(value)];

  const inferred = inferOperand(value);
  return inferred === value ? [value] : [inferred, value];
};

/** Wraps per-operand clauses so several candidate types can be tried at once. */
const anyOf = (clauses) =>
  clauses.length === 1 ? clauses[0] : { $or: clauses };

/**
 * "Empty" covers null, missing, the empty string and the empty array — the last
 * of which matters for multipicklist fields.
 */
const emptyClause = (path) => ({
  $or: [
    { [path]: null },
    { [path]: '' },
    { [path]: { $size: 0 } },
    { [path]: { $exists: false } },
  ],
});

/** Escapes a string for safe use inside a RegExp. */
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** UTC start-of-day for a date. */
const startOfDay = (d) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const addDays = (d, n) => {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
};

/**
 * Named relative date ranges, returned as [inclusiveStart, exclusiveEnd).
 * All in UTC to match how date values are stored.
 */
const dateRange = (name, now = new Date()) => {
  const today = startOfDay(now);
  switch (name) {
    case 'today':
      return [today, addDays(today, 1)];
    case 'yesterday':
      return [addDays(today, -1), today];
    case 'tomorrow':
      return [addDays(today, 1), addDays(today, 2)];
    case 'this_week': {
      // Week starts Monday.
      const dow = (today.getUTCDay() + 6) % 7;
      const start = addDays(today, -dow);
      return [start, addDays(start, 7)];
    }
    case 'next_7_days':
      return [today, addDays(today, 7)];
    case 'last_7_days':
      return [addDays(today, -7), addDays(today, 1)];
    case 'this_month': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
      return [start, end];
    }
    case 'this_year': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1));
      return [start, end];
    }
    default:
      return null;
  }
};

/** Every operator a saved view may use. Anything else is rejected. */
export const OPERATORS = [
  'eq',
  'ne',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'is_empty',
  'is_not_empty',
  'is_true',
  'is_false',
  'date_is',
  'date_before',
  'date_after',
];

// Operators that describe a named relative range rather than a literal value.
export const RANGE_NAMES = [
  'today',
  'yesterday',
  'tomorrow',
  'this_week',
  'next_7_days',
  'last_7_days',
  'this_month',
  'this_year',
];

/**
 * Builds the Mongo clause for a single condition.
 * @returns {object|null} clause keyed by path, or null if the condition is
 *   incomplete / unusable (callers skip those rather than failing the query).
 */
const buildClause = (condition, ctx) => {
  const { field, operator = 'eq' } = condition || {};
  if (!field || typeof field !== 'string') return null;

  // Guard against operator-injection via the field name itself.
  if (field.startsWith('$') || field.includes('.$')) return null;
  if (!OPERATORS.includes(operator)) return null;

  const path = pathFor(field);

  // Value-less operators first.
  switch (operator) {
    case 'is_empty':
      return emptyClause(path);
    case 'is_not_empty':
      // Defined as the exact complement of is_empty, so the pair can't drift —
      // the old `$nin: [null, '']` counted an empty array as "not empty".
      return { $nor: [emptyClause(path)] };
    case 'is_true':
      return { [path]: true };
    case 'is_false':
      return { [path]: { $ne: true } };
    default:
      break;
  }

  let value = condition.value;

  // "@me" means the requesting user.
  if (value === CURRENT_USER) {
    if (!ctx?.userId) return null;
    value = String(ctx.userId);
  }

  // Named relative ranges are expressed as the value of a date operator.
  if (
    ['date_is', 'date_before', 'date_after'].includes(operator) &&
    typeof value === 'string' &&
    RANGE_NAMES.includes(value)
  ) {
    const range = dateRange(value, ctx?.now);
    if (!range) return null;
    const [start, end] = range;
    if (operator === 'date_is') return { [path]: { $gte: start, $lt: end } };
    if (operator === 'date_before') return { [path]: { $lt: start } };
    return { [path]: { $gte: end } }; // date_after
  }

  // Everything below needs a usable literal.
  if (value === undefined || value === null || value === '') return null;

  // Reject any object/array shaped like a raw Mongo fragment.
  if (typeof value === 'object' && !Array.isArray(value)) return null;

  switch (operator) {
    case 'eq':
      // $in over the candidate operands rather than a bare equality, so an
      // unknown field type can still match either the numeric or string form.
      return { [path]: { $in: operandsFor(field, value, ctx) } };
    case 'ne':
      return { [path]: { $nin: operandsFor(field, value, ctx) } };
    case 'contains':
      return { [path]: { $regex: escapeRegex(value), $options: 'i' } };
    case 'not_contains':
      return { [path]: { $not: new RegExp(escapeRegex(value), 'i') } };
    case 'starts_with':
      return { [path]: { $regex: `^${escapeRegex(value)}`, $options: 'i' } };
    case 'ends_with':
      return { [path]: { $regex: `${escapeRegex(value)}$`, $options: 'i' } };
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const mongoOp = `$${operator}`;
      return anyOf(
        operandsFor(field, value, ctx).map((operand) => ({
          [path]: { [mongoOp]: operand },
        })),
      );
    }
    case 'in':
    case 'not_in': {
      const raw = (Array.isArray(value) ? value : String(value).split(','))
        .map((v) => (typeof v === 'string' ? v.trim() : v))
        .filter((v) => v !== '' && v !== null && v !== undefined);
      if (raw.length === 0) return null;
      // flatMap so each entry contributes every candidate type it could be.
      const list = raw.flatMap((v) => operandsFor(field, v, ctx));
      return { [path]: operator === 'in' ? { $in: list } : { $nin: list } };
    }
    case 'date_is': {
      const day = startOfDay(new Date(value));
      if (isNaN(day.getTime())) return null;
      return { [path]: { $gte: day, $lt: addDays(day, 1) } };
    }
    case 'date_before': {
      const day = startOfDay(new Date(value));
      if (isNaN(day.getTime())) return null;
      return { [path]: { $lt: day } };
    }
    case 'date_after': {
      const day = startOfDay(new Date(value));
      if (isNaN(day.getTime())) return null;
      return { [path]: { $gte: addDays(day, 1) } };
    }
    default:
      return null;
  }
};

/**
 * Builds a Mongo query fragment from a list of filter conditions.
 *
 * @param {Array} filters - [{ field, operator, value }]
 * @param {object} ctx - { userId, now, fieldTypes }
 *   `fieldTypes` maps apiName -> FieldMeta type. Pass it whenever the caller has
 *   the object's fields to hand: without it the numeric and date operators fall
 *   back to guessing from the value's shape.
 * @returns {object} a fragment to merge into the records query ({} if none apply)
 */
export const buildFilterQuery = (filters, ctx = {}) => {
  if (!Array.isArray(filters) || filters.length === 0) return {};

  const clauses = filters
    .map((condition) => buildClause(condition, ctx))
    .filter(Boolean);

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
};

/** Resolves the sort spec for a field api name, honouring root vs data paths. */
export const buildSort = (sortField, sortOrder = 'desc') => {
  const dir = sortOrder === 'asc' ? 1 : -1;
  if (!sortField) return { createdAt: -1 };
  return { [pathFor(sortField)]: dir };
};

export default { buildFilterQuery, buildSort, OPERATORS, RANGE_NAMES, CURRENT_USER };
