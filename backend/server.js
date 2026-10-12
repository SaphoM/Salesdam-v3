import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;

const isProd = process.env.NODE_ENV === 'production';

process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', err);
  if (isProd) process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  if (isProd) process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

await connectDB();

app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
