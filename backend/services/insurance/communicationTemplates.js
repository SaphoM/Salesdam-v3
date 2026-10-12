/**
 * Communication template system (BRD §16.3).
 *
 * Tenant-managed templates with dynamic field substitution from Policy, Client,
 * Account, Transaction, Claim and related records. Templates are versioned and
 * support multi-channel rendering (email, WhatsApp, SMS, post).
 *
 * Shortcut: uses a simple {{field.path}} syntax for dynamic fields. More
 * sophisticated template engines (Handlebars, Liquid) can be swapped later.
 */

import { findOne, findMany, createDynamic, updateDynamic } from './dynamicRecords.js';
import { dataOf } from './pricingService.js';
import { AppError } from '../../utils/errors.js';

export const TEMPLATE_CHANNELS = ['email', 'whatsapp', 'sms', 'post'];
export const TEMPLATE_CATEGORIES = [
  'payment_due',
  'payment_received',
  'payment_failed',
  'payment_missed_1',
  'payment_missed_2',
  'payment_missed_3',
  'policy_issued',
  'policy_endorsement',
  'policy_approved',
  'policy_rejected',
  'policy_lapsed',
  'policy_reinstated',
  'policy_cancelled',
  'claim_reported',
  'claim_approved',
  'claim_declined',
  'claim_paid',
  'child_age_event',
  'age_limit_action',
  'waiting_period_complete',
];

const idOf = (rec) => String(rec._id);

/** Simple template renderer: {{object.field}} -> value from context. */
export const renderTemplate = (template, context) => {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split('.');
    let val = context;
    for (const p of parts) {
      if (val === null || val === undefined) return `{{${path}}}`;
      val = val[p];
    }
    return val !== undefined && val !== null ? String(val) : `{{${path}}}`;
  });
};

/** Build the full context object available to templates. */
export const buildTemplateContext = async (tenantId, { policyId, claimId, accountId, clientId, transactionId, userId }) => {
  const context = {};

  if (policyId) {
    const policy = await findOne(tenantId, 'policy', { _id: policyId });
    if (policy) {
      context.policy = dataOf(policy);
      const [parties, lives, premiumHistory] = await Promise.all([
        findMany(tenantId, 'policy_party', { 'data.policy': policyId }),
        findMany(tenantId, 'insured_life', { 'data.policy': policyId, 'data.status': 'active' }),
        findMany(tenantId, 'policy_premium_history', { 'data.policy': policyId }),
      ]);
      context.policy.party = parties.map(dataOf);
      context.policy.lives = lives.map(dataOf);
      context.policy.premiumHistory = premiumHistory.map(dataOf);
    }
  }

  if (claimId) {
    const claim = await findOne(tenantId, 'claim', { _id: claimId });
    if (claim) {
      context.claim = dataOf(claim);
      const [requirements, payments] = await Promise.all([
        findMany(tenantId, 'claim_requirement', { 'data.claim': claimId }),
        findMany(tenantId, 'claim_payment', { 'data.claim': claimId }),
      ]);
      context.claim.requirements = requirements.map(dataOf);
      context.claim.payments = payments.map(dataOf);
    }
  }

  if (accountId) {
    const account = await findOne(tenantId, 'account', { _id: accountId });
    if (account) context.account = dataOf(account);
  }

  if (clientId) {
    const client = await findOne(tenantId, 'client', { _id: clientId });
    if (client) context.client = dataOf(client);
  }

  if (transactionId) {
    const txn = await findOne(tenantId, 'premium_transaction', { _id: transactionId });
    if (txn) context.transaction = dataOf(txn);
  }

  if (userId) {
    const user = await findOne(tenantId, 'user', { _id: userId });
    if (user) context.user = dataOf(user);
  }

  // Current date/time helpers
  context.now = new Date().toISOString();
  context.today = new Date().toISOString().slice(0, 10);

  return context;
};

/** Render a template string with context, returning subject and body. */
export const renderCommunication = (template, context) => {
  const subject = renderTemplate(template.subject, context);
  const body = renderTemplate(template.body, context);
  return { subject, body };
};

/** Template CRUD helpers (backed by metadata object 'communication_template'). */

export const createTemplate = async ({ tenantId, userId, name, category, channel, subject, body, isActive = true }) => {
  if (!TEMPLATE_CATEGORIES.includes(category)) {
    throw new AppError(`Invalid template category. Must be one of: ${TEMPLATE_CATEGORIES.join(', ')}`, 400);
  }
  if (!TEMPLATE_CHANNELS.includes(channel)) {
    throw new AppError(`Invalid channel. Must be one of: ${TEMPLATE_CHANNELS.join(', ')}`, 400);
  }

  const obj = await findOne(tenantId, 'communication_template', { 'data.api_name': name.toLowerCase().replace(/\s+/g, '_') });
  if (obj) throw new AppError('A template with this name already exists.', 409);

  const templateObj = await findOne(tenantId, 'communication_template', { apiName: 'communication_template' });
  // Note: this assumes the object exists; if not, it must be seeded first

  return createDynamic({
    tenantId,
    objectApiName: 'communication_template',
    userId,
    data: {
      name,
      api_name: name.toLowerCase().replace(/\s+/g, '_'),
      category,
      channel,
      subject,
      body,
      is_active: isActive,
      version: 1,
    },
  });
};

export const updateTemplate = async ({ tenantId, userId, templateId, subject, body, isActive, version }) => {
  const template = await findOne(tenantId, 'communication_template', { _id: templateId });
  if (!template) throw new AppError('Template not found.', 404);

  const data = { subject, body, is_active: isActive, version: (version || 1) + 1 };
  return updateDynamic(template, data, userId);
};

export const getTemplate = async (tenantId, templateId) => {
  const t = await findOne(tenantId, 'communication_template', { _id: templateId });
  return t ? { id: idOf(t), ...dataOf(t) } : null;
};

export const listTemplates = async (tenantId, { category, channel, isActive } = {}) => {
  const filter = {};
  if (category) filter['data.category'] = category;
  if (channel) filter['data.channel'] = channel;
  if (isActive !== undefined) filter['data.is_active'] = isActive;

  const templates = await findMany(tenantId, 'communication_template', filter, { createdAt: -1 });
  return templates.map((t) => ({ id: idOf(t), ...dataOf(t) }));
};

export const renderTemplateById = async (tenantId, templateId, context) => {
  const template = await getTemplate(tenantId, templateId);
  if (!template) throw new AppError('Template not found.', 404);
  return renderCommunication(template, context);
};

export default {
  renderTemplate,
  buildTemplateContext,
  renderCommunication,
  createTemplate,
  updateTemplate,
  getTemplate,
  listTemplates,
  renderTemplateById,
  TEMPLATE_CHANNELS,
  TEMPLATE_CATEGORIES,
};