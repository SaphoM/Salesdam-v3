import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    redisClient = new Redis(config);

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => {
      logger.warn('Redis connection error (queues disabled):', err.message);
    });

    redisClient.connect().catch((err) => {
      logger.warn('Redis not available, queues will be disabled:', err.message);
      redisClient = null;
    });
  }
  return redisClient;
};

const isRedisAvailable = () => redisClient && redisClient.status === 'ready';

export { getRedisClient, isRedisAvailable };
