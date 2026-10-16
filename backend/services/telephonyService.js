import AgentPresence, { PRESENCE_STATUSES } from '../models/AgentPresence.js';
import TenantConfiguration from '../models/TenantConfiguration.js';
import Activity from '../models/Activity.js';
import activityService from './activityService.js';
import { AppError } from '../utils/errors.js';

/**
 * Telephony / Call Centre service (Core BRD §18.3, §18.6, §18.8).
 * Call events themselves arrive through the telephony channel webhook and are
 * stored as `call` Activities; this service covers agent presence, the
 * tenant-configurable call dispositions and post-call wrap-up.
 */

// Example dispositions from the BRD; tenants may override the list.
const DEFAULT_DISPOSITIONS = [
  'Interested',
  'Follow-Up Required',
  'No Answer',
  'Voicemail',
  'Wrong Number',
  'Not Interested',
  'Converted',
  'Other',
];

const getStatus = async ({ tenantId, userId }) => {
  const presence = await AgentPresence.findOne({ tenantId, userId });
  return presence || { tenantId, userId, status: 'offline', since: null };
};

const setStatus = async ({ tenantId, userId, status }) => {
  if (!PRESENCE_STATUSES.includes(status)) {
    throw new AppError(
      `status must be one of ${PRESENCE_STATUSES.join(', ')}.`,
      400,
    );
  }
  return AgentPresence.findOneAndUpdate(
    { tenantId, userId },
    { $set: { status, since: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

const listStatuses = (tenantId) =>
  AgentPresence.find({ tenantId })
    .sort({ status: 1 })
    .populate('userId', 'firstName lastName email');

const dispositions = async (tenantId) => {
  const config = await TenantConfiguration.findOne({
    tenantId,
    key: 'telephony.dispositions',
  }).lean();
  const value = config?.value;
  return Array.isArray(value) && value.length ? value : DEFAULT_DISPOSITIONS;
};

const wrapUp = async ({ tenantId, activityId, disposition, notes, user }) => {
  const allowed = await dispositions(tenantId);
  if (disposition !== undefined && disposition !== '' && !allowed.includes(disposition)) {
    throw new AppError(`Unknown disposition '${disposition}'.`, 400);
  }
  const activity = await Activity.findOne({ _id: activityId, tenantId, type: 'call' });
  if (!activity) throw new AppError('Call activity not found.', 404);

  activity.metadata = {
    ...(activity.metadata || {}),
    disposition: disposition || activity.metadata?.disposition || '',
    wrappedUpBy: String(user?._id),
    wrappedUpAt: new Date(),
  };
  if (notes !== undefined) activity.body = notes;
  await activity.save();
  return activity;
};

const callHistory = ({ tenantId, objectApiName, recordId, limit, skip }) => {
  if (!objectApiName || !recordId) {
    throw new AppError('objectApiName and recordId are required.', 400);
  }
  return activityService.listTimeline({
    tenantId,
    objectApiName,
    recordId,
    types: 'call',
    limit,
    skip,
  });
};

export default {
  PRESENCE_STATUSES,
  DEFAULT_DISPOSITIONS,
  getStatus,
  setStatus,
  listStatuses,
  dispositions,
  wrapUp,
  callHistory,
};
