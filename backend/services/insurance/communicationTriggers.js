/**
 * Automated communication triggers (BRD §16.1-16.2).
 *
 * This service provides convenient functions to trigger the right communications
 * at the right time, using the template system. It is called by:
 * - applicationService (issue, acceptance, approval)
 * - autoLapseService (lapse, missed payments)
 * - billingRunService (payment due, payment received)
 * - reinstatementService (reinstatement)
 * - endorsementService (amendments)
 * - claimService (claim lifecycle)
 *
 * Each function resolves the template, renders it, logs the communication,
 * and returns the log entry. Actual delivery (email/WhatsApp) is handled by
 * the Automation engine via record-triggered automations on the
 * `policy_communication` object.
 */

import { findOne, findMany } from './dynamicRecords.js';
import { dataOf } from './pricingService.js';
import * as commTemplates from './communicationTemplates.js';
import * as commService from './communicationService.js';
import { AppError } from '../../utils/errors.js';

/** Find the active template for a given event+channel. */
const resolveTemplate = async (tenantId, event, channel) => {
  const templates = await findMany(tenantId, 'communication_template', {
    'data.category': event,
    'data.channel': channel,
    'data.is_active': true,
  }, { createdAt: -1 });
  return templates[0] ? { id: String(templates[0]._id), ...dataOf(templates[0]) } : null;
};

/** Log a communication using the resolved template. */
const logTemplatedCommunication = async ({
  tenantId,
  userId,
  policyId,
  claimId,
  clientId,
  event,
  channel,
  context,
}) => {
  const template = await resolveTemplate(tenantId, event, channel);
  if (!template) {
    return null;
  }

  const { subject, body } = commTemplates.renderCommunication(template, context);

  const result = await commService.logCommunication({
    tenantId,
    userId,
    policyId,
    claimId,
    client: clientId,
    event,
    channel,
    subject,
    body,
    status: 'queued',
  });

  return { ...result, templateId: template.id };
};

/** Send via multiple channels (if templates exist). */
const sendMultiChannel = async ({
  tenantId,
  userId,
  policyId,
  claimId,
  clientId,
  event,
  channels = ['email', 'whatsapp', 'sms'],
  context,
}) => {
  const results = [];
  for (const channel of channels) {
    try {
      const result = await logTemplatedCommunication({
        tenantId, userId, policyId, claimId, clientId, event, channel, context,
      });
      if (result) results.push(result);
    } catch (e) {
      // Log error but continue with other channels
      console.error(`Communication failed for ${event}/${channel}:`, e.message);
    }
  }
  return results;
};

/** Get the premium payer client for a policy. */
const getPremiumPayerClient = async (tenantId, policyId) => {
  const party = await findOne(tenantId, 'policy_party', {
    'data.policy': policyId,
    'data.role': 'premium_payer',
  });
  return party ? dataOf(party).client : null;
};

/** Get the main member client for a policy. */
const getMainMemberClient = async (tenantId, policyId) => {
  const party = await findOne(tenantId, 'policy_party', {
    'data.policy': policyId,
    'data.role': 'main_member',
  });
  return party ? dataOf(party).client : null;
};

/** Build the standard policy context for communications. */
const buildPolicyContext = async (tenantId, policyId, extra = {}) => {
  const context = await commTemplates.buildTemplateContext(tenantId, { policyId, ...extra });

  // Always include premium payer client if not already provided
  if (!context.client && policyId) {
    const party = await findOne(tenantId, 'policy_party', {
      'data.policy': policyId,
      'data.role': 'premium_payer',
    });
    if (party) {
      const client = await findOne(tenantId, 'client', { _id: dataOf(party).client });
      if (client) context.client = dataOf(client);
    }
  }

  return context;
};

// ──────────────────────────────────────────────────────────────────────────────
// BRD §16.1 Payment Communications
// ──────────────────────────────────────────────────────────────────────────────

/** Payment due reminder (before/on due date). */
export const triggerPaymentDue = async ({ tenantId, userId, policyId, transactionId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId, { transactionId });
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'payment_due', context });
};

/** Payment received confirmation. */
export const triggerPaymentReceived = async ({ tenantId, userId, policyId, transactionId, amount, period }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId, { transactionId });
  context.amount = amount;
  context.period = period;
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'payment_received', context });
};

/** Payment failed / debit order failed. */
export const triggerPaymentFailed = async ({ tenantId, userId, policyId, transactionId, reason }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId, { transactionId });
  context.reason = reason;
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'payment_failed', context });
};

/** First missed payment notification. */
export const triggerMissedPayment1 = async ({ tenantId, userId, policyId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'payment_missed_1', context });
};

/** Second missed payment notification. */
export const triggerMissedPayment2 = async ({ tenantId, userId, policyId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'payment_missed_2', context });
};

/** Third missed payment / lapse notification. */
export const triggerMissedPayment3 = async ({ tenantId, userId, policyId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'payment_missed_3', context });
};

/** Overpayment / credit balance notification. */
export const triggerOverpayment = async ({ tenantId, userId, policyId, amount }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  context.amount = amount;
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'overpayment', context });
};

// ──────────────────────────────────────────────────────────────────────────────
// BRD §16.2 Policy Event Communications
// ──────────────────────────────────────────────────────────────────────────────

/** Policy issued - send contract documents and confirmation. */
export const triggerPolicyIssued = async ({ tenantId, userId, policyId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'policy_issued', context });
};

/** Endorsement applied - send updated documents. */
export const triggerPolicyEndorsement = async ({ tenantId, userId, policyId, endorsementId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId, { endorsementId });
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'policy_endorsement', context });
};

/** Policy approved (after underwriting approval). */
export const triggerPolicyApproved = async ({ tenantId, userId, policyId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'policy_approved', context });
};

/** Policy rejected. */
export const triggerPolicyRejected = async ({ tenantId, userId, policyId, reason }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  context.reason = reason;
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'policy_rejected', context });
};

/** Policy lapsed. */
export const triggerPolicyLapsed = async ({ tenantId, userId, policyId, missedCount }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  context.missedCount = missedCount;
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'policy_lapsed', context });
};

/** Policy reinstated. */
export const triggerPolicyReinstated = async ({ tenantId, userId, policyId, paymentAmount }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  context.paymentAmount = paymentAmount;
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'policy_reinstated', context });
};

/** Policy cancelled. */
export const triggerPolicyCancelled = async ({ tenantId, userId, policyId, reason }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId);
  context.reason = reason;
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'policy_cancelled', context });
};

// ──────────────────────────────────────────────────────────────────────────────
// BRD §16.2 Child Age Events / Age Limit Actions / Waiting Period
// ──────────────────────────────────────────────────────────────────────────────

/** Child approaching/turning age limit (BRD §16.2). */
export const triggerChildAgeEvent = async ({ tenantId, userId, policyId, childId, age, action }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId, { childId });
  context.childAge = age;
  context.ageAction = action; // 'end_cover' | 'move_category' | 'amendment_required'
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'child_age_event', context });
};

/** Waiting period completed for an insured life. */
export const triggerWaitingPeriodComplete = async ({ tenantId, userId, policyId, insuredLifeId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await buildPolicyContext(tenantId, policyId, { insuredLifeId });
  return sendMultiChannel({ tenantId, userId, policyId, clientId, event: 'waiting_period_complete', context });
};

// ──────────────────────────────────────────────────────────────────────────────
// Claims Communications
// ──────────────────────────────────────────────────────────────────────────────

/** Claim reported. */
export const triggerClaimReported = async ({ tenantId, userId, claimId, policyId }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await commTemplates.buildTemplateContext(tenantId, { policyId, claimId });
  return sendMultiChannel({ tenantId, userId, policyId, claimId, clientId, event: 'claim_reported', context });
};

/** Claim approved. */
export const triggerClaimApproved = async ({ tenantId, userId, claimId, policyId, amount }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await commTemplates.buildTemplateContext(tenantId, { policyId, claimId });
  context.approvedAmount = amount;
  return sendMultiChannel({ tenantId, userId, policyId, claimId, clientId, event: 'claim_approved', context });
};

/** Claim declined. */
export const triggerClaimDeclined = async ({ tenantId, userId, claimId, policyId, reason }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await commTemplates.buildTemplateContext(tenantId, { policyId, claimId });
  context.reason = reason;
  return sendMultiChannel({ tenantId, userId, policyId, claimId, clientId, event: 'claim_declined', context });
};

/** Claim paid. */
export const triggerClaimPaid = async ({ tenantId, userId, claimId, policyId, amount }) => {
  const clientId = await getPremiumPayerClient(tenantId, policyId);
  if (!clientId) return [];
  const context = await commTemplates.buildTemplateContext(tenantId, { policyId, claimId });
  context.amount = amount;
  return sendMultiChannel({ tenantId, userId, policyId, claimId, clientId, event: 'claim_paid', context });
};

export default {
  // Payment
  triggerPaymentDue,
  triggerPaymentReceived,
  triggerPaymentFailed,
  triggerMissedPayment1,
  triggerMissedPayment2,
  triggerMissedPayment3,
  triggerOverpayment,
  // Policy events
  triggerPolicyIssued,
  triggerPolicyEndorsement,
  triggerPolicyApproved,
  triggerPolicyRejected,
  triggerPolicyLapsed,
  triggerPolicyReinstated,
  triggerPolicyCancelled,
  // Age events
  triggerChildAgeEvent,
  triggerWaitingPeriodComplete,
  // Claims
  triggerClaimReported,
  triggerClaimApproved,
  triggerClaimDeclined,
  triggerClaimPaid,
  // Core
  resolveTemplate,
  logTemplatedCommunication,
  sendMultiChannel,
  buildPolicyContext,
};