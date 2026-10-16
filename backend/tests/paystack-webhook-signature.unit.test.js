import crypto from 'crypto';

// logger.js uses import.meta.url, which Babel (Jest) cannot transform; the
// signature logic under test does not need it.
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn() {}, info() {}, error() {}, debug() {} },
}));

import paystackService from '../services/paystackService.js';

// Regression test: signatures must be verified over the raw request bytes.
// Re-serializing the parsed body (the old behavior) can change whitespace/key
// order and silently break verification.
describe('paystackService.verifyWebhookSignature', () => {
  const ORIGINAL_KEY = paystackService.secretKey;
  const TEST_KEY = 'sk_test_unit_signature_key';
  const raw = Buffer.from(
    '{"event":"charge.success","data":{"reference":"ref_1"}}',
    'utf8',
  );
  const sign = (payload) =>
    crypto.createHmac('sha512', TEST_KEY).update(payload).digest('hex');

  beforeAll(() => {
    paystackService.secretKey = TEST_KEY;
  });
  afterAll(() => {
    paystackService.secretKey = ORIGINAL_KEY;
  });

  test('accepts a signature computed over the raw body bytes', () => {
    expect(paystackService.verifyWebhookSignature(sign(raw), raw)).toBe(true);
  });

  test('accepts a string raw body', () => {
    expect(
      paystackService.verifyWebhookSignature(sign(raw.toString('utf8')), raw.toString('utf8')),
    ).toBe(true);
  });

  test('rejects a tampered body', () => {
    const tampered = Buffer.from(
      '{"event":"charge.success","data":{"reference":"ref_2"}}',
      'utf8',
    );
    expect(paystackService.verifyWebhookSignature(sign(raw), tampered)).toBe(false);
  });

  test('rejects missing, empty, or malformed signatures', () => {
    expect(paystackService.verifyWebhookSignature(undefined, raw)).toBe(false);
    expect(paystackService.verifyWebhookSignature('', raw)).toBe(false);
    expect(paystackService.verifyWebhookSignature('not-hex-at-all', raw)).toBe(false);
  });
});
