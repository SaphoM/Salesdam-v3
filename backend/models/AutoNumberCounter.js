/**
 * AutoNumberCounter — tracks the last-used sequence value for every
 * auto_number field. Uses MongoDB's findOneAndUpdate $inc for an atomic,
 * race-condition-free increment.
 */
import mongoose from 'mongoose';

const autoNumberCounterSchema = new mongoose.Schema({
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  objectApiName: { type: String, required: true },
  fieldApiName:  { type: String, required: true },
  currentValue:  { type: Number, default: 0 },
}, { timestamps: false });

autoNumberCounterSchema.index(
  { tenantId: 1, objectApiName: 1, fieldApiName: 1 },
  { unique: true }
);

/**
 * getNextValue — atomically increments and returns the next sequence number.
 * @param {ObjectId} tenantId
 * @param {string}   objectApiName
 * @param {object}   fieldMeta     — the FieldMeta doc (needs startAt config)
 * @returns {number} the NEW (incremented) value
 */
autoNumberCounterSchema.statics.getNextValue = async function (tenantId, objectApiName, fieldMeta) {
  const startAt   = (fieldMeta.autoNumberStartAt ?? 1) - 1; // default counter = startAt-1 so first increment = startAt
  const counter   = await this.findOneAndUpdate(
    { tenantId, objectApiName, fieldApiName: fieldMeta.apiName },
    { $inc: { currentValue: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // If the counter was just created (upsert), its pre-increment value was 0.
  // Adjust so the returned value starts at autoNumberStartAt.
  return counter.currentValue + startAt;
};

export default mongoose.model('AutoNumberCounter', autoNumberCounterSchema);
