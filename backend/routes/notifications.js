import express from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { asyncHandler, sendSuccess, paginate } from '../utils/errors.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Get user notifications
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const query = { tenantId: req.tenantId, userId: req.user._id };
  if (unreadOnly === 'true') query.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Notification.countDocuments(query),
    Notification.countDocuments({ tenantId: req.tenantId, userId: req.user._id, isRead: false }),
  ]);

  sendSuccess(res, { ...paginate(notifications, total, page, limit), unreadCount });
}));

// Mark as read
router.patch('/:id/read', asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true, readAt: new Date() }
  );
  sendSuccess(res, {}, 'Marked as read');
}));

// Mark all as read
router.patch('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { tenantId: req.tenantId, userId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  sendSuccess(res, {}, 'All notifications marked as read');
}));

export default router;
