import mongoose from 'mongoose';
import { CHANNELS } from './ChannelAccount.js';

/**
 * Conversation — a single thread through the unified Omnichannel Inbox
 * (Core BRD §16.4). Retains its originating channel but is presented the same
 * way regardless of the technology behind it.
 */

const recordRefSchema = new mongoose.Schema(
  {
    objectApiName: { type: String, required: true, trim: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    channel: { type: String, enum: CHANNELS, required: true, index: true },
    channelAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChannelAccount',
      required: true,
      index: true,
    },
    // Provider-side thread id, or a synthesized `contact:<identifier>`.
    externalThreadId: { type: String, required: true, trim: true },

    subject: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['open', 'pending', 'closed'],
      default: 'open',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    linkedRecord: { type: recordRefSchema, default: null },

    contactIdentifier: { type: String, default: '', index: true },
    contactName: { type: String, default: '' },

    isUnread: { type: Boolean, default: true },
    unreadCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, index: true },
    lastInboundAt: { type: Date },
    closedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

conversationSchema.index(
  { tenantId: 1, channelAccountId: 1, externalThreadId: 1 },
  { unique: true },
);
conversationSchema.index({ tenantId: 1, status: 1, lastMessageAt: -1 });
conversationSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });

export default mongoose.model('Conversation', conversationSchema);
