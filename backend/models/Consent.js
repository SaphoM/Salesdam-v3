import mongoose from 'mongoose';

/**
 * Consent — communication preferences and consent evidence for a person
 * record (Core BRD §23). One document per subject (e.g. a Contact or Lead),
 * holding per-channel opt-in state with evidence, plus an append-only history
 * so a withdrawal can be evidenced.
 */

export const CONSENT_CHANNELS = [
  'email',
  'whatsapp',
  'sms',
  'telephone',
  'marketing',
];

const evidenceSchema = new mongoose.Schema(
  {
    // true = opted in, false = opted out, null = not recorded
    optedIn: { type: Boolean, default: null },
    status: {
      type: String,
      enum: ['granted', 'withdrawn', 'unknown'],
      default: 'unknown',
    },
    source: { type: String, default: '', trim: true },
    purpose: { type: String, default: '', trim: true },
    consentedAt: { type: Date },
    withdrawnAt: { type: Date },
    capturedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const historySchema = new mongoose.Schema(
  {
    channel: { type: String, required: true },
    optedIn: { type: Boolean, default: null },
    status: { type: String, default: 'unknown' },
    source: { type: String, default: '' },
    purpose: { type: String, default: '' },
    note: { type: String, default: '' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const channelMap = {};
for (const channel of CONSENT_CHANNELS) {
  channelMap[channel] = { type: evidenceSchema, default: () => ({}) };
}

const consentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    // The person record this consent belongs to.
    subjectType: { type: String, required: true, trim: true },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    channels: channelMap,
    preferredChannel: {
      type: String,
      enum: [...CONSENT_CHANNELS, null],
      default: null,
    },

    history: { type: [historySchema], default: [] },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

consentSchema.index(
  { tenantId: 1, subjectType: 1, subjectId: 1 },
  { unique: true },
);

export default mongoose.model('Consent', consentSchema);
