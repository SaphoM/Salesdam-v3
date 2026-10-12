import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'record_assigned', 'record_updated', 'record_mentioned',
      'automation_failed', 'automation_completed',
      'user_invited', 'task_due',
      'payment_success', 'payment_failed', 'payment_reminder',
      'subscription_created', 'subscription_disabled',
      'system', 'custom',
    ],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String },
  message: { type: String }, // Alias for body for backward compatibility
  link: { type: String }, // URL to navigate to when clicked
  icon: { type: String, default: 'Bell' },
  severity: { type: String, enum: ['info', 'success', 'warning', 'error', 'critical'], default: 'info' },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  data: { type: mongoose.Schema.Types.Mixed }, // Additional payload
  expiresAt: { type: Date },
}, {
  timestamps: true,
});

notificationSchema.index({ tenantId: 1, userId: 1, isRead: 1, createdAt: -1 });
// TTL: auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('Notification', notificationSchema);
