import express from 'express';
import * as tenderController from '../controllers/tender.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @openapi
 * /api/tenders:
 *   get:
 *     summary: Get a filtered, paginated list of tenders
 *     tags: [Tenders]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Max 100
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [closingDate, datePublished, createdAt, tenderNumber, category], default: closingDate }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Free text search across description and tenderNumber
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: province
 *         schema: { type: string }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: organOfState
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: tenderNumber
 *         schema: { type: string }
 *       - in: query
 *         name: eSubmission
 *         schema: { type: boolean }
 *       - in: query
 *         name: briefingCompulsory
 *         schema: { type: boolean }
 *       - in: query
 *         name: datePublishedFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: datePublishedTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: closingDateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: closingDateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: A paginated list of tenders
 *       401:
 *         description: Missing or invalid access token
 *       429:
 *         description: Too many requests - rate limit exceeded
 */
router.get('/', authenticate, tenderController.getTenders);

/**
 * @openapi
 * /api/tenders/{id}:
 *   get:
 *     summary: Get a single tender by its Mongo id or eTenders sourceId
 *     tags: [Tenders]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The matching tender
 *       404:
 *         description: Tender not found
 *       401:
 *         description: Missing or invalid access token
 *       429:
 *         description: Too many requests - rate limit exceeded
 */
router.get('/:id', authenticate, tenderController.getTenderById);

export default router;
