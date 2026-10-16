import MessageTemplate from '../models/MessageTemplate.js';
import { AppError } from '../utils/errors.js';

/**
 * Messaging template service (Core BRD §16.5). Templates are tenant-scoped and
 * support {{merge}} fields resolved from record data at send time.
 */

/**
 * Resolve `{{a.b}}` tokens from a flat or nested values object. Unknown tokens
 * are left intact so a missing field is visible rather than silently blanked.
 */
const render = (body, values = {}) =>
  String(body ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
    const parts = path.split('.');
    let current = values;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return match;
      current = current[part];
    }
    return current == null ? match : String(current);
  });

const listTemplates = async ({ tenantId, channel, isActive }) => {
  const filter = { tenantId };
  if (channel) filter.channel = channel;
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;
  return MessageTemplate.find(filter).sort({ channel: 1, name: 1 });
};

const getTemplate = async ({ tenantId, id }) => {
  const template = await MessageTemplate.findOne({ _id: id, tenantId });
  if (!template) throw new AppError('Message template not found.', 404);
  return template;
};

const createTemplate = async ({ tenantId, data = {}, user }) => {
  if (!data.name || !data.body || !data.channel) {
    throw new AppError('name, channel and body are required.', 400);
  }
  return MessageTemplate.create({ ...data, tenantId, createdBy: user?._id });
};

const updateTemplate = async ({ tenantId, id, updates = {} }) => {
  const allowed = [
    'name',
    'channel',
    'subject',
    'body',
    'language',
    'isActive',
    'providerTemplateId',
    'providerStatus',
  ];
  const patch = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) patch[key] = updates[key];
  }
  const template = await MessageTemplate.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: patch },
    { new: true, runValidators: true },
  );
  if (!template) throw new AppError('Message template not found.', 404);
  return template;
};

const deleteTemplate = async ({ tenantId, id }) => {
  const template = await MessageTemplate.findOneAndDelete({ _id: id, tenantId });
  if (!template) throw new AppError('Message template not found.', 404);
  return template;
};

export default {
  render,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
