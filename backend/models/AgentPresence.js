import mongoose from 'mongoose';

/**
 * AgentPresence — an agent's Call Centre availability (Core BRD §18.6).
 * One document per user; statuses mirror those listed in the BRD.
 */
export const PRESENCE_STATUSES = [
  'available',
  'on_call',
  'away',
  'wrap_up',
  'offline',
];

const agentPresenceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: PRESENCE_STATUSES,
      default: 'offline',
      index: true,
    },
    since: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

agentPresenceSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

export default mongoose.model('AgentPresence', agentPresenceSchema);
