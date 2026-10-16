import mongoose from 'mongoose';

/**
 * ChannelAccount — a tenant's configuration for one messaging/telephony
 * channel (Core BRD §16.4, §18.5). Concrete providers sit behind the channel
 * abstraction so the inbox, activities and flows do not hardcode any vendor.
 */

export const CHANNELS = [
  'whatsapp',
  'facebook',
  'instagram',
  'email',
  'sms',
  'telephony',
  'webchat',
  'other',
];

const matchRuleSchema = new mongoose.Schema(
  {
    objectApiName: { type: String, required: true, trim: true },
    fieldApiName: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ['phone', 'email', 'identifier'],
      required: true,
    },
  },
  { _id: false },
);

const channelAccountSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    channel: { type: String, enum: CHANNELS, required: true, index: true },
    name: { type: String, required: true, trim: true },
    provider: { type: String, default: 'other', trim: true },
    isActive: { type: Boolean, default: true },

    // Provider credentials and the webhook signing secret are secrets: never
    // selected by default so they cannot leak through list/get responses.
    credentials: { type: mongoose.Schema.Types.Mixed, default: {}, select: false },
    webhookSecret: { type: String, select: false },

    // How an inbound phone/email/handle is matched to an existing record.
    matchRules: { type: [matchRuleSchema], default: [] },
    // Optional default owner for records created from this channel.
    defaultOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Never serialize provider secrets, whichever path returns the document.
channelAccountSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.credentials;
    delete ret.webhookSecret;
    return ret;
  },
});

channelAccountSchema.index({ tenantId: 1, channel: 1, name: 1 }, { unique: true });

export default mongoose.model('ChannelAccount', channelAccountSchema);
