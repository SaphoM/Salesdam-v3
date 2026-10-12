import styles from './FieldModal.module.css';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createField, updateField, getAllFields } from '../../../services/api/objects';

import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import ObjectPickerInput from '../../../components/forms/ObjectPickerInput/ObjectPickerInput';
import ValidationBuilder from '../../../components/common/ValidationBuilder/ValidationBuilder';
import FormulaEditor from '../../../components/common/FormulaEditor/FormulaEditor';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percent', label: 'Percent' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date/Time' },
  { value: 'boolean', label: 'Checkbox' },
  { value: 'picklist', label: 'Picklist' },
  { value: 'multipicklist', label: 'Multi-select' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'auto_number', label: 'Auto Number' },
  { value: 'lookup', label: 'Lookup' },
  { value: 'formula', label: 'Formula' },
  { value: 'rollup_summary', label: 'Rollup Summary' },
];

// Mirrors the FieldMeta.formulaReturnType enum. The return type decides how the
// computed value is stored and rendered, and which functions and examples the
// formula editor offers.
const FORMULA_RETURN_TYPES = [
  { value: 'number',   label: 'Number',            hint: 'A plain number — counts, quantities, day differences.' },
  { value: 'currency', label: 'Currency',          hint: 'A number rendered with the currency symbol.' },
  { value: 'percent',  label: 'Percent',           hint: 'A number rendered with a % suffix.' },
  { value: 'text',     label: 'Text',              hint: 'Text — joined names, labels, formatted strings.' },
  { value: 'date',     label: 'Date',              hint: 'A date value.' },
  { value: 'boolean',  label: 'Checkbox (Yes/No)', hint: 'True or false.' },
];

const BLANK = {
  label: '',
  apiName: '',
  type: 'text',
  helpText: '',
  defaultValue: '',
  picklistValues: [],
  lookupObjectApiName: '',
  lookupDisplayField: 'name',
  // Matches the FieldMeta model path. It was previously `formulaExpression`,
  // which the backend silently discarded, so formula fields always opened blank.
  formula: '',
  formulaReturnType: 'number',
  rollupObjectApiName: '',
  // The relationship field on the child object that points back at this record.
  // Without it a rollup matches no children and silently evaluates to blank,
  // which is what happened before this was exposed in the UI.
  rollupRelationField: '',
  rollupType: '',
  rollupField: '',
  rollupFilter: '',
  isHidden: false,
  autoNumberPrefix: '',
  autoNumberPadding: 4,
  autoNumberStartAt: 1,
  validations: {},
};

const ROLLUP_TYPES = [
  { value: 'COUNT', label: 'Count — number of child records' },
  { value: 'SUM', label: 'Sum — total of a numeric field' },
  { value: 'MIN', label: 'Min — smallest value' },
  { value: 'MAX', label: 'Max — largest value' },
  { value: 'AVG', label: 'Average — mean value' },
];

// Only numeric-valued fields can be aggregated (COUNT aggregates nothing).
const ROLLUP_AGGREGATABLE_TYPES = ['number', 'currency', 'percent', 'formula'];

// System fields are managed by the platform — the backend rejects any other key
// with a 403, so the payload must be narrowed to exactly these.
const SYSTEM_FIELD_EDITABLE_KEYS = ['label', 'helpText'];

const FieldModal = ({
  isOpen,
  onClose,
  editingField,
  objectApiName,
  fields = [],
  allObjects = [],
  onFieldSaved,
}) => {
  const [fieldForm, setFieldForm] = useState(BLANK);
  const [picklistInput, setPicklistInput] = useState('');
  // Every field in the tenant. A rollup needs to reason across objects — which
  // ones are detail children of this one, and through which relationship — so
  // this is fetched once rather than per candidate object.
  const [allTenantFields, setAllTenantFields] = useState(null);

  const safeFields = Array.isArray(fields) ? fields : [];
  const safeObjects = Array.isArray(allObjects) ? allObjects : [];

  // System fields are read-only apart from label and help text.
  const isSystemField = !!editingField?.isSystem;

  useEffect(() => {
    if (!isOpen) return;

    setFieldForm(
      editingField
        ? {
            ...BLANK,
            ...editingField,
            // Tolerate documents that still carry the legacy alias so the
            // expression shows up either way.
            formula: editingField.formula ?? editingField.formulaExpression ?? '',
            // Formula fields created before return types existed have none
            // stored. Don't let BLANK's default silently retype them — leave it
            // empty so the admin has to make the call.
            formulaReturnType: editingField.formulaReturnType ?? '',
          }
        : BLANK,
    );

    setPicklistInput('');
  }, [isOpen, editingField]);

  // A formula can't reference itself, so the field being edited is kept out of
  // the editor's Fields palette.
  const formulaSourceFields = safeFields.filter(
    (f) => f.apiName !== editingField?.apiName,
  );

  const isRollup = fieldForm.type === 'rollup_summary';
  const rollupChildObject = isRollup ? fieldForm.rollupObjectApiName : '';

  useEffect(() => {
    if (!isOpen || !isRollup) return;

    let cancelled = false;
    getAllFields().then((f) => {
      if (!cancelled) setAllTenantFields(Array.isArray(f) ? f : []);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isRollup]);

  const loadingRelationships = isRollup && allTenantFields === null;

  /**
   * A rollup summary only makes sense over records that belong to this one, the
   * way a Salesforce master-detail child does. Here that is expressed by a
   * lookup with cascadeDelete — the child is deleted with its parent, so the
   * aggregate can never include orphaned rows.
   */
  const detailRelationships = (allTenantFields || []).filter(
    (f) =>
      ['lookup', 'master_detail'].includes(f.type) &&
      f.lookupObjectApiName === objectApiName &&
      f.cascadeDelete === true,
  );

  // Objects offered as the summarised object: only those with such a relationship.
  const detailObjectApiNames = new Set(
    detailRelationships.map((f) => f.objectApiName),
  );
  const rollupChildObjectOptions = safeObjects.filter((o) =>
    detailObjectApiNames.has(o.apiName),
  );

  const rollupRelationCandidates = detailRelationships.filter(
    (f) => f.objectApiName === rollupChildObject,
  );

  const rollupAggCandidates = (allTenantFields || []).filter(
    (f) =>
      f.objectApiName === rollupChildObject &&
      ROLLUP_AGGREGATABLE_TYPES.includes(f.type),
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFieldForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'label' && !editingField) {
        updated.apiName = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
      }

      return updated;
    });
  };

  // ── Picklist ─────────────────────────────
  const addPicklistValue = () => {
    if (!picklistInput.trim()) return;

    setFieldForm((p) => ({
      ...p,
      picklistValues: [
        ...(p.picklistValues || []),
        { label: picklistInput, value: picklistInput },
      ],
    }));

    setPicklistInput('');
  };

  const removePicklistValue = (i) => {
    setFieldForm((p) => ({
      ...p,
      picklistValues: (p.picklistValues || []).filter((_, idx) => idx !== i),
    }));
  };

  // ── Save ─────────────────────────────
  const handleSave = async () => {
    if (!fieldForm.label || !fieldForm.apiName) {
      toast.error('Label and API Name are required');
      return;
    }

    if (fieldForm.type === 'formula' && !isSystemField) {
      if (!fieldForm.formulaReturnType) {
        toast.error('Choose a return type for the formula');
        return;
      }
      if (!fieldForm.formula?.trim()) {
        toast.error('Enter a formula expression');
        return;
      }
    }

    try {
      if (editingField) {
        // For a system field send only the two editable keys. Posting the whole
        // form made the backend reject the request outright with a 403.
        const payload = isSystemField
          ? SYSTEM_FIELD_EDITABLE_KEYS.reduce((acc, key) => {
              if (fieldForm[key] !== undefined) acc[key] = fieldForm[key];
              return acc;
            }, {})
          : fieldForm;
        await updateField(objectApiName, editingField.apiName, payload);
      } else {
        await createField(objectApiName, fieldForm);
      }

      onFieldSaved?.(fieldForm, !!editingField);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    }
  };

  const hideDefaultValue = [
    'auto_number',
    'lookup',
    'formula',
    'rollup_summary',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingField ? `Edit Field: ${editingField.label}` : 'New Field'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Field</Button>
        </>
      }
    >
      {editingField?.isSystem && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '14px',
          color: '#92400e',
        }}>
          <strong>System Field:</strong> Only the label and help text can be edited. Other properties are protected to maintain system integrity.
        </div>
      )}

      <div className={styles.grid}>
        {/* ── BASIC ───────────────────────────── */}
        <div className={styles.field}>
          <label className={styles.label}>Label *</label>
          <input
            name="label"
            value={fieldForm.label}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>API Name *</label>
          <input
            name="apiName"
            value={fieldForm.apiName}
            onChange={handleChange}
            disabled={!!editingField}
            className={styles.input}
          />
        </div>

        <div className={`${styles.field} ${styles.full}`}>
          <label className={styles.label}>Help Text</label>
          <input
            name="helpText"
            value={fieldForm.helpText}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Type *</label>
          <select
            name="type"
            value={fieldForm.type}
            onChange={handleChange}
            disabled={!!editingField || editingField?.isSystem}
            className={styles.select}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Everything below is locked for system fields. A disabled fieldset
            disables every descendant control natively, so nested components
            (pickers, formula editor, validation builder) need no changes. */}
        <fieldset
          className={styles.lockGroup}
          disabled={isSystemField}
          aria-disabled={isSystemField}
        >
        {/* ── DEFAULT VALUE ───────────────────────────── */}
        {!hideDefaultValue.includes(fieldForm.type) && (
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Default Value</label>

            {fieldForm.type === 'boolean' ? (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={!!fieldForm.defaultValue}
                  onChange={(e) =>
                    setFieldForm((p) => ({
                      ...p,
                      defaultValue: e.target.checked,
                    }))
                  }
                />
                Default checked
              </label>
            ) : (
              <input
                className={styles.input}
                value={fieldForm.defaultValue || ''}
                onChange={(e) =>
                  setFieldForm((p) => ({
                    ...p,
                    defaultValue: e.target.value,
                  }))
                }
              />
            )}
          </div>
        )}

        {/* ── PICKLIST ───────────────────────────── */}
        {['picklist', 'multipicklist'].includes(fieldForm.type) && (
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Picklist Values</label>

            <div className={styles.picklistInput}>
              <input
                value={picklistInput}
                onChange={(e) => setPicklistInput(e.target.value)}
                className={styles.input}
              />
              <Button size="sm" onClick={addPicklistValue}>
                Add
              </Button>
            </div>

            <div className={styles.picklistValues}>
              {(fieldForm.picklistValues || []).map((pv, i) => (
                <div key={i} className={styles.picklistItem}>
                  {pv.label}
                  <button onClick={() => removePicklistValue(i)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOOKUP ───────────────────────────── */}
        {fieldForm.type === 'lookup' && (
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Lookup To</label>

            <ObjectPickerInput
              value={fieldForm.lookupObjectApiName || ''}
              onChange={(v) =>
                setFieldForm((p) => ({ ...p, lookupObjectApiName: v }))
              }
              objects={safeObjects}
            />
          </div>
        )}

        {/* ── FORMULA ───────────────────────────── */}
        {fieldForm.type === 'formula' && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Return Type *</label>
              <select
                name="formulaReturnType"
                value={fieldForm.formulaReturnType || ''}
                onChange={handleChange}
                className={styles.select}
              >
                {!fieldForm.formulaReturnType && (
                  <option value="">Select a return type…</option>
                )}
                {FORMULA_RETURN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className={styles.hint}>
                {FORMULA_RETURN_TYPES.find(
                  (t) => t.value === fieldForm.formulaReturnType,
                )?.hint || 'How the calculated value is stored and displayed.'}
              </p>
            </div>

            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>Formula</label>

              <FormulaEditor
                objectApiName={objectApiName}
                expression={fieldForm.formula || ''}
                availableFields={formulaSourceFields}
                onExpressionChange={(expr) =>
                  setFieldForm((p) => ({ ...p, formula: expr }))
                }
                // Drives the function list, examples and placeholder, and is
                // checked against the expression by the live validator.
                returnType={fieldForm.formulaReturnType || ''}
                excludeFieldApiName={editingField?.apiName || ''}
                // A formula field computes a value; it has nothing to fail. The
                // error message belongs to validation rules only.
                hideErrorMessage
              />
            </div>
          </>
        )}

        {/* ── ROLLUP ───────────────────────────── */}
        {fieldForm.type === 'rollup_summary' && (
          <>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>
                Summarised Object (child records) *
              </label>
              <ObjectPickerInput
                value={fieldForm.rollupObjectApiName || ''}
                onChange={(v) =>
                  setFieldForm((p) => ({
                    ...p,
                    rollupObjectApiName: v,
                    // The relationship and aggregated field belong to the old
                    // child object, so they cannot carry over.
                    rollupRelationField: '',
                    rollupField: '',
                  }))
                }
                objects={rollupChildObjectOptions}
              />
              <small className={styles.hint}>
                {loadingRelationships
                  ? 'Loading related objects…'
                  : rollupChildObjectOptions.length === 0
                    ? `No object is a detail child of ${objectApiName}. Only objects with a cascade-delete lookup to ${objectApiName} can be summarised.`
                    : `Only objects whose records are deleted with their ${objectApiName} (cascade-delete lookup) can be summarised.`}
              </small>
            </div>

            {fieldForm.rollupObjectApiName && (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>Related Via *</label>
                  <select
                    className={styles.select}
                    value={fieldForm.rollupRelationField || ''}
                    onChange={(e) =>
                      setFieldForm((p) => ({
                        ...p,
                        rollupRelationField: e.target.value,
                      }))
                    }
                  >
                    <option value="">
                      {loadingRelationships ? 'Loading…' : 'Select relationship…'}
                    </option>
                    {rollupRelationCandidates.map((f) => (
                      <option key={f.apiName} value={f.apiName}>
                        {f.label} ({f.apiName})
                      </option>
                    ))}
                  </select>
                  <small className={styles.hint}>
                    The cascade-delete lookup on {fieldForm.rollupObjectApiName}{' '}
                    that points back to this {objectApiName}.
                  </small>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Aggregate *</label>
                  <select
                    className={styles.select}
                    value={fieldForm.rollupType || ''}
                    onChange={(e) =>
                      setFieldForm((p) => ({ ...p, rollupType: e.target.value }))
                    }
                  >
                    <option value="">Select aggregate…</option>
                    {ROLLUP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {fieldForm.rollupType && fieldForm.rollupType !== 'COUNT' && (
                  <div className={styles.field}>
                    <label className={styles.label}>Field to Aggregate *</label>
                    <select
                      className={styles.select}
                      value={fieldForm.rollupField || ''}
                      onChange={(e) =>
                        setFieldForm((p) => ({
                          ...p,
                          rollupField: e.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {loadingRelationships ? 'Loading…' : 'Select field…'}
                      </option>
                      {rollupAggCandidates.map((f) => (
                        <option key={f.apiName} value={f.apiName}>
                          {f.label} ({f.type})
                        </option>
                      ))}
                    </select>
                    <small className={styles.hint}>
                      Number, currency, percent and formula fields can be
                      aggregated.
                    </small>
                  </div>
                )}

                <div className={`${styles.field} ${styles.full}`}>
                  <label className={styles.label}>
                    Filter Criteria (optional)
                  </label>
                  <input
                    className={styles.input}
                    value={fieldForm.rollupFilter || ''}
                    onChange={(e) =>
                      setFieldForm((p) => ({
                        ...p,
                        rollupFilter: e.target.value,
                      }))
                    }
                    placeholder='e.g. quantity > 0 AND status == "active"'
                  />
                  <small className={styles.hint}>
                    Only child records matching this expression are included.
                    Written against the child object&apos;s fields.
                  </small>
                </div>
              </>
            )}
          </>
        )}

        {/* ── HELPER FIELD ───────────────────────────── */}
        <label className={`${styles.full} ${styles.toggleCard}`}>
          <input
            type="checkbox"
            name="isHidden"
            className={styles.toggleInput}
            checked={!!fieldForm.isHidden}
            onChange={handleChange}
          />
          <span className={styles.toggleText}>
            <span className={styles.toggleTitle}>
              Helper field — hide from page layouts and forms
            </span>
            <span className={styles.toggleHint}>
              The value is still stored and can be referenced by formulas and
              rollup summaries. Use for intermediate values that only exist to
              feed another calculation.
            </span>
          </span>
        </label>

        {/* ── AUTO NUMBER ──────────────────────────── */}
        {fieldForm.type === 'auto_number' && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Prefix</label>
              <input
                name="autoNumberPrefix"
                type="text"
                value={fieldForm.autoNumberPrefix || ''}
                onChange={(e) =>
                  setFieldForm((p) => ({
                    ...p,
                    autoNumberPrefix: e.target.value,
                  }))
                }
                placeholder="e.g., INV-, QUOTE-"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Padding (digits)</label>
              <input
                name="autoNumberPadding"
                type="number"
                min="1"
                max="10"
                value={fieldForm.autoNumberPadding || 4}
                onChange={(e) =>
                  setFieldForm((p) => ({
                    ...p,
                    autoNumberPadding: parseInt(e.target.value) || 4,
                  }))
                }
                className={styles.input}
              />
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                Example with padding=4: {(fieldForm.autoNumberPrefix || 'INV-')}0001, {(fieldForm.autoNumberPrefix || 'INV-')}0002
              </small>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Start At</label>
              <input
                name="autoNumberStartAt"
                type="number"
                min="1"
                value={fieldForm.autoNumberStartAt || 1}
                onChange={(e) =>
                  setFieldForm((p) => ({
                    ...p,
                    autoNumberStartAt: parseInt(e.target.value) || 1,
                  }))
                }
                className={styles.input}
              />
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                First auto-number will be: {(fieldForm.autoNumberPrefix || 'INV-')}{String(fieldForm.autoNumberStartAt || 1).padStart(fieldForm.autoNumberPadding || 4, '0')}
              </small>
            </div>
          </>
        )}

        {/* ── VALIDATION ───────────────────────────── */}
        <div className={`${styles.field} ${styles.full}`}>
          <ValidationBuilder
            field={{ ...fieldForm, objectApiName: objectApiName }}
            validations={fieldForm?.validations || {}}
            availableFields={safeFields}
            readOnly={isSystemField}
            onChange={(v) => setFieldForm((p) => ({ ...p, validations: v }))}
          />
        </div>
        </fieldset>
      </div>
    </Modal>
  );
};

export default FieldModal;
