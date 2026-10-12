/**
 * Shared constants for the record-list saved-view UI.
 *
 * These mirror the server contract in `backend/services/listViewService.js` and
 * `backend/controllers/listViewController.js`. Anything the server would reject
 * with a 400 must not be selectable here.
 */

/** Record keys that are never useful as a visible column. */
export const SYSTEM_FIELDS = [
  '_id',
  'id',
  'tenantId',
  'objectId',
  'isDeleted',
  'objectApiName',
];

/** Server-enforced ceilings (listViewController.js). */
export const MAX_COLUMNS = 30;
export const MAX_FILTERS = 20;

/** Sentinel the server resolves to the requesting user. */
export const CURRENT_USER = '@me';

/**
 * Root document columns. They are not FieldMeta rows but the server accepts
 * them as filter / sort / column targets, so they get synthetic field
 * descriptors here.
 */
export const ROOT_COLUMNS = [
  { apiName: 'createdAt', label: 'Created Date', type: 'datetime' },
  { apiName: 'updatedAt', label: 'Last Modified Date', type: 'datetime' },
  { apiName: 'ownerId', label: 'Owner', type: 'user' },
  { apiName: 'createdBy', label: 'Created By', type: 'user' },
  { apiName: 'lastModifiedBy', label: 'Last Modified By', type: 'user' },
].map((f) => ({ ...f, isRoot: true, isReadOnly: true }));

const ROOT_COLUMN_NAMES = ROOT_COLUMNS.map((f) => f.apiName);

/** True for the synthetic root columns above. */
export const isRootColumn = (apiName) => ROOT_COLUMN_NAMES.includes(apiName);

/**
 * Every operator the server accepts, with a human label. The `value` strings
 * must stay in sync with `OPERATORS` in backend/services/listViewService.js.
 */
export const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'ne', label: 'not equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less or equal' },
  { value: 'in', label: 'is any of' },
  { value: 'not_in', label: 'is none of' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'is_true', label: 'is checked' },
  { value: 'is_false', label: 'is not checked' },
  { value: 'date_is', label: 'is on' },
  { value: 'date_before', label: 'is before' },
  { value: 'date_after', label: 'is after' },
];

export const OPERATOR_LABELS = OPERATORS.reduce((acc, op) => {
  acc[op.value] = op.label;
  return acc;
}, {});

/** Operators that take no value at all. */
export const VALUELESS_OPERATORS = [
  'is_empty',
  'is_not_empty',
  'is_true',
  'is_false',
];

/** Operators whose value may be a literal date or a relative-range name. */
export const DATE_OPERATORS = ['date_is', 'date_before', 'date_after'];

/** Operators whose value is a list. */
export const MULTI_VALUE_OPERATORS = ['in', 'not_in'];

/**
 * Named relative ranges accepted as the value of a date operator
 * (RANGE_NAMES in backend/services/listViewService.js).
 */
export const RELATIVE_DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This week' },
  { value: 'next_7_days', label: 'Next 7 days' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_year', label: 'This year' },
];

const RELATIVE_DATE_NAMES = RELATIVE_DATE_OPTIONS.map((o) => o.value);

export const isRelativeDate = (value) => RELATIVE_DATE_NAMES.includes(value);

/** Field types that can't meaningfully be filtered on. */
const NON_FILTERABLE_TYPES = ['richtext', 'address'];

/**
 * Kept for backwards compatibility with the old FilterPanel export. Prefer
 * `isFilterableField`, which allows far more types than the original five.
 */
export const FILTERABLE_TYPES = [
  'text',
  'textarea',
  'number',
  'currency',
  'percent',
  'date',
  'datetime',
  'time',
  'boolean',
  'picklist',
  'multipicklist',
  'lookup',
  'master_detail',
  'email',
  'phone',
  'url',
  'formula',
  'auto_number',
  'rollup_summary',
  'user',
];

export const isFilterableField = (field) =>
  !!field &&
  !SYSTEM_FIELDS.includes(field.apiName) &&
  !NON_FILTERABLE_TYPES.includes(field.type);

const pick = (...values) =>
  OPERATORS.filter((op) => values.includes(op.value)).sort(
    (a, b) => values.indexOf(a.value) - values.indexOf(b.value),
  );

const TEXT_OPS = pick(
  'eq',
  'ne',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'in',
  'not_in',
  'is_empty',
  'is_not_empty',
);
const NUMBER_OPS = pick(
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_empty',
  'is_not_empty',
);
const DATE_OPS = pick(
  'date_is',
  'date_before',
  'date_after',
  'is_empty',
  'is_not_empty',
);
const BOOLEAN_OPS = pick('is_true', 'is_false');
const CHOICE_OPS = pick('eq', 'ne', 'in', 'not_in', 'is_empty', 'is_not_empty');

/**
 * The operators that make sense for a given field, so the builder can't offer
 * `starts_with` on a checkbox.
 */
export const operatorsForField = (field) => {
  switch (field?.type) {
    case 'number':
    case 'currency':
    case 'percent':
    case 'rollup_summary':
      return NUMBER_OPS;
    case 'date':
    case 'datetime':
      return DATE_OPS;
    case 'boolean':
      return BOOLEAN_OPS;
    case 'picklist':
    case 'multipicklist':
      return CHOICE_OPS;
    case 'lookup':
    case 'master_detail':
    case 'user':
      return CHOICE_OPS;
    default:
      return TEXT_OPS;
  }
};

/** Field types whose value can be "the current user". */
export const supportsCurrentUser = (field) =>
  ['lookup', 'master_detail', 'user'].includes(field?.type);

/**
 * Renders a saved condition as a short human string, for chips and tooltips.
 */
export const describeCondition = (condition, field) => {
  const label = field?.label || condition?.field || '';
  const op = OPERATOR_LABELS[condition?.operator] || condition?.operator || '';
  if (VALUELESS_OPERATORS.includes(condition?.operator)) {
    return `${label} ${op}`;
  }
  const raw = Array.isArray(condition?.value)
    ? condition.value.join(', ')
    : condition?.value;
  const value =
    raw === CURRENT_USER
      ? 'current user'
      : isRelativeDate(raw)
        ? RELATIVE_DATE_OPTIONS.find((o) => o.value === raw).label.toLowerCase()
        : raw;
  return `${label} ${op} ${value ?? ''}`.trim();
};
