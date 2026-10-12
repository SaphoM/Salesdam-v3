import 'dotenv/config';

const parseTokens = (value) =>
  (value || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/etendersDb',

  apiAccessTokens: parseTokens(process.env.API_ACCESS_TOKENS),

  etendersBaseUrl:
    process.env.ETENDERS_BASE_URL ||
    'https://www.etenders.gov.za/Home/PaginatedTenderOpportunities',
  etendersStatus: process.env.ETENDERS_STATUS || '1',
  fetchPageSize: Number(process.env.FETCH_PAGE_SIZE) || 100,
  etendersRequestTimeoutMs:
    Number(process.env.ETENDERS_REQUEST_TIMEOUT_MS) || 30000,

  fetchCronMorning: process.env.FETCH_CRON_MORNING || '0 6 * * *',
  fetchCronEvening: process.env.FETCH_CRON_EVENING || '0 18 * * *',

  runFetchOnStartup: process.env.RUN_FETCH_ON_STARTUP === 'true',

  // Rate limiting
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100, // requests per window, per token/IP
  adminRateLimitWindowMs:
    Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  adminRateLimitMax: Number(process.env.ADMIN_RATE_LIMIT_MAX) || 5,
};

export default env;
