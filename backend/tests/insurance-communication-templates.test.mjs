/**
 * Communication template system tests (BRD §16.3).
 *
 * Run: node --test tests/insurance-communication-templates.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTemplate,
  buildTemplateContext,
  renderCommunication,
  renderTemplateById,
  TEMPLATE_CHANNELS,
  TEMPLATE_CATEGORIES,
} from '../services/insurance/communicationTemplates.js';

test('renderTemplate substitutes {{field}} with context value', () => {
  const tpl = 'Hello {{client.name}}, your policy {{policy.policy_number}} is active.';
  const ctx = { client: { name: 'John' }, policy: { policy_number: 'POL-00001' } };
  assert.equal(renderTemplate(tpl, ctx), 'Hello John, your policy POL-00001 is active.');
});

test('renderTemplate leaves unknown fields as placeholder', () => {
  const tpl = 'Hello {{client.name}}, your ref is {{unknown.field}}.';
  const ctx = { client: { name: 'John' } };
  assert.equal(renderTemplate(tpl, ctx), 'Hello John, your ref is {{unknown.field}}.');
});

test('renderCommunication returns subject and body', () => {
  const tpl = { subject: 'Policy {{policy.policy_number}}', body: 'Dear {{client.name}},' };
  const ctx = { policy: { policy_number: 'POL-00001' }, client: { name: 'Jane' } };
  const r = renderCommunication(tpl, ctx);
  assert.equal(r.subject, 'Policy POL-00001');
  assert.equal(r.body, 'Dear Jane,');
});

test('buildTemplateContext includes now and today', async () => {
  const ctx = await buildTemplateContext('tenant1', { policyId: null });
  assert.ok(ctx.now);
  assert.ok(ctx.today);
  assert.match(ctx.today, /^\d{4}-\d{2}-\d{2}$/);
});

test('TEMPLATE_CHANNELS has expected values', () => {
  assert.deepEqual(TEMPLATE_CHANNELS, ['email', 'whatsapp', 'sms', 'post']);
});

test('TEMPLATE_CATEGORIES includes all BRD §16 events', () => {
  const required = [
    'payment_due', 'payment_received', 'payment_failed',
    'payment_missed_1', 'payment_missed_2', 'payment_missed_3',
    'policy_issued', 'policy_lapsed', 'policy_reinstated', 'policy_cancelled',
    'child_age_event', 'age_limit_action', 'waiting_period_complete',
  ];
  for (const c of required) {
    assert.ok(TEMPLATE_CATEGORIES.includes(c), `Missing category: ${c}`);
  }
});

test('nested field paths work', () => {
  const tpl = 'Cover: {{policy.lives.0.cover_amount}}';
  const ctx = { policy: { lives: [{ cover_amount: 50000 }] } };
  assert.equal(renderTemplate(tpl, ctx), 'Cover: 50000');
});

test('array index access works', () => {
  const tpl = 'First child: {{policy.lives.1.name}}';
  const ctx = { policy: { lives: [{ name: 'Main' }, { name: 'Child1' }] } };
  assert.equal(renderTemplate(tpl, ctx), 'First child: Child1');
});