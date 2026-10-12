import mongoose from 'mongoose';
import env from './env.js';

const connectDb = async () => {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri);

  console.log(`[db] connected to MongoDB at ${env.mongoUri}`);

  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });
};

export default connectDb;
