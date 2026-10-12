/**
 * The field type a value should be *rendered* as.
 *
 * A formula field's own `type` is 'formula', which tells a renderer nothing —
 * the declared `formulaReturnType` is what says whether the computed value is
 * currency, a date, or plain text. Without this, every display switch fell
 * through to `default: String(value)` and a currency formula rendered as a bare
 * `4523.5`.
 *
 * Renderers should switch on this instead of on `field.type` directly.
 */
export function resolveDisplayType(field) {
  if (!field) return 'text';

  if (field.type === 'formula') {
    // Fields created before return types existed have none; falling back to the
    // original 'formula' keeps them on the same default branch as before.
    return field.formulaReturnType || 'formula';
  }

  if (field.type === 'rollup_summary') {
    // COUNT is always a plain count. SUM/AVG/MIN/MAX return a value derived from
    // a field on the child object, whose type isn't available here — so those
    // keep the existing default rendering rather than guessing.
    return field.rollupType === 'COUNT' ? 'number' : field.type;
  }

  return field.type;
}

export default resolveDisplayType;
