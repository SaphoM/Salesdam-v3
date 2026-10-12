import { withoutHelperFields } from '../../../../utils/fieldVisibility';

/**
 * Build form sections from layout or field grouping
 * Combines layout sections with any missing required fields
 */
export const buildFormSections = (layout, allFields) => {
  // Helper fields are computed feeds for other calculations — never editable
  // and never shown on a form.
  const fields = withoutHelperFields(allFields);

  let sections = [];
  const fieldsInLayout = new Set();

  // Use layout sections if available
  if (layout?.sections?.length > 0) {
    sections = layout.sections.map((sec) => ({
      id: sec.id,
      label: sec.label,
      columns: sec.columns || 2,
      columnData: sec.columnData || [],
    }));

    // Track which fields are already in the layout
    layout.sections.forEach((sec) => {
      if (sec.columnData) {
        sec.columnData.forEach((col) => {
          if (col.fields) {
            col.fields.forEach((f) => {
              fieldsInLayout.add(f.fieldApiName);
            });
          }
        });
      }
    });
  } else {
    // Fallback: group by field.section
    const grouped = {};
    fields.forEach((f) => {
      const sec = f.section || 'Information';
      if (!grouped[sec]) grouped[sec] = [];
      grouped[sec].push(f);
    });

    return Object.entries(grouped).map(([label, sFields], i) => ({
      id: `fallback_${i}`,
      label,
      columns: 2,
      columnData: [
        {
          fields: sFields
            .filter((_, idx) => idx % 2 === 0)
            .map((f) => ({ fieldApiName: f.apiName, label: f.label })),
        },
        {
          fields: sFields
            .filter((_, idx) => idx % 2 !== 0)
            .map((f) => ({ fieldApiName: f.apiName, label: f.label })),
        },
      ],
    }));
  }

  // Add missing required fields in a separate section
  const missingFields = fields.filter(
    (f) =>
      !fieldsInLayout.has(f.apiName) &&
      (f.isRequired || f?.validations?.required)
  );

  if (missingFields.length > 0) {
    sections.push({
      id: 'missing_required_fields',
      label: 'Additional Information',
      columns: 2,
      columnData: [
        {
          fields: missingFields
            .filter((_, idx) => idx % 2 === 0)
            .map((f) => ({ fieldApiName: f.apiName, label: f.label })),
        },
        {
          fields: missingFields
            .filter((_, idx) => idx % 2 !== 0)
            .map((f) => ({ fieldApiName: f.apiName, label: f.label })),
        },
      ],
    });
  }

  return sections;
};
