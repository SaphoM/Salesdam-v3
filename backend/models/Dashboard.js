import mongoose from 'mongoose';

// ─── Widget sub-schema ────────────────────────────────────────────────────────
const widgetSchema = new mongoose.Schema(
  {
    widgetId: { type: String, required: true }, // client-generated uuid
    type: {
      type: String,
      required: true,
      enum: ['metric', 'bar_chart', 'line_chart', 'pie_chart', 'table', 'text'],
    },
    title: { type: String, default: '' },
    size: {
      type: String,
      enum: ['col-4', 'col-6', 'col-8', 'col-12'],
      default: 'col-6',
    },
    height: {
      type: String,
      enum: ['compact', 'normal', 'tall'],
      default: 'normal',
    },
    order: { type: Number, default: 0 },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

// ─── Sharing sub-schema ───────────────────────────────────────────────────────
const sharingSchema = new mongoose.Schema(
  {
    access: {
      type: String,
      enum: ['private', 'workspace', 'roles', 'users'],
      default: 'private',
    },
    sharedWithRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    sharedWithUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    allowEdit: { type: Boolean, default: false },
    editableByRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    editableByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false },
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const dashboardSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DashboardFolder',
      default: null,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, default: 'LayoutDashboard' },
    color: { type: String, default: '#6366f1' },

    widgets: [widgetSchema],
    sharing: { type: sharingSchema, default: () => ({ access: 'private' }) },
    // Saved dashboard-level filters: [{ field, operator, value, value2 }]
    savedFilters: { type: mongoose.Schema.Types.Mixed, default: [] },

    isDefault: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastViewedAt: { type: Date },
  },
  { timestamps: true },
);

dashboardSchema.index({ tenantId: 1, createdBy: 1 });
dashboardSchema.index({ tenantId: 1, folderId: 1 });

export default mongoose.model('Dashboard', dashboardSchema);
