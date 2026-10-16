import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: { type: String },
    action: {
      type: String,
      required: true,
      enum: [
        'login',
        'logout',
        'login_failed',
        'create',
        'read',
        'update',
        'delete',
        'export',
        'import',
        'permission_change',
        'role_assign',
        'role_remove',
        'tenant_create',
        'tenant_suspend',
        'tenant_delete',
        'user_invite',
        'add_member',
        'user_activate',
        'user_deactivate',
        'automation_run',
        'automation_error',
        'api_key_create',
        'api_key_revoke',
        'webhook_fire',
        'webhook_fail',
        'password_reset',
        'password_reset_requested',
        'password_reset_completed',
        'password_change',
        'email_verified',
        'registration_started',
        'payment_verified',
        'payment_successful',
        'payment_failed',
        'account_reactivated_payment_received',
        'account_suspended_payment_failed',
        'session_revoke',
        'settings_change',
        'admin_export',
        'permanently_delete',
        'generate',
        'incident_create',
        'incident_update',
        'incident_comment_create',
        'merge',
      ],
    },
    resource: { type: String }, // "DynamicRecord", "User", "Role", etc.
    resourceId: { type: String }, // ID of the affected resource
    objectApiName: { type: String }, // For record actions
    details: { type: mongoose.Schema.Types.Mixed }, // Additional context
    ipAddress: { type: String },
    userAgent: { type: String },
    sessionId: { type: String },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    errorMessage: { type: String },
    duration: { type: Number }, // ms
  },
  {
    timestamps: true,
  },
);

// TTL index: auto-delete logs older than 90 days
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, action: 1 });
auditLogSchema.index({ tenantId: 1, userId: 1 });
auditLogSchema.index({ tenantId: 1, resource: 1, resourceId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
