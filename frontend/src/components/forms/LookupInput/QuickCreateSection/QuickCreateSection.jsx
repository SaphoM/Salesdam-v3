import QuickCreateField from '../QuickCreateField/QuickCreateField';
import styles from '../QuickCreateForm/QuickCreateForm.module.css';

export default function QuickCreateSection({
  section,
  createData,
  errors = {},
  onFieldChange,
}) {
  const { fields } = section;

  // Separate full-width fields (textarea, richtext) from regular fields
  const regularFields = fields.filter(
    (f) => !['textarea', 'richtext'].includes(f.type)
  );
  const fullWidthFields = fields.filter((f) =>
    ['textarea', 'richtext'].includes(f.type)
  );

  // Split regular fields into two columns
  const leftFields = regularFields.filter((_, idx) => idx % 2 === 0);
  const rightFields = regularFields.filter((_, idx) => idx % 2 !== 0);

  // Wraps a field so a server-side rejection can be shown without every
  // QuickCreateField branch needing its own error handling — the marker on the
  // wrapper recolours whichever control the field type rendered.
  const renderField = (field) => {
    const error = errors[field.apiName];
    return (
      <div
        key={field.apiName}
        className={styles.qcFieldWrap}
        data-error={error ? 'true' : undefined}
      >
        <QuickCreateField
          field={field}
          value={createData[field.apiName]}
          onChange={onFieldChange}
        />
        {error && (
          <span className={styles.qcError} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{section.label}</h3>
      {regularFields.length > 0 && (
        <div className={styles.fieldGrid}>
          <div className={styles.column}>{leftFields.map(renderField)}</div>
          <div className={styles.column}>{rightFields.map(renderField)}</div>
        </div>
      )}
      {fullWidthFields.length > 0 && (
        <div className={styles.fullWidthFields}>
          {fullWidthFields.map(renderField)}
        </div>
      )}
    </div>
  );
}
