/**
 * Initialize form data with defaults and record data
 */
export const initializeFormData = (fields, record, user, isEdit) => {
  const defaults = {};

  fields.forEach((f) => {
    if (f.defaultValue !== undefined && f.defaultValue !== null) {
      defaults[f.apiName] = f.defaultValue;
    } else if (f.type === 'picklist') {
      const pv = f.picklistValues?.find((p) => p.isDefault);
      if (pv) defaults[f.apiName] = pv.value;
    } else if (
      f.type === 'lookup' &&
      f.lookupObjectApiName === 'user' &&
      user?._id &&
      !isEdit
    ) {
      defaults[f.apiName] = user._id;
    }
  });

  if (isEdit && record) {
    return { ...defaults, ...record };
  }

  return defaults;
};

/**
 * Validate form data against field requirements
 */
export const validateFormData = (formData, fields) => {
  const errors = {};

  fields.forEach((f) => {
    if (f?.isRequired || f?.validations?.required) {
      const val = formData[f.apiName];
      if (val === undefined || val === null || val === '') {
        errors[f.apiName] = `${f.label} is required`;
      }
    }
  });

  return errors;
};

/**
 * Clear error for a specific field
 */
export const clearFieldError = (errors, fieldApiName) => {
  if (errors[fieldApiName]) {
    return { ...errors, [fieldApiName]: '' };
  }
  return errors;
};

/**
 * Convert datetime values from local time (as received from datetime-local input)
 * to UTC ISO format for backend storage
 */
export const convertDatetimeToUTC = (formData, fields) => {
  const converted = { ...formData };

  fields.forEach((f) => {
    if (f.type === 'datetime' && converted[f.apiName]) {
      const localValue = converted[f.apiName];
      // datetime-local input returns "YYYY-MM-DDTHH:mm" in local time
      // new Date() interprets this as local time and stores it as UTC internally
      // toISOString() returns the correct UTC representation
      const localDate = new Date(`${localValue}:00`);
      converted[f.apiName] = localDate.toISOString();
    }
  });

  return converted;
};

// Shared with the related-list inline modals — see utils/serverErrors.js
export { extractServerErrors } from '../../../../utils/serverErrors';
