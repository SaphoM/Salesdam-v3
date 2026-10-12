import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 300,
  message: { success: false, message: 'Too many requests. Rate limit: 300/min.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use tenantId + userId as the rate limit key
    return `${req.tenantId || req.ip}:${req.user?._id || req.ip}`;
  },
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Webhook rate limit exceeded.' },
});

export { authLimiter, apiLimiter, webhookLimiter };
