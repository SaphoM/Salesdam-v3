import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Execute database operations within a transaction
 * Automatically rolls back if any operation fails
 */
export const executeWithTransaction = async (operation) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Transaction aborted due to error:', error);
    throw error;
  } finally {
    await session.endSession();
  }
};

export default { executeWithTransaction };
