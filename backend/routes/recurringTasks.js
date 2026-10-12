import express from 'express';
import {
  createRecurringTasks,
  getRecurringSeriesEndpoints,
  updateRecurringSeriesEndpoints,
  deleteRecurringSeriesEndpoints,
} from '../controllers/recurringTaskController.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

/**
 * POST /api/v1/recurring-tasks
 * Create a recurring task series
 */
router.post('/', createRecurringTasks);

/**
 * GET /api/v1/recurring-tasks/:seriesId
 * Get all tasks in a recurring series
 */
router.get('/:seriesId', getRecurringSeriesEndpoints);

/**
 * PUT /api/v1/recurring-tasks/:seriesId
 * Update all tasks in a recurring series
 */
router.put('/:seriesId', updateRecurringSeriesEndpoints);

/**
 * DELETE /api/v1/recurring-tasks/:seriesId
 * Delete all tasks in a recurring series
 */
router.delete('/:seriesId', deleteRecurringSeriesEndpoints);

export default router;
