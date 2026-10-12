import express from 'express';
import tenderRoutes from './tender.routes.js';
import adminRoutes from './admin.routes.js';
import { apiLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is up
 */
// Deliberately NOT rate limited - monitoring/load balancer probes may poll this frequently.
router.get('/health', (req, res) => res.json({ success: true, message: 'OK' }));

// General rate limit applies to the tenders and admin APIs only.
router.use('/tenders', apiLimiter, tenderRoutes);
router.use('/admin', apiLimiter, adminRoutes);

export default router;
