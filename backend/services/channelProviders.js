import crypto from 'crypto';
import { CHANNELS } from '../models/ChannelAccount.js';

/**
 * Channel provider abstraction (Core BRD §18.5, §16.4).
 *
 * Every channel resolves to an adapter. Adapters declare their capabilities
 * and expose a single `send`. Outbound delivery needs live provider
 * credentials/APIs, which are not integrated yet: until then a send is
 * recorded as 'queued' with an explicit reason so nothing is silently lost and
 * nothing is falsely reported as delivered.
 */

const CAPABILITIES = {
  whatsapp: { templates: true, deliveryStatus: true, calls: false },
  facebook: { templates: false, deliveryStatus: true, calls: false },
  instagram: { templates: false, deliveryStatus: true, calls: false },
  email: { templates: true, deliveryStatus: true, calls: false },
  sms: { templates: false, deliveryStatus: true, calls: false },
  telephony: { templates: false, deliveryStatus: false, calls: true },
  webchat: { templates: false, deliveryStatus: true, calls: false },
  other: { templates: false, deliveryStatus: false, calls: false },
};

const isConfigured = (account) =>
  Boolean(account?.credentials && Object.keys(account.credentials).length > 0);

const buildAdapter = (channel) => ({
  channel,
  capabilities: CAPABILITIES[channel] || CAPABILITIES.other,
  isConfigured,
  async send(account, _message) {
    if (!isConfigured(account)) {
      return {
        status: 'queued',
        providerStatus: 'not_configured',
        note: 'Channel account has no provider credentials.',
      };
    }
    // shortcut: only outbound orchestration is built; the live provider call
    // (Meta, SMTP, SMS gateway) needs credentials + vendor docs to implement.
    return {
      status: 'queued',
      providerStatus: 'pending_integration',
      note: `${channel} outbound delivery is not implemented yet.`,
    };
  },
});

const ADAPTERS = CHANNELS.reduce((acc, channel) => {
  acc[channel] = buildAdapter(channel);
  return acc;
}, {});

export const getAdapter = (channel) => ADAPTERS[channel] || ADAPTERS.other;

export const capabilitiesFor = (channel) => getAdapter(channel).capabilities;

/**
 * Verify a channel webhook signature over the exact raw bytes received.
 * Accepts `x-salesdam-signature` or Meta's `x-hub-signature-256`. A channel
 * account with no signing secret rejects every webhook rather than accepting
 * unauthenticated inbound payloads.
 */
export const verifyWebhookSignature = (account, req) => {
  const secret = account?.webhookSecret;
  if (!secret) return false;
  const header =
    req.headers['x-salesdam-signature'] || req.headers['x-hub-signature-256'];
  if (!header) return false;
  const provided = String(header).startsWith('sha256=')
    ? String(header).slice(7)
    : String(header);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody || Buffer.from(''))
    .digest('hex');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ── Provider readiness registry (§16.1, §18.5) ─────────────────────────── */

/**
 * Concrete providers sit behind the channel abstraction. Each declares the
 * credentials an admin must supply and, where the vendor's webhook contract is
 * documented, normalizes its inbound payload into the canonical shape the
 * ingestion service understands. Providers whose contract is not yet supplied
 * declare `normalizeInbound: null` — a clearly marked seam.
 */
const _metaMessageText = (msg) =>
  msg.text?.body ||
  msg.button?.text ||
  msg.interactive?.button_reply?.title ||
  msg.interactive?.list_reply?.title ||
  `[${msg.type || 'message'}]`;

const _metaWhatsappInbound = (body) => {
  if (!body || body.object !== 'whatsapp_business_account') return null;
  const events = [];
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const msg of value.messages || []) {
        const contact = (value.contacts || []).find((c) => c.wa_id === msg.from);
        events.push({
          kind: 'message',
          from: { identifier: msg.from, name: contact?.profile?.name || '' },
          body: _metaMessageText(msg),
          externalMessageId: msg.id,
          occurredAt: msg.timestamp ? Number(msg.timestamp) * 1000 : undefined,
        });
      }
      for (const status of value.statuses || []) {
        events.push({
          kind: 'status',
          externalMessageId: status.id,
          status: status.status || 'sent',
          providerStatus: status.status || '',
        });
      }
    }
  }
  return events.length ? { events } : null;
};

const _metaMessengerInbound = (body) => {
  if (!body || !['page', 'instagram'].includes(body.object)) return null;
  const events = [];
  for (const entry of body.entry || []) {
    for (const item of entry.messaging || []) {
      if (!item.message || item.message.is_echo) continue;
      events.push({
        kind: 'message',
        from: { identifier: item.sender?.id, name: '' },
        body: item.message.text || `[${item.message.attachments ? 'attachment' : 'message'}]`,
        externalMessageId: item.message.mid,
        occurredAt: item.timestamp,
      });
    }
  }
  return events.length ? { events } : null;
};

const _defineProvider = (id, def) => ({
  id,
  capabilities: CAPABILITIES[def.channel] || CAPABILITIES.other,
  requiredCredentials: [],
  normalizeInbound: null,
  ...def,
});

const PROVIDERS = {
  meta: _defineProvider('meta', {
    channel: 'whatsapp',
    label: 'Meta WhatsApp Cloud API',
    requiredCredentials: ['accessToken', 'phoneNumberId'],
    normalizeInbound: _metaWhatsappInbound,
  }),
  meta_messenger: _defineProvider('meta_messenger', {
    channel: 'facebook',
    label: 'Meta Messenger (Facebook Page)',
    requiredCredentials: ['pageAccessToken', 'appSecret'],
    normalizeInbound: _metaMessengerInbound,
  }),
  meta_instagram: _defineProvider('meta_instagram', {
    channel: 'instagram',
    label: 'Meta Instagram Messaging',
    requiredCredentials: ['pageAccessToken', 'appSecret'],
    normalizeInbound: _metaMessengerInbound,
  }),
  smtp: _defineProvider('smtp', {
    channel: 'email',
    label: 'SMTP / inbound email',
    requiredCredentials: ['host', 'port', 'username', 'password', 'from'],
    note: 'Inbound email parsing depends on the mail provider webhook contract.',
  }),
  sms_gateway: _defineProvider('sms_gateway', {
    channel: 'sms',
    label: 'SMS gateway',
    requiredCredentials: ['apiKey', 'senderId'],
    note: 'Inbound SMS parsing depends on the gateway webhook contract.',
  }),
  euphoria: _defineProvider('euphoria', {
    channel: 'telephony',
    label: 'Euphoria',
    requiredCredentials: ['apiKey', 'accountId'],
    note: 'Euphoria webhook and call-control contracts not yet supplied.',
  }),
  twilio: _defineProvider('twilio', {
    channel: 'telephony',
    label: 'Twilio',
    requiredCredentials: ['accountSid', 'authToken', 'fromNumber'],
    note: 'Twilio posts form-encoded webhooks; wired once the contract is confirmed.',
  }),
  webchat: _defineProvider('webchat', {
    channel: 'webchat',
    label: 'Built-in web chat',
  }),
};

const GENERIC_CHANNEL_ADAPTER = _defineProvider('generic', { channel: 'other' });

/** Resolve a provider definition, falling back to a generic one for a channel. */
export const getProvider = (providerId, channel) => {
  const provider = PROVIDERS[providerId];
  if (provider && (!channel || provider.channel === channel)) return provider;
  return { ...GENERIC_CHANNEL_ADAPTER, channel: channel || provider?.channel || 'other' };
};

/** Static provider catalog for the admin UI: what to configure and what works. */
export const listProviders = () =>
  Object.values(PROVIDERS).map((provider) => ({
    provider: provider.id,
    channel: provider.channel,
    label: provider.label,
    capabilities: provider.capabilities,
    requiredCredentials: provider.requiredCredentials,
    inboundNormalizer: Boolean(provider.normalizeInbound),
    note: provider.note || '',
  }));

/** Check an account's credentials against its provider's requirements. */
export const validateConfig = (account) => {
  const provider = getProvider(account?.provider, account?.channel);
  const credentials = account?.credentials || {};
  const missing = provider.requiredCredentials.filter((key) => {
    const value = credentials[key];
    return value === undefined || value === null || value === '';
  });
  return {
    provider: provider.id,
    channel: provider.channel,
    required: provider.requiredCredentials,
    missing,
    valid: missing.length === 0,
    hasWebhookSecret: Boolean(account?.webhookSecret),
    inboundNormalizer: Boolean(provider.normalizeInbound),
  };
};

/**
 * Normalize a provider webhook body into canonical ingestion events. Returns
 * null when the provider has no normalizer or the body is not in its shape, so
 * callers fall through to treating the body as already-canonical (dev/tests).
 */
export const normalizeInbound = (providerId, channel, body) => {
  const provider = getProvider(providerId, channel);
  return provider.normalizeInbound ? provider.normalizeInbound(body) : null;
};

export default {
  getAdapter,
  capabilitiesFor,
  verifyWebhookSignature,
  getProvider,
  listProviders,
  validateConfig,
  normalizeInbound,
};
