import { useMemo } from 'react';
import QuickCreateSection from '../QuickCreateSection/QuickCreateSection';
import styles from './QuickCreateForm.module.css';

/**
 * Groups fields by section, similar to RecordForm
 */
function groupFieldsBySection(fields) {
  const grouped = {};
  fields.forEach((f) => {
    const section = f.section || 'Information';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(f);
  });
  return grouped;
}

export default function QuickCreateForm({
  fields,
  createData,
  errors = {},
  onFieldChange,
  isLoading,
}) {
  const sections = useMemo(() => {
    if (isLoading || fields.length === 0) return [];

    const grouped = groupFieldsBySection(fields);
    return Object.entries(grouped).map(([sectionName, sectionFields]) => ({
      id: sectionName,
      label: sectionName,
      fields: sectionFields,
    }));
  }, [fields, isLoading]);

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (fields.length === 0) {
    return <p className={styles.empty}>No editable fields found.</p>;
  }

  return (
    <div className={styles.formContainer}>
      {sections.map((section) => (
        <QuickCreateSection
          key={section.id}
          section={section}
          createData={createData}
          errors={errors}
          onFieldChange={onFieldChange}
        />
      ))}
    </div>
  );
}
