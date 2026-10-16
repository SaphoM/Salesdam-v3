import mongoose from 'mongoose';
import { CHANNELS } from './ChannelAccount.js';

/**
 * Message — one entry in a Conversation (Core BRD §16.3, §16.4). Inbound,
 * outbound and internal-note messages share this shape so history renders the
 * same across channels.
 */
const messageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    channelAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChannelAccount',
    },
    channel: { type: String, enum: CHANNELS },

    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    // Internal notes are visible to agents but never delivered to the customer.
    isInternalNote: { type: Boolean, default: false },

    externalMessageId: { type: String, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, default: '' },
    senderIdentifier: { type: String, default: '' },

    body: { type: String, default: '' },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },

    status: {
      type: String,
      enum: ['received', 'queued', 'sent', 'delivered', 'read', 'failed'],
      default: 'received',
    },
    providerStatus: { type: String, default: '' },
    providerNote: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

messageSchema.index({ tenantId: 1, conversationId: 1, occurredAt: 1 });
messageSchema.index(
  { tenantId: 1, externalMessageId: 1 },
  { unique: true, partialFilterExpression: { externalMessageId: { $type: 'string' } } },
);

export default mongoose.model('Message', messageSchema);
