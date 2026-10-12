import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Calculate end date based on cadence and occurrence count
 * @param {Date} startDate - Start date of recurrence
 * @param {string} cadence - 'daily', 'weekly', 'monthly', 'yearly'
 * @param {number} occurrenceCount - Number of occurrences
 * @returns {Date} Calculated end date
 */
export const calculateEndDate = (startDate, cadence, occurrenceCount) => {
  if (!startDate || !cadence || !occurrenceCount || occurrenceCount <= 0) {
    return null;
  }

  const endDate = new Date(startDate);

  switch (cadence) {
    case 'daily':
      endDate.setDate(endDate.getDate() + (occurrenceCount - 1));
      break;
    case 'weekly':
      endDate.setDate(endDate.getDate() + (7 * (occurrenceCount - 1)));
      break;
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + (occurrenceCount - 1));
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + (occurrenceCount - 1));
      break;
    default:
      return null;
  }

  return endDate;
};

/**
 * Calculate task due date for a specific occurrence
 * @param {Date} startDate - Start date of recurrence
 * @param {string} cadence - 'daily', 'weekly', 'monthly', 'yearly'
 * @param {number} occurrenceIndex - 0-based index of this occurrence
 * @returns {Date} Due date for this occurrence
 */
export const calculateOccurrenceDueDate = (startDate, cadence, occurrenceIndex) => {
  const dueDate = new Date(startDate);

  switch (cadence) {
    case 'daily':
      dueDate.setDate(dueDate.getDate() + occurrenceIndex);
      break;
    case 'weekly':
      dueDate.setDate(dueDate.getDate() + (7 * occurrenceIndex));
      break;
    case 'monthly':
      dueDate.setMonth(dueDate.getMonth() + occurrenceIndex);
      break;
    case 'yearly':
      dueDate.setFullYear(dueDate.getFullYear() + occurrenceIndex);
      break;
    default:
      return null;
  }

  return dueDate;
};

/**
 * Generate recurring task instances
 * @param {Object} taskData - Task data from request
 * @returns {Object} Recurring task configuration and generated task data
 */
export const generateRecurringTasks = (taskData) => {
  const {
    subject,
    description,
    assigned_to,
    due_date,
    status,
    priority,
    department,
    related_to_model,
    related_to_id,
    recurrence_cadence,
    recurrence_count,
    recurrence_start_date,
    tenantId,
    createdBy,
  } = taskData;

  if (
    !recurrence_cadence
    || !recurrence_count
    || recurrence_count <= 0
    || !recurrence_start_date
  ) {
    throw new Error(
      'Recurrence cadence, count (> 0), and start date are required for recurring tasks',
    );
  }

  const seriesId = uuidv4();
  const startDate = new Date(recurrence_start_date);
  const endDate = calculateEndDate(startDate, recurrence_cadence, recurrence_count);

  const tasks = [];

  // Generate task instances for each occurrence
  for (let i = 0; i < recurrence_count; i++) {
    const occurrenceDueDate = calculateOccurrenceDueDate(startDate, recurrence_cadence, i);

    const task = {
      tenantId,
      subject,
      description,
      assigned_to,
      due_date: occurrenceDueDate,
      status: status || 'not_started',
      priority: priority || 'low',
      department,
      related_to_model,
      related_to_id,
      is_recurring: true,
      recurrence_cadence,
      recurrence_count,
      recurrence_start_date: startDate,
      recurrence_end_date: endDate,
      series_id: seriesId,
      occurrence_index: i,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.push(task);
  }

  return {
    seriesId,
    cadence: recurrence_cadence,
    occurrenceCount: recurrence_count,
    startDate,
    endDate,
    tasks,
  };
};

/**
 * Update all tasks in a recurring series
 * @param {string} seriesId - Series ID
 * @param {Object} updates - Fields to update
 * @param {Object} Model - Task model
 * @returns {Promise<Array>} Updated tasks
 */
export const updateRecurringSeries = async (seriesId, updates, Model) => {
  try {
    const updatedTasks = await Model.updateMany(
      { series_id: seriesId },
      { $set: updates },
      { new: true },
    );

    logger.info(`Updated ${updatedTasks.modifiedCount} tasks in series ${seriesId}`);
    return updatedTasks;
  } catch (error) {
    logger.error('Error updating recurring series:', error);
    throw error;
  }
};

/**
 * Delete all tasks in a recurring series
 * @param {string} seriesId - Series ID
 * @param {Object} Model - Task model
 * @returns {Promise<number>} Number of deleted tasks
 */
export const deleteRecurringSeries = async (seriesId, Model) => {
  try {
    const result = await Model.deleteMany({ series_id: seriesId });
    logger.info(`Deleted ${result.deletedCount} tasks in series ${seriesId}`);
    return result.deletedCount;
  } catch (error) {
    logger.error('Error deleting recurring series:', error);
    throw error;
  }
};

/**
 * Get all tasks in a recurring series
 * @param {string} seriesId - Series ID
 * @param {Object} Model - Task model
 * @returns {Promise<Array>} Tasks in series
 */
export const getRecurringSeries = async (seriesId, Model) => {
  try {
    const tasks = await Model.find({ series_id: seriesId }).sort({ occurrence_index: 1 });
    return tasks;
  } catch (error) {
    logger.error('Error fetching recurring series:', error);
    throw error;
  }
};

export default {
  calculateEndDate,
  calculateOccurrenceDueDate,
  generateRecurringTasks,
  updateRecurringSeries,
  deleteRecurringSeries,
  getRecurringSeries,
};
