import AutoNumberCounter from '../models/AutoNumberCounter.js';

// Used when a field doesn't specify its own padding.
const DEFAULT_PADDING = 4;

/**
 * Formats a raw sequence number using a field's auto-number configuration.
 *
 * @param {object} field - FieldMeta doc (autoNumberPrefix / autoNumberPadding)
 * @param {number} seq
 * @returns {string} e.g. "INV-1000"
 */
const formatAutoNumber = (field, seq) => {
  const padded = String(seq).padStart(
    field.autoNumberPadding ?? DEFAULT_PADDING,
    '0',
  );
  return `${field.autoNumberPrefix ?? ''}${padded}`;
};

/**
 * Generates and assigns a value for every `auto_number` field on a record.
 *
 * Centralised so every creation path produces identically formatted numbers —
 * previously this block was duplicated across recordController, the CSV import
 * and the deal→order conversion (with an inconsistent padding default), and was
 * missing entirely from quote/invoice generation.
 *
 * @param {object} record - a DynamicRecord document (mutated via setField)
 * @param {Array} fields - FieldMeta docs for the record's object
 * @param {ObjectId|string} tenantId
 * @param {string} objectApiName
 * @returns {Promise<Object<string,string>>} map of apiName → generated value
 */
export const applyAutoNumbers = async (
  record,
  fields,
  tenantId,
  objectApiName,
) => {
  const generated = {};
  const autoNumberFields = (fields || []).filter(
    (f) => f.type === 'auto_number',
  );

  for (const field of autoNumberFields) {
    const seq = await AutoNumberCounter.getNextValue(
      tenantId,
      objectApiName,
      field,
    );
    const value = formatAutoNumber(field, seq);
    record.setField(field.apiName, value);
    generated[field.apiName] = value;
  }

  return generated;
};

export { formatAutoNumber, DEFAULT_PADDING };
export default { applyAutoNumbers, formatAutoNumber };
