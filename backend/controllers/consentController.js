import Consent from '../models/Consent.js';
import consentService from '../services/consentService.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';

const getConsent = asyncHandler(async (req, res) => {
  const { subjectType, subjectId } = req.params;
  const data = await consentService.getConsent(req.tenantId, subjectType, subjectId);
  sendSuccess(res, { data });
});

const updateConsent = asyncHandler(async (req, res) => {
  const { subjectType, subjectId } = req.params;
  const { channels, preferredChannel, source, purpose, note } = req.body || {};
  const data = await consentService.updateConsent({
    tenantId: req.tenantId,
    subjectType,
    subjectId,
    channels,
    preferredChannel,
    source,
    purpose,
    note,
    user: req.user,
  });
  sendSuccess(res, { data }, 'Consent saved');
});

/**
 * POST /api/v1/consents/check
 * Enforcement query for Flows, Custom Code and channel integrations.
 */
const checkConsent = asyncHandler(async (req, res) => {
  const { subjectType, subjectId, channel } = req.body || {};
  if (!channel) throw new AppError('channel is required.', 400);
  const result = await consentService.canContact(
    req.tenantId,
    subjectType,
    subjectId,
    channel,
  );
  sendSuccess(res, { data: result });
});

const listConsents = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  if (req.query.subjectType) filter.subjectType = req.query.subjectType;
  const data = await Consent.find(filter)
    .sort({ updatedAt: -1 })
    .limit(200);
  sendSuccess(res, { data });
});

export { getConsent, updateConsent, checkConsent, listConsents };
