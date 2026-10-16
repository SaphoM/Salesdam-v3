import mongoose from 'mongoose';

/**
 * Activity — a single customer or user interaction (Core BRD §24).
 * One shape covers every channel so a record page can render a single
 * chronological timeline regardless of where the interaction came from.
 */

export const ACTIVITY_TYPES = [
  'task',
  'note',
  'meeting',
  'call',
  'email',
  'whatsapp',
  'facebook',
  'instagram',
  'sms',
  'system_notification',
  'other',
];

const relatedRecordSchema = new mongoose.Schema(
  {
    objectApiName: { type: String, required: true, trim: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const activitySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    type: { type: String, enum: ACTIVITY_TYPES, required: true, index: true },
    subject: { type: String, default: '', trim: true },
    body: { type: String, default: '' },

    // Primary business record this activity belongs to.
    objectApiName: { type: String, required: true, trim: true, index: true },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    // Other records the activity also relates to (keeps a primary customer link).
    relatedRecords: { type: [relatedRecordSchema], default: [] },

    channel: { type: String, default: '', trim: true },
    direction: {
      type: String,
      enum: ['inbound', 'outbound', null],
      default: null,
    },

    status: {
      type: String,
      enum: ['open', 'completed', 'cancelled'],
      default: 'completed',
      index: true,
    },
    dueAt: { type: Date },
    completedAt: { type: Date },

    occurredAt: { type: Date, default: Date.now, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Idempotency key for channel-originated activities (email, WhatsApp, ...).
    externalId: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

activitySchema.index({ tenantId: 1, objectApiName: 1, recordId: 1, occurredAt: -1 });
activitySchema.index({ tenantId: 1, type: 1, occurredAt: -1 });
// Unique only for channel-originated activities (those with an externalId).
activitySchema.index(
  { tenantId: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } },
);

export default mongoose.model('Activity', activitySchema);
