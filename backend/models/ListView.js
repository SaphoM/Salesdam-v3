import mongoose from 'mongoose';

/**
 * ListView — a user-created saved view for an object's record list.
 *
 * Default views (All X, Recently Viewed, My X, plus the per-object ones) are not
 * stored here — they come from config/listViews.js and are merged in at request
 * time. Only views a user creates live in this collection.
 */
const filterConditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, trim: true, maxlength: 80 },
    operator: { type: String, required: true, trim: true, maxlength: 20 },
    // Mixed so a condition can hold a string, number, boolean or array.
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const listViewSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    objectApiName: { type: String, required: true, trim: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 80 },

    filters: { type: [filterConditionSchema], default: [] },

    // Ordered list of field api names. Order is meaningful — it's the column
    // order shown in the table.
    columns: [{ type: String, trim: true, maxlength: 80 }],

    sortField: { type: String, trim: true, maxlength: 80 },
    sortOrder: { type: String, enum: ['asc', 'desc'], default: 'desc' },

    // Shared with the whole workspace vs private to its creator.
    isShared: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

listViewSchema.index({ tenantId: 1, objectApiName: 1, createdBy: 1 });
listViewSchema.index({ tenantId: 1, objectApiName: 1, isShared: 1 });

export default mongoose.model('ListView', listViewSchema);
