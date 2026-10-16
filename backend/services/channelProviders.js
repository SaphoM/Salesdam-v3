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

export default { getAdapter, capabilitiesFor, verifyWebhookSignature };
