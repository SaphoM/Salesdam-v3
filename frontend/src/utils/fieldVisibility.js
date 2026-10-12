/**
 * Helper ("utility") fields are marked `isHidden` on their FieldMeta. Their
 * values are stored and can be referenced by formulas and rollup summaries, but
 * they are never rendered on a page layout or record form, and never offered in
 * a layout or column picker — they only exist to feed another calculation.
 *
 * Every place that turns a field list into something a user sees should run it
 * through here.
 */
export const isHelperField = (field) => !!field?.isHidden;

/** Drop helper fields from a FieldMeta array. */
export const withoutHelperFields = (fields) =>
  (fields || []).filter((f) => !isHelperField(f));
