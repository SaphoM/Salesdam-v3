import { lazy, Suspense } from 'react';
import styles from '../QuickCreateForm/QuickCreateForm.module.css';

// Lazy import to avoid circular dependency
const LookupInput = lazy(() => import('../LookupInput.jsx'));

/**
 * Renders a single field with appropriate input type
 */
export default function QuickCreateField({ field, value, onChange }) {
  const base = {
    id: field.apiName,
    className: styles.qcInput,
    value: value ?? '',
    required: field.isRequired,
  };

  const handleChange = (val) => onChange(field.apiName, val);

  switch (field.type) {
    case 'number':
    case 'currency':
    case 'percent':
      return (
        <div className={styles.qcField}>
          <label className={styles.qcLabel} htmlFor={field.apiName}>
            {field.label}
            {field.isRequired && <span className={styles.qcRequired}>*</span>}
          </label>
          <input
            type="number"
            {...base}
            onChange={(e) =>
              handleChange(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
          {field.helpText && (
            <span className={styles.qcHelpText}>{field.helpText}</span>
          )}
        </div>
      );

    case 'boolean':
      return (
        <div className={styles.qcField}>
          <label className={styles.qcCheckbox}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(e.target.checked)}
            />
            <span>{field.label}</span>
            {field.isRequired && <span className={styles.qcRequired}>*</span>}
          </label>
          {field.helpText && (
            <span className={styles.qcHelpText}>{field.helpText}</span>
          )}
        </div>
      );

    case 'date':
      return (
        <div className={styles.qcField}>
          <label className={styles.qcLabel} htmlFor={field.apiName}>
            {field.label}
            {field.isRequired && <span className={styles.qcRequired}>*</span>}
          </label>
          <input
            type="date"
            {...base}
            onChange={(e) => handleChange(e.target.value)}
          />
          {field.helpText && (
            <span className={styles.qcHelpText}>{field.helpText}</span>
          )}
        </div>
      );

    case 'datetime':
      return (
        <div className={styles.qcField}>
          <label className={styles.qcLabel} htmlFor={field.apiName}>
            {field.label}
            {field.isRequired && <span className={styles.qcRequired}>*</span>}
          </label>
          <input
            type="datetime-local"
            {...base}
            onChange={(e) => handleChange(e.target.value)}
          />
          {field.helpText && (
            <span className={styles.qcHelpText}>{field.helpText}</span>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className={styles.qcField}>
          <label className={styles.qcLabel} htmlFor={field.apiName}>
            {field.label}
            {field.isRequired && <span className={styles.qcRequired}>*</span>}
          </label>
          <textarea
            className={styles.qcInput}
            id={field.apiName}
            value={value ?? ''}
            rows={2}
            required={field.isRequired}
            onChange={(e) => handleChange(e.target.value)}
          />
          {field.helpText && (
            <span className={styles.qcHelpText}>{field.helpText}</span>
          )}
        </div>
      );

    case 'picklist': {
      const opts = field.picklistValues || [];
      return (
        <div className={styles.qcField}>
          <label className={styles.qcLabel} htmlFor={field.apiName}>
            {field.label}
            {field.isRequired && <span className={styles.qcRequired}>*</span>}
          </label>
          <select
            className={styles.qcInput}
            value={value ?? ''}
            required={field.isRequired}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="">— Select —</option>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {field.helpText && (
            <span className={styles.qcHelpText}>{field.helpText}</span>
          )}
        </div>
      );
    }

    case 'lookup':
      return (
        <div className={styles.qcField}>
          <label className={styles.qcLabel} htmlFor={field.apiName}>
            {field.label}
            {field.isRequired && <span className={styles.qcRequired}>*</span>}
          </label>
          <Suspense fallback={<input type="text" className={styles.qcInput} placeholder="Loading..." disabled />}>
            <LookupInput
              value={value || ''}
              displayValue=""
              onChange={(id) => handleChange(id)}
              objectApiName={field.lookupObjectApiName}
              displayField={field.lookupDisplayField || 'name'}
              placeholder={`Search ${field.lookupObjectApiName || 'records'}...`}
              disabled={false}
              allowCreate={false}
            />
          </Suspense>
          {field.helpText && (
            <span className={styles.qcHelpText}>{field.helpText}</span>
          )}
        </div>
      );

    default:
      return (
        <div className={styles.qcField}>
          <label className={styles.qcLabel} htmlFor={field.apiName}>
            {field.label}
            {field.isRequired && <span className={styles.qcRequired}>*</span>}
          </label>
          <input
            type="text"
            {...base}
            onChange={(e) => handleChange(e.target.value)}
          />
          {field.helpText && (
            <span className={styles.qcHelpText}>{field.helpText}</span>
          )}
        </div>
      );
  }
}
