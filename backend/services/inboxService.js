import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import ChannelAccount from '../models/ChannelAccount.js';
import Activity from '../models/Activity.js';
import consentService from './consentService.js';
import channelProviders from './channelProviders.js';
import { AppError } from '../utils/errors.js';

/**
 * Omnichannel inbox service (Core BRD §16.2, §16.3, §16.4).
 * Agents view, own, transfer and reply to conversations; outbound replies pass
 * through the shared consent check (§16.6) and the channel provider adapter.
 */

// Only channels with a defined consent dimension are enforced; others are
// surfaced without a consent gate rather than invented as one.
const CONSENT_CHANNEL = {
  email: 'email',
  whatsapp: 'whatsapp',
  sms: 'sms',
  telephony: 'telephone',
};

const listConversations = async ({
  tenantId,
  userId,
  assignedToMe,
  assigned,
  status,
  channel,
  isUnread,
  limit,
  skip,
}) => {
  const filter = { tenantId };
  if (status) filter.status = status;
  if (channel) filter.channel = channel;
  if (isUnread === 'true' || isUnread === true) filter.isUnread = true;
  if (assignedToMe === 'true' || assignedToMe === true) filter.assignedTo = userId;
  if (assigned === 'unassigned') filter.assignedTo = null;
  if (assigned === 'assigned') filter.assignedTo = { $ne: null };

  const size = Math.min(Number(limit) || 25, 100);
  const offset = Number(skip) || 0;
  const [items, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip(offset)
      .limit(size)
      .populate('assignedTo', 'firstName lastName')
      .lean(),
    Conversation.countDocuments(filter),
  ]);
  return { items, total, limit: size, skip: offset };
};

const getConversation = async ({ tenantId, id }) => {
  const conversation = await Conversation.findOne({ _id: id, tenantId }).populate(
    'assignedTo',
    'firstName lastName',
  );
  if (!conversation) throw new AppError('Conversation not found.', 404);
  return conversation;
};

const listMessages = async ({ tenantId, conversationId, limit, skip }) => {
  await getConversation({ tenantId, id: conversationId });
  const size = Math.min(Number(limit) || 50, 200);
  const offset = Number(skip) || 0;
  const [items, total] = await Promise.all([
    Message.find({ tenantId, conversationId })
      .sort({ occurredAt: 1 })
      .skip(offset)
      .limit(size)
      .populate('authorId', 'firstName lastName')
      .lean(),
    Message.countDocuments({ tenantId, conversationId }),
  ]);
  return { items, total, limit: size, skip: offset };
};

const assignConversation = async ({ tenantId, id, userId }) => {
  const conversation = await getConversation({ tenantId, id });
  conversation.assignedTo = userId || null;
  await conversation.save();
  return conversation;
};

const setStatus = async ({ tenantId, id, status }) => {
  const conversation = await getConversation({ tenantId, id });
  conversation.status = status;
  conversation.closedAt = status === 'closed' ? new Date() : null;
  await conversation.save();
  return conversation;
};

const linkRecord = async ({ tenantId, id, objectApiName, recordId }) => {
  const conversation = await getConversation({ tenantId, id });
  if (!objectApiName || !recordId) {
    conversation.linkedRecord = null;
  } else {
    conversation.linkedRecord = { objectApiName, recordId };
  }
  await conversation.save();
  return conversation;
};

/** Consent check for an outbound reply, using the shared consent service. */
const _assertCanContact = async ({ tenantId, channel, linkedRecord }) => {
  const consentChannel = CONSENT_CHANNEL[channel];
  if (!consentChannel || !linkedRecord) return { enforced: false };
  const result = await consentService.canContact(
    tenantId,
    linkedRecord.objectApiName,
    linkedRecord.recordId,
    consentChannel,
  );
  if (result.enforced && !result.allowed) {
    throw new AppError(`Contact blocked: ${result.reason}.`, 403);
  }
  return result;
};

const reply = async ({ tenantId, id, body, attachments = [], user }) => {
  if (!body) throw new AppError('A reply body is required.', 400);
  const conversation = await getConversation({ tenantId, id });
  if (conversation.status === 'closed') {
    throw new AppError('Reopen the conversation before replying.', 409);
  }

  await _assertCanContact({
    tenantId,
    channel: conversation.channel,
    linkedRecord: conversation.linkedRecord,
  });

  // Send through the channel abstraction: adapter availability and provider
  // credentials decide the resulting status.
  const account = await ChannelAccount.findOne({
    _id: conversation.channelAccountId,
    tenantId,
  }).select('+credentials');
  const adapter = channelProviders.getAdapter(conversation.channel);
  const outcome = await adapter.send(account, { body, attachments });

  const message = await Message.create({
    tenantId,
    conversationId: conversation._id,
    channelAccountId: conversation.channelAccountId,
    channel: conversation.channel,
    direction: 'outbound',
    authorId: user?._id,
    senderName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    body,
    attachments,
    status: outcome.status,
    providerStatus: outcome.providerStatus,
    providerNote: outcome.note,
  });

  if (conversation.linkedRecord) {
    const type = ['whatsapp', 'facebook', 'instagram', 'email', 'sms'].includes(
      conversation.channel,
    )
      ? conversation.channel
      : 'other';
    await Activity.create({
      tenantId,
      type,
      subject: `${conversation.channel} reply`,
      body,
      objectApiName: conversation.linkedRecord.objectApiName,
      recordId: conversation.linkedRecord.recordId,
      channel: conversation.channel,
      direction: 'outbound',
      status: 'completed',
      occurredAt: message.createdAt,
      metadata: { conversationId: String(conversation._id) },
    }).catch(() => {});
  }

  conversation.lastMessageAt = new Date();
  await conversation.save();
  return message;
};

const addNote = async ({ tenantId, id, body, user }) => {
  if (!body) throw new AppError('A note body is required.', 400);
  const conversation = await getConversation({ tenantId, id });
  return Message.create({
    tenantId,
    conversationId: conversation._id,
    channelAccountId: conversation.channelAccountId,
    channel: conversation.channel,
    direction: 'outbound',
    isInternalNote: true, // visible to agents, never sent to the customer
    authorId: user?._id,
    senderName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    body,
    status: 'sent',
  });
};

export default {
  listConversations,
  getConversation,
  listMessages,
  assignConversation,
  setStatus,
  linkRecord,
  reply,
  addNote,
};
