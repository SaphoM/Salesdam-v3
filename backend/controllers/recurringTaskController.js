import DynamicRecord from '../models/DynamicRecord.js';
import ObjectMeta from '../models/ObjectMeta.js';
import {
  asyncHandler,
  sendSuccess,
  AppError,
} from '../utils/errors.js';
import recurringTaskService from '../services/recurringTaskService.js';
import logger from '../utils/logger.js';

/**
 * POST /api/v1/recurring-tasks
 * Create a recurring task series
 */
const createRecurringTasks = asyncHandler(async (req, res) => {
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
  } = req.body;

  // Validate required fields
  if (!subject || !department || !recurrence_cadence || !recurrence_count || !recurrence_start_date) {
    throw new AppError(
      'Subject, department, recurrence cadence, count, and start date are required',
      400,
    );
  }

  if (recurrence_count <= 0) {
    throw new AppError('Recurrence count must be greater than 0', 400);
  }

  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(recurrence_cadence)) {
    throw new AppError('Invalid recurrence cadence', 400);
  }

  try {
    // Fetch task object metadata
    const taskObject = await ObjectMeta.findOne({
      tenantId: req.user.tenantId,
      apiName: 'task',
    });

    if (!taskObject) {
      throw new AppError('Task object not found', 404);
    }

    // Generate recurring task instances
    const recurringData = recurringTaskService.generateRecurringTasks({
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
      tenantId: req.user.tenantId,
      createdBy: req.user._id,
    });

    // Insert all tasks
    const tasksToInsert = recurringData.tasks.map((task) => {
      const record = new DynamicRecord({
        tenantId: task.tenantId,
        objectId: taskObject._id,
        objectApiName: 'task',
        ownerId: task.createdBy,
        createdBy: task.createdBy,
        lastModifiedBy: task.createdBy,
      });

      // Set all field values in the data map
      Object.entries(task).forEach(([key, value]) => {
        if (!['tenantId', 'createdBy'].includes(key)) {
          record.setField(key, value);
        }
      });

      return record;
    });

    const insertedTasks = await DynamicRecord.insertMany(tasksToInsert);

    logger.info(
      `Created recurring task series ${recurringData.seriesId} with ${insertedTasks.length} occurrences`,
    );

    sendSuccess(res, {
      data: {
        seriesId: recurringData.seriesId,
        cadence: recurringData.cadence,
        occurrenceCount: recurringData.occurrenceCount,
        startDate: recurringData.startDate,
        endDate: recurringData.endDate,
        taskCount: insertedTasks.length,
        tasks: insertedTasks,
      },
      message: `Recurring task series created with ${insertedTasks.length} occurrences`,
    });
  } catch (error) {
    logger.error('Error creating recurring tasks:', error);
    throw new AppError(error.message || 'Failed to create recurring tasks', 400);
  }
});

/**
 * GET /api/v1/recurring-tasks/:seriesId
 * Get all tasks in a recurring series
 */
const getRecurringSeriesEndpoints = asyncHandler(async (req, res) => {
  const { seriesId } = req.params;

  const tasks = await DynamicRecord.find({
    objectApiName: 'task',
    tenantId: req.user.tenantId,
    series_id: seriesId,
    isDeleted: false,
  }).sort({ occurrence_index: 1 });

  if (!tasks || tasks.length === 0) {
    throw new AppError('Recurring series not found', 404);
  }

  const firstTask = tasks[0];
  const seriesInfo = {
    seriesId: firstTask.series_id,
    cadence: firstTask.recurrence_cadence,
    occurrenceCount: firstTask.recurrence_count,
    startDate: firstTask.recurrence_start_date,
    endDate: firstTask.recurrence_end_date,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
  };

  sendSuccess(res, {
    data: {
      series: seriesInfo,
      tasks,
    },
  });
});

/**
 * PUT /api/v1/recurring-tasks/:seriesId
 * Update all tasks in a recurring series
 */
const updateRecurringSeriesEndpoints = asyncHandler(async (req, res) => {
  const { seriesId } = req.params;
  const updates = req.body;

  // Prevent updating recurrence configuration
  if (
    updates.recurrence_cadence
    || updates.recurrence_count
    || updates.series_id
  ) {
    throw new AppError('Cannot modify recurrence configuration', 400);
  }

  // Check if series exists
  const existingTasks = await DynamicRecord.find({
    objectApiName: 'task',
    tenantId: req.user.tenantId,
    series_id: seriesId,
    isDeleted: false,
  });

  if (!existingTasks || existingTasks.length === 0) {
    throw new AppError('Recurring series not found', 404);
  }

  // Update all tasks in series
  const result = await DynamicRecord.updateMany(
    {
      objectApiName: 'task',
      tenantId: req.user.tenantId,
      series_id: seriesId,
      isDeleted: false,
    },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
  );

  logger.info(`Updated ${result.modifiedCount} tasks in series ${seriesId}`);

  sendSuccess(res, {
    data: {
      seriesId,
      updatedCount: result.modifiedCount,
    },
    message: `Updated ${result.modifiedCount} tasks in the recurring series`,
  });
});

/**
 * DELETE /api/v1/recurring-tasks/:seriesId
 * Delete all tasks in a recurring series
 */
const deleteRecurringSeriesEndpoints = asyncHandler(async (req, res) => {
  const { seriesId } = req.params;

  // Check if series exists
  const existingTasks = await DynamicRecord.find({
    objectApiName: 'task',
    tenantId: req.user.tenantId,
    series_id: seriesId,
    isDeleted: false,
  });

  if (!existingTasks || existingTasks.length === 0) {
    throw new AppError('Recurring series not found', 404);
  }

  // Soft delete all tasks in series
  const result = await DynamicRecord.updateMany(
    {
      objectApiName: 'task',
      tenantId: req.user.tenantId,
      series_id: seriesId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    },
  );

  logger.info(`Deleted ${result.modifiedCount} tasks in series ${seriesId}`);

  sendSuccess(res, {
    message: `Deleted ${result.modifiedCount} tasks from the recurring series`,
  });
});

export {
  createRecurringTasks,
  getRecurringSeriesEndpoints,
  updateRecurringSeriesEndpoints,
  deleteRecurringSeriesEndpoints,
};
