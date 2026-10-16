import { AppError } from '../utils/errors.js';

/**
 * Telephony provider readiness (Core BRD §18.5).
 *
 * Inbound call events, presence, dispositions and wrap-up are fully built
 * (telephonyService + the telephony channel webhook). Outbound call control
 * (dial/hangup/transfer/hold) needs a live CTI provider whose contract has not
 * been supplied, so each operation returns an explicit not-implemented result
 * rather than pretending a call happened. This is the call-control seam.
 */

const _defineProvider = (id, def) => ({
  id,
  label: id,
  capabilities: {
    dial: true,
    hangup: true,
    transfer: true,
    hold: true,
    queueEvents: true,
    presence: true,
  },
  note: '',
  ...def,
});

const PROVIDERS = {
  euphoria: _defineProvider('euphoria', {
    label: 'Euphoria',
    note: 'Euphoria call-control API contract not supplied; inbound call events are ingested via the telephony channel webhook.',
  }),
  twilio: _defineProvider('twilio', {
    label: 'Twilio',
    note: 'Twilio call-control wiring pending contract confirmation.',
  }),
  generic: _defineProvider('generic', { label: 'Generic CTI', note: '' }),
};

const getProvider = (id) => PROVIDERS[id] || PROVIDERS.generic;

const listProviders = () =>
  Object.values(PROVIDERS).map((provider) => ({
    provider: provider.id,
    label: provider.label,
    capabilities: provider.capabilities,
    callControlImplemented: false,
    note: provider.note,
  }));

/**
 * Attempt an outbound call-control operation. Always declines with an explicit
 * reason until a provider contract is wired — never falsely reports success.
 */
const callControl = (providerId, operation) => {
  const provider = getProvider(providerId);
  throw new AppError(
    `Telephony '${operation}' is not implemented for provider '${provider.id}'. ${provider.note}`.trim(),
    501,
  );
};

export default { getProvider, listProviders, callControl };
