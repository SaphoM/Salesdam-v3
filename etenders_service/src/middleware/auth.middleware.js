import env from '../config/env.js';

/**
 * Accepts either:
 *   Authorization: Bearer <token>
 *   x-api-key: <token>
 * and checks it against the configured API_ACCESS_TOKENS list.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;
  const apiKeyHeader = req.headers['x-api-key'];

  const token = bearerToken || apiKeyHeader;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Missing access token. Provide it via the Authorization: Bearer header or x-api-key header.',
    });
  }

  if (!env.apiAccessTokens.includes(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid access token.',
    });
  }

  return next();
};

export default authenticate;
