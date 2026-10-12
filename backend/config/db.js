import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  const options = {
    maxPoolSize: 100,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 90000,
    family: 4,
  };

  const conn = await mongoose.connect(process.env.MONGO_URI, options);

  // Log queries in development
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', false); // set to true to log all queries
  }

  logger.info(`MongoDB Connected: ${conn.connection.host}`);

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  return conn;
};

export default connectDB;
