/**
 * validationEngine.js
 *
 * Metadata-driven validation engine.
 * Applies structured `validations` config + formula expressions to a record.
 *
 * Flow per field:
 *   1. Required check (early exit)
 *   2. Type-specific rule validators
 *   3. Legacy validationRule.pattern (backward-compat)
 *   4. formulaValidation.expression (per-field formula)
 *
 * Then object-level cross-field formula rules are applied.
 */

import {
  evaluateFormula,
  DECLARED_TYPE_KINDS,
  FIELD_TYPE_KINDS,
} from './formulaParser.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isEmpty = (v) => v === null || v === undefined || v === '';

function sanitizeRegex(pattern) {
  if (!pattern || typeof pattern !== 'string') return null;
  if (pattern.length > 500) throw new Error('Regex pattern exceeds length limit');
  // Reject patterns that could cause catastrophic backtracking via heuristic
  if (/(\.\*){3,}|(\+\+|\*\*|\+\*|\*\+)/.test(pattern)) {
    throw new Error('Regex pattern is too complex');
  }
  return new RegExp(pattern);
}

// ─── Type validators ─────────────────────────────────────────────────────────
// Each returns a string error message, or null if valid.

function vText(value, r) {
  if (isEmpty(value)) return null; // required handled before
  let str = String(value);
  if (r.trim) str = str.trim();
  if (r.minLength != null && str.length < r.minLength)
    return `Must be at least ${r.minLength} character${r.minLength === 1 ? '' : 's'}.`;
  if (r.maxLength != null && str.length > r.maxLength)
    return `Must not exceed ${r.maxLength} character${r.maxLength === 1 ? '' : 's'}.`;
  if (r.regex) {
    try {
      if (!sanitizeRegex(r.regex).test(str))
        return r.regexMessage || 'Value does not match the required format.';
    } catch (e) { /* invalid/unsafe regex — skip */ }
  }
  return null;
}

function vNumber(value, r) {
  if (isEmpty(value)) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return 'Must be a valid number.';
  if (r.positiveOnly && n <= 0) return 'Must be a positive number.';
  if (r.allowNegative === false && n < 0) return 'Negative values are not allowed.';
  if (r.min != null && n < r.min) return `Must be at least ${r.min}.`;
  if (r.max != null && n > r.max) return `Must not exceed ${r.max}.`;
  if (r.precision != null) {
    const decimals = (String(n).split('.')[1] || '').length;
    if (decimals > r.precision)
      return `Max ${r.precision} decimal place${r.precision === 1 ? '' : 's'} allowed.`;
  }
  return null;
}

function vDate(value, r) {
  if (isEmpty(value)) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Must be a valid date.';
  const now = new Date();
  if (r.disablePast) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (d < today) return 'Past dates are not allowed.';
  }
  if (r.disableFuture) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (d >= tomorrow) return 'Future dates are not allowed.';
  }
  if (r.minDate) {
    const min = new Date(r.minDate);
    if (d < min) return `Date must be on or after ${min.toLocaleDateString()}.`;
  }
  if (r.maxDate) {
    const max = new Date(r.maxDate);
    if (d > max) return `Date must be on or before ${max.toLocaleDateString()}.`;
  }
  return null;
}

function vBoolean(value, r) {
  if (r.required && (value === null || value === undefined)) return 'This field is required.';
  return null;
}

function vPicklist(value, r) {
  if (isEmpty(value)) return null;
  if (r.allowedValues?.length > 0 && !r.allowedValues.includes(value))
    return `Invalid value. Allowed: ${r.allowedValues.join(', ')}.`;
  return null;
}

function vMultipicklist(value, r) {
  const vals = Array.isArray(value) ? value : (value ? [value] : []);
  if (vals.length === 0) return null;
  if (r.minSelections != null && vals.length < r.minSelections)
    return `Select at least ${r.minSelections} option${r.minSelections === 1 ? '' : 's'}.`;
  if (r.maxSelections != null && vals.length > r.maxSelections)
    return `Select no more than ${r.maxSelections} option${r.maxSelections === 1 ? '' : 's'}.`;
  if (r.allowedValues?.length > 0) {
    const invalid = vals.filter(v => !r.allowedValues.includes(v));
    if (invalid.length > 0) return `Invalid values: ${invalid.join(', ')}.`;
  }
  return null;
}

function vEmail(value, r) {
  if (isEmpty(value)) return null;
  const s = String(value).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'Must be a valid email address.';
  const domain = s.split('@')[1] || '';
  if (r.domainWhitelist?.length > 0 && !r.domainWhitelist.map(d => d.toLowerCase()).includes(domain))
    return `Email must be from: ${r.domainWhitelist.join(', ')}.`;
  if (r.domainBlacklist?.length > 0 && r.domainBlacklist.map(d => d.toLowerCase()).includes(domain))
    return 'Email domain is not allowed.';
  if (r.regex) {
    try {
      if (!sanitizeRegex(r.regex).test(s)) return r.regexMessage || 'Email format is invalid.';
    } catch {}
  }
  return null;
}

function vPhone(value, r) {
  if (isEmpty(value)) return null;
  const digits = String(value).replace(/\D/g, '');
  if (r.minLength != null && digits.length < r.minLength)
    return `Phone must have at least ${r.minLength} digits.`;
  if (r.maxLength != null && digits.length > r.maxLength)
    return `Phone must not exceed ${r.maxLength} digits.`;
  if (r.regex) {
    try {
      if (!sanitizeRegex(r.regex).test(String(value))) return r.regexMessage || 'Phone format is invalid.';
    } catch {}
  }
  return null;
}

function vUrl(value, r) {
  if (isEmpty(value)) return null;
  const s = String(value).trim();
  if (!/^https?:\/\/.+/.test(s)) return 'Must be a valid URL (http:// or https://).';
  if (r.mustBeHttps && !s.startsWith('https://')) return 'URL must use HTTPS.';
  if (r.regex) {
    try {
      if (!sanitizeRegex(r.regex).test(s)) return r.regexMessage || 'URL format is invalid.';
    } catch {}
  }
  return null;
}

function vLookup(value, r) {
  if (isEmpty(value)) return null;
  return null;
}

const TYPE_VALIDATORS = {
  text: vText, textarea: vText, richtext: vText,
  number: vNumber, currency: vNumber, percent: vNumber,
  date: vDate, datetime: vDate,
  boolean: vBoolean,
  picklist: vPicklist,
  multipicklist: vMultipicklist,
  email: vEmail,
  phone: vPhone,
  url: vUrl,
  lookup: vLookup, master_detail: vLookup,
};

// ─── Main engine ──────────────────────────────────────────────────────────────

/**
 * Validate a record against an array of field definitions.
 *
 * @param {object} record            - Flat key→value map of record data
 * @param {Array}  fieldDefinitions  - FieldMeta documents from MongoDB
 * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
 */
function validateRecord(record, fieldDefinitions) {
  const errors = [];

  for (const field of fieldDefinitions) {
    const value = record[field.apiName];
    const rules = { ...(field.validations || {}) };
    // isRequired from the top-level field flag overrides anything in rules
    if (field.isRequired) rules.required = true;

    // ── 1. Required ───────────────────────────────────────────────────────────
    const isReqEmpty = isEmpty(value) || (Array.isArray(value) && value.length === 0);
    if (rules.required && isReqEmpty) {
      errors.push({ field: field.apiName, message: `"${field.label}" is required.` });
      continue; // stop further checks for this field
    }

    // ── 2. Type validator ─────────────────────────────────────────────────────
    const tv = TYPE_VALIDATORS[field.type];
    if (tv) {
      const msg = tv(value, rules);
      if (msg) errors.push({ field: field.apiName, message: `"${field.label}": ${msg}` });
    }

    // ── 3. Legacy validationRule.pattern ─────────────────────────────────────
    if (field.validationRule?.pattern && !isEmpty(value)) {
      try {
        if (!sanitizeRegex(field.validationRule.pattern).test(String(value))) {
          errors.push({
            field: field.apiName,
            message: field.validationRule.message || `"${field.label}" validation failed.`,
          });
        }
      } catch { /* unsafe pattern — skip */ }
    }

    // ── 4. Per-field formula validation ──────────────────────────────────────
    if (field.formulaValidation?.expression && !isEmpty(value)) {
      try {
        const result = evaluateFormula(field.formulaValidation.expression, record);
        if (!result) {
          errors.push({
            field: field.apiName,
            message: field.formulaValidation.errorMessage || `"${field.label}" formula validation failed.`,
          });
        }
      } catch (err) {
        errors.push({ field: field.apiName, message: `Formula error on "${field.label}": ${err.message}` });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Run object-level cross-field formula rules.
 * These are stored on the ObjectMeta (or passed in separately).
 *
 * The expression describes the ERROR condition — a rule triggers, blocking the
 * save, when it evaluates to truthy. Must stay in step with
 * runObjectValidationRules in validationService.js, which is what the real save
 * path uses; this function backs the /records/validate preview endpoint, and the
 * two disagreeing would mean the preview contradicts the save.
 *
 * @param {object} record
 * @param {Array}  formulaRules  - [{ expression, errorMessage, field? }]
 * @returns {Array<{ field: string, message: string }>}
 */
function evaluateFormulaRules(record, formulaRules = []) {
  const errors = [];
  for (const rule of formulaRules) {
    // Inactive rules are never enforced. `isActive` defaults to true in the
    // schema, so only an explicit false disables a rule — matches
    // runObjectValidationRules so the preview endpoint and the real save agree.
    if (rule.isActive === false || !rule.expression) continue;
    try {
      const triggered = evaluateFormula(rule.expression, record);
      if (triggered) {
        errors.push({
          field: rule.field || '_form',
          message: rule.errorMessage || 'Validation rule failed.',
        });
      }
    } catch (err) {
      errors.push({ field: rule.field || '_form', message: `Formula error: ${err.message}` });
    }
  }
  return errors;
}

/**
 * The kind a field's stored value has, for formula return-type inference.
 * A formula or rollup field is resolved from what it computes rather than from
 * its own `type`, so `total * 2` can still be inferred as a number.
 */
function kindOfField(f) {
  if (f.type === 'formula') {
    return DECLARED_TYPE_KINDS[f.formulaReturnType] || 'unknown';
  }
  if (f.type === 'rollup_summary') {
    // COUNT/SUM/AVG are always numeric. MIN/MAX return a value from the child
    // field itself, which may be a date — leave those unknown rather than
    // guessing wrong and rejecting a valid formula.
    return ['COUNT', 'SUM', 'AVG'].includes(f.rollupType) ? 'number' : 'unknown';
  }
  return FIELD_TYPE_KINDS[f.type] || 'unknown';
}

/**
 * Build a { fieldApiName: kind } map from field definitions, for inferring the
 * return type of a formula that references them.
 */
function buildFieldKindMap(fieldDefinitions) {
  const kinds = {};
  for (const f of fieldDefinitions || []) {
    const kind = kindOfField(f);
    if (kind !== 'unknown') kinds[f.apiName] = kind;
  }
  return kinds;
}

/**
 * Build a sample context object from field definitions (for formula dry-runs).
 * Uses sensible defaults per type so the formula doesn't crash on nulls.
 */
function buildSampleContext(fieldDefinitions) {
  const ctx = {};
  for (const f of fieldDefinitions) {
    // Formula and rollup fields hold a computed value, so the sample has to
    // match what they compute — not their own `type`, which would otherwise
    // fall through to the text default and dry-run arithmetic as NaN.
    const kind = kindOfField(f);
    if (f.type === 'formula' || f.type === 'rollup_summary') {
      ctx[f.apiName] =
        kind === 'number'  ? 0
        : kind === 'boolean' ? false
        : kind === 'date'    ? new Date().toISOString()
        : '';
      continue;
    }
    switch (f.type) {
      case 'number': case 'currency': case 'percent': ctx[f.apiName] = 0; break;
      case 'boolean': ctx[f.apiName] = false; break;
      case 'date': case 'datetime': ctx[f.apiName] = new Date().toISOString(); break;
      case 'multipicklist': ctx[f.apiName] = []; break;
      default: ctx[f.apiName] = '';
    }
  }
  return ctx;
}

export {
  validateRecord,
  evaluateFormulaRules,
  buildSampleContext,
  buildFieldKindMap,
};
