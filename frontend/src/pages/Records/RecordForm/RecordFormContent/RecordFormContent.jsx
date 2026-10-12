import Field from '../../../../components/common/Field/Field';
import { interleaveColumns } from '../../RecordDetail/utils/layoutUtils';
import styles from '../RecordForm.module.css';

const RecordFormContent = ({
  sections,
  fields,
  formData,
  errors,
  perms,
  onFieldChange,
  onSubmit,
}) => {
  const getFieldMeta = (apiName) => fields.find((f) => f.apiName === apiName);

  const isFieldNonEditable = (meta) => {
    if (!meta) return true;
    return (
      meta.isReadOnly ||
      meta.type === 'auto_number' ||
      meta.type === 'formula' ||
      !perms.canEditField(meta.apiName)
    );
  };

  const isFieldWide = (meta) => {
    if (!meta) return false;
    return (
      meta.type === 'textarea' ||
      meta.type === 'richtext' ||
      meta.colspan === 2
    );
  };

  return (
    <form id="record-form" onSubmit={onSubmit} noValidate>
      <div className={styles.mainPanel}>
        {sections.map((section) => (
          <div key={section.id} className={styles.section}>
            <h3 className={styles.sectionTitle}>{section.label}</h3>
            <div
              className={styles.fieldGrid}
              style={{
                gridTemplateColumns: `repeat(${section.columns || 2}, 1fr)`,
              }}
            >
              {interleaveColumns(section.columnData).map(
                ({ fieldItem, colIdx, row }) => {
                  if (!fieldItem) {
                    return <div key={`empty-${row}-${colIdx}`} />;
                  }

                  const meta = getFieldMeta(fieldItem.fieldApiName);

                  if (!meta) {
                    return (
                      <div key={`missing-${fieldItem.fieldApiName}`} />
                    );
                  }

                  // Hide fields the user cannot view
                  if (!perms.canViewField(meta.apiName)) {
                    return (
                      <div key={`hidden-${fieldItem.fieldApiName}`} />
                    );
                  }

                  const isNonEditable = isFieldNonEditable(meta);
                  const isWide = isFieldWide(meta);

                  if (isNonEditable) {
                    return (
                      <Field
                        key={`${colIdx}-${fieldItem.fieldApiName}`}
                        field={meta}
                        value={formData[meta.apiName]}
                        mode="view"
                        className={isWide ? styles.fullWidth : ''}
                      />
                    );
                  }

                  return (
                    <Field
                      key={`${colIdx}-${fieldItem.fieldApiName}`}
                      field={meta}
                      value={formData[meta.apiName]}
                      onChange={onFieldChange}
                      error={errors[meta.apiName]}
                      className={isWide ? styles.fullWidth : ''}
                    />
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>
    </form>
  );
};

export default RecordFormContent;
