import express from 'express';
import authenticate from '../middleware/auth.middleware.js';
import * as apiResponse from '../utils/apiResponse.js';
import { runFetchTendersJob } from '../jobs/fetchTenders.job.js';
import { adminLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/sync:
 *   post:
 *     summary: Manually trigger a fetch-and-store cycle from eTenders
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Sync result summary
 *       401:
 *         description: Missing or invalid access token
 *       429:
 *         description: Too many sync requests - rate limit exceeded
 */
router.post('/sync', authenticate, adminLimiter, async (req, res, next) => {
  try {
    const result = await runFetchTendersJob();
    return apiResponse.success(res, {
      message: 'Sync completed',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
