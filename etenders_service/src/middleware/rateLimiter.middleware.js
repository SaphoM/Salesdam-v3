import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import env from '../config/env.js';

/**
 * Rate limits are keyed by the caller's access token when one is present
 * (so each client/token gets its own bucket regardless of shared IPs/NAT),
 * falling back to IP address (via express-rate-limit's IPv6-safe helper)
 * for unauthenticated requests.
 */
const keyGenerator = (req) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;
  const apiKeyHeader = req.headers['x-api-key'];
  const token = bearerToken || apiKeyHeader;

  return token || ipKeyGenerator(req.ip);
};

const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again later.',
  });
};

/**
 * General limiter applied to all /api routes.
 */
export const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true, // adds RateLimit-* headers
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});

/**
 * Stricter limiter for the manual sync endpoint, since each call triggers
 * a full fetch-and-upsert cycle against the eTenders source.
 */
export const adminLimiter = rateLimit({
  windowMs: env.adminRateLimitWindowMs,
  max: env.adminRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});
