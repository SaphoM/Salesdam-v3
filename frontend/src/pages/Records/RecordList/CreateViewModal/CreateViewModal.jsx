import styles from './CreateViewModal.module.css';
import { useState } from 'react';
import { Plus, X, Check, Users, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../../components/common/Modal/Modal';
import Button from '../../../../components/common/Button/Button';
import LookupInput from '../../../../components/forms/LookupInput/LookupInput';
import {
  CURRENT_USER,
  MAX_FILTERS,
  MULTI_VALUE_OPERATORS,
  RELATIVE_DATE_OPTIONS,
  VALUELESS_OPERATORS,
  DATE_OPERATORS,
  isRelativeDate,
  operatorsForField,
  supportsCurrentUser,
} from '../listViewConstants';

const LITERAL = '__literal';

/** Field types whose value is a record id, so they get a record picker. */
const RECORD_PICKER_TYPES = ['lookup', 'master_detail', 'user'];

const isRecordPicker = (meta) => RECORD_PICKER_TYPES.includes(meta?.type);

/** The object a relationship field points at. `user` fields target workspace users. */
const targetObjectFor = (meta) =>
  meta?.type === 'user' ? 'user' : meta?.lookupObjectApiName;

const emptyCondition = () => ({ field: '', operator: 'eq', value: '' });

/** Renders a stored value in the text box the user edits it in. */
const toInputValue = (value) =>
  Array.isArray(value) ? value.join(', ') : (value ?? '');

/** Normalises a stored value to the list shape the multi-value editors use. */
const toValueList = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

/** A fresh value of the right shape for the operator being switched to. */
const blankValueFor = (operator) =>
  MULTI_VALUE_OPERATORS.includes(operator) ? [] : '';

/** Turns the edited value back into the shape the API expects. */
const toApiValue = (condition) => {
  if (VALUELESS_OPERATORS.includes(condition.operator)) return undefined;
  if (MULTI_VALUE_OPERATORS.includes(condition.operator)) {
    return toValueList(condition.value);
  }
  return condition.value;
};

/**
 * Create / edit / inspect a saved list view.
 *
 * Filtering lives entirely in saved views now, so this is the only filter
 * builder in the record list. Columns and sort are captured from whatever the
 * caller resolved as current, so "save as view" freezes what you're looking at.
 *
 * @param {object|null} view     - existing view when editing, null when creating
 * @param {boolean} readOnly     - inspect a view you can't change (standard views)
 * @param {Array} filterableFields - field descriptors valid as filter targets
 * @param {Array} initialColumns - ordered apiNames the saved view should use
 * @param {object} initialSort   - { field, order }
 * @param {Function} onSubmit    - receives the API payload
 * @param {boolean} saving
 * @param {Function} onClose
 */
const CreateViewModal = ({
  view,
  readOnly = false,
  filterableFields,
  initialColumns,
  initialSort,
  onSubmit,
  saving,
  onClose,
}) => {
  const isEdit = !!view && !readOnly;
  const [name, setName] = useState(view?.name || '');
  // New views are shared by default — a saved view is nearly always meant for the
  // team. Editing an existing one keeps whatever it was saved with.
  const [isShared, setIsShared] = useState(view ? !!view.isShared : true);
  const [conditions, setConditions] = useState(() =>
    view?.filters?.length > 0
      ? view.filters.map((c) => ({
          field: c.field,
          operator: c.operator || 'eq',
          value: MULTI_VALUE_OPERATORS.includes(c.operator)
            ? toValueList(c.value)
            : (c.value ?? ''),
        }))
      : [emptyCondition()],
  );

  const fieldFor = (apiName) =>
    filterableFields.find((f) => f.apiName === apiName);

  const patch = (index, changes) =>
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...changes } : c)),
    );

  const handleFieldChange = (index, apiName) => {
    const allowed = operatorsForField(fieldFor(apiName));
    const operator = allowed[0]?.value || 'eq';
    patch(index, { field: apiName, operator, value: blankValueFor(operator) });
  };

  const handleOperatorChange = (index, operator) => {
    // A value carried over from a different operator family is never valid.
    patch(index, { operator, value: blankValueFor(operator) });
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('View name is required.');
      return;
    }

    const filters = conditions
      .filter((c) => c.field)
      .map((c) => ({ field: c.field, operator: c.operator, value: toApiValue(c) }))
      .filter(
        (c) =>
          VALUELESS_OPERATORS.includes(c.operator) ||
          (Array.isArray(c.value) ? c.value.length > 0 : c.value !== ''),
      );

    if (filters.length > MAX_FILTERS) {
      toast.error(`A view can have at most ${MAX_FILTERS} filters.`);
      return;
    }

    onSubmit({
      name: trimmed,
      filters,
      columns: initialColumns || [],
      sortField: initialSort?.field || null,
      sortOrder: initialSort?.order === 'asc' ? 'asc' : 'desc',
      isShared,
    });
  };

  /** Repeatable record picker for `is any of` / `is none of` on a relationship. */
  const renderRecordList = (cond, i, meta) => {
    const list = toValueList(cond.value);
    const targetObject = targetObjectFor(meta);
    const displayField = meta.lookupDisplayField || 'name';

    return (
      <div className={styles.multiValue}>
        {list.length === 0 && readOnly && (
          <span className={styles.noValue}>no values</span>
        )}
        {list.map((id, vi) => (
          <div key={vi} className={styles.multiValueRow}>
            <LookupInput
              value={id}
              objectApiName={targetObject}
              displayField={displayField}
              allowCreate={false}
              disabled={readOnly}
              placeholder={`Select ${targetObject}...`}
              onChange={(next) =>
                patch(i, {
                  value: list.map((v, k) => (k === vi ? next : v)),
                })
              }
            />
            {!readOnly && (
              <button
                type="button"
                className={styles.removeCondBtn}
                title="Remove value"
                onClick={() =>
                  patch(i, { value: list.filter((_, k) => k !== vi) })
                }
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            className={styles.addValueBtn}
            onClick={() => patch(i, { value: [...list, ''] })}
          >
            <Plus size={13} /> Add value
          </button>
        )}
      </div>
    );
  };

  /** Checkbox list for `is any of` / `is none of` on a picklist. */
  const renderChoiceList = (cond, i, meta) => {
    const list = toValueList(cond.value);
    const options = (meta.picklistValues || []).filter(
      (pv) => pv.isActive !== false || list.includes(pv.value),
    );

    const toggle = (value, checked) =>
      patch(i, {
        value: checked ? [...list, value] : list.filter((v) => v !== value),
      });

    if (options.length === 0) {
      return (
        <input
          type="text"
          className={styles.filterInput}
          value={toInputValue(cond.value)}
          placeholder="value1, value2"
          title="Comma-separated list of values"
          readOnly={readOnly}
          onChange={(e) => patch(i, { value: e.target.value })}
        />
      );
    }

    return (
      <div className={styles.choiceList}>
        {options.map((pv) => (
          <label key={pv.value} className={styles.choiceOption}>
            <input
              type="checkbox"
              checked={list.includes(pv.value)}
              disabled={readOnly}
              onChange={(e) => toggle(pv.value, e.target.checked)}
            />
            <span>{pv.label || pv.value}</span>
          </label>
        ))}
      </div>
    );
  };

  const renderValueEditor = (cond, i) => {
    const meta = fieldFor(cond.field);

    if (VALUELESS_OPERATORS.includes(cond.operator)) {
      return <span className={styles.noValue}>no value needed</span>;
    }

    if (DATE_OPERATORS.includes(cond.operator)) {
      const mode = isRelativeDate(cond.value) ? cond.value : LITERAL;
      return (
        <div className={styles.valueGroup}>
          <select
            className={styles.filterSelect}
            value={mode}
            disabled={readOnly}
            onChange={(e) =>
              patch(i, {
                value: e.target.value === LITERAL ? '' : e.target.value,
              })
            }
          >
            {RELATIVE_DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            <option value={LITERAL}>Specific date...</option>
          </select>
          {mode === LITERAL && (
            <input
              type="date"
              className={styles.filterInput}
              value={cond.value || ''}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => patch(i, { value: e.target.value })}
            />
          )}
        </div>
      );
    }

    // Relationship fields resolve to a record id, so pick the record rather than
    // asking anyone to paste an id.
    if (isRecordPicker(meta) && targetObjectFor(meta)) {
      if (MULTI_VALUE_OPERATORS.includes(cond.operator)) {
        return renderRecordList(cond, i, meta);
      }

      const isMe = cond.value === CURRENT_USER;
      return (
        <div className={styles.valueGroup}>
          {isMe ? (
            <input
              type="text"
              className={styles.filterInput}
              value="Current user"
              readOnly
            />
          ) : (
            <LookupInput
              value={cond.value ?? ''}
              objectApiName={targetObjectFor(meta)}
              displayField={meta.lookupDisplayField || 'name'}
              allowCreate={false}
              disabled={readOnly}
              placeholder={`Select ${targetObjectFor(meta)}...`}
              onChange={(id) => patch(i, { value: id })}
            />
          )}
          {supportsCurrentUser(meta) && !readOnly && (
            <button
              type="button"
              className={`${styles.meBtn} ${isMe ? styles.meBtnActive : ''}`}
              title="Match whoever is viewing the list"
              onClick={() => patch(i, { value: isMe ? '' : CURRENT_USER })}
            >
              Me
            </button>
          )}
        </div>
      );
    }

    if (MULTI_VALUE_OPERATORS.includes(cond.operator)) {
      if (meta?.type === 'picklist' || meta?.type === 'multipicklist') {
        return renderChoiceList(cond, i, meta);
      }
      return (
        <input
          type="text"
          className={styles.filterInput}
          value={toInputValue(cond.value)}
          placeholder="value1, value2"
          title="Comma-separated list of values"
          readOnly={readOnly}
          onChange={(e) => patch(i, { value: e.target.value })}
        />
      );
    }

    if (meta?.type === 'picklist' || meta?.type === 'multipicklist') {
      return (
        <select
          className={styles.filterSelect}
          value={cond.value ?? ''}
          disabled={readOnly}
          onChange={(e) => patch(i, { value: e.target.value })}
        >
          <option value="">Select value...</option>
          {(meta.picklistValues || []).map((pv) => (
            <option key={pv.value} value={pv.value}>
              {pv.label}
            </option>
          ))}
        </select>
      );
    }

    if (['number', 'currency', 'percent', 'rollup_summary'].includes(meta?.type)) {
      return (
        <input
          type="number"
          className={styles.filterInput}
          value={cond.value ?? ''}
          placeholder="0"
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => patch(i, { value: e.target.value })}
        />
      );
    }

    const isMe = cond.value === CURRENT_USER;
    return (
      <div className={styles.valueGroup}>
        <input
          type="text"
          className={styles.filterInput}
          value={isMe ? 'Current user' : (cond.value ?? '')}
          placeholder="Value..."
          readOnly={isMe || readOnly}
          onChange={(e) => patch(i, { value: e.target.value })}
        />
        {supportsCurrentUser(meta) && !readOnly && (
          <button
            type="button"
            className={`${styles.meBtn} ${isMe ? styles.meBtnActive : ''}`}
            title="Match whoever is viewing the list"
            onClick={() => patch(i, { value: isMe ? '' : CURRENT_USER })}
          >
            Me
          </button>
        )}
      </div>
    );
  };

  const title = readOnly
    ? `${view?.name || 'List view'} — filters`
    : isEdit
      ? `Edit "${view.name}"`
      : 'New List View';

  const hasConditions = conditions.some((c) => c.field);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        readOnly ? (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              icon={<Check size={13} />}
              loading={saving}
              onClick={handleSave}
            >
              {isEdit ? 'Save Changes' : 'Save View'}
            </Button>
          </>
        )
      }
    >
      <div className={styles.form}>
        {readOnly && (
          <div className={styles.readOnlyNote}>
            <Lock size={13} />
            <span>
              This is a standard view, so its filters can&apos;t be changed. Use
              <strong> New List View</strong> to build your own from these
              conditions.
            </span>
          </div>
        )}

        {!readOnly && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="listViewName">
              View Name *
            </label>
            <input
              id="listViewName"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Priority, Open This Month..."
              autoFocus
              maxLength={80}
            />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Filter Conditions</label>
          <div className={styles.filterBody}>
            {readOnly && !hasConditions ? (
              <span className={styles.noValue}>
                No filters — this view shows every record.
              </span>
            ) : (
              conditions.map((cond, i) => (
                <div key={i} className={styles.conditionRow}>
                  <select
                    className={styles.filterSelect}
                    value={cond.field}
                    disabled={readOnly}
                    onChange={(e) => handleFieldChange(i, e.target.value)}
                  >
                    <option value="">Select field...</option>
                    {filterableFields.map((f) => (
                      <option key={f.apiName} value={f.apiName}>
                        {f.label || f.apiName}
                      </option>
                    ))}
                    {/* A standard view can filter on a field that isn't in the
                        filterable catalog (e.g. is_converted); show it anyway
                        rather than rendering a blank select. */}
                    {cond.field && !fieldFor(cond.field) && (
                      <option value={cond.field}>{cond.field}</option>
                    )}
                  </select>

                  <select
                    className={styles.filterSelect}
                    value={cond.operator}
                    disabled={readOnly || !cond.field}
                    onChange={(e) => handleOperatorChange(i, e.target.value)}
                  >
                    {operatorsForField(fieldFor(cond.field)).map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                    {/* Same reason as above — keep an operator the standard view
                        uses even if it isn't offered for this field type. */}
                    {cond.operator &&
                      !operatorsForField(fieldFor(cond.field)).some(
                        (op) => op.value === cond.operator,
                      ) && (
                        <option value={cond.operator}>{cond.operator}</option>
                      )}
                  </select>

                  {renderValueEditor(cond, i)}

                  {!readOnly && (
                    <button
                      type="button"
                      className={styles.removeCondBtn}
                      title="Remove condition"
                      onClick={() =>
                        setConditions((prev) =>
                          prev.length > 1
                            ? prev.filter((_, idx) => idx !== i)
                            : [emptyCondition()],
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))
            )}

            {!readOnly && (
              <button
                type="button"
                className={styles.addCondBtn}
                disabled={conditions.length >= MAX_FILTERS}
                onClick={() =>
                  setConditions((prev) => [...prev, emptyCondition()])
                }
              >
                <Plus size={14} /> Add condition
              </button>
            )}
          </div>
          {!readOnly && (
            <span className={styles.hint}>
              Leave empty to show every record. Up to {MAX_FILTERS} conditions,
              all of which must match.
            </span>
          )}
          {readOnly && hasConditions && (
            <span className={styles.hint}>
              All of these conditions must match for a record to appear.
            </span>
          )}
        </div>

        {!readOnly && (
          <label className={styles.shareRow}>
            <input
              type="checkbox"
              className={styles.shareCheck}
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
            />
            <span className={styles.shareText}>
              <span className={styles.shareTitle}>
                <Users size={14} />
                Share with workspace
              </span>
              <span className={styles.shareHint}>
                Everyone can use it; only you can change it.
              </span>
            </span>
          </label>
        )}

        {readOnly ? (
          <div className={styles.summary}>
            Shows {view?.columns?.length || 0} column
            {view?.columns?.length === 1 ? '' : 's'}
            {view?.sortField
              ? `, sorted by ${view.sortField} (${view.sortOrder === 'asc' ? 'ascending' : 'descending'})`
              : ''}
            . Use the Columns button on the list to change what you see without
            changing the view.
          </div>
        ) : (
          <div className={styles.summary}>
            Saves the {initialColumns?.length || 0} column
            {initialColumns?.length === 1 ? '' : 's'} currently shown, in their
            current order
            {initialSort?.field
              ? `, sorted by ${initialSort.field} (${initialSort.order === 'asc' ? 'ascending' : 'descending'})`
              : ''}
            . Use the Columns button to change them before saving.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateViewModal;
