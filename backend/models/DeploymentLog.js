import mongoose from 'mongoose';

/**
 * DeploymentLog — record of what was deployed, when, and by whom
 * (Core BRD §13). Scoped to the target tenant of the deployment.
 */
const deploymentLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    sourceTenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    changeSetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChangeSet',
      required: true,
    },
    changeSetName: { type: String, default: '' },

    status: {
      type: String,
      enum: ['deployed', 'blocked', 'rolled_back'],
      required: true,
      index: true,
    },
    componentCount: { type: Number, default: 0 },
    missing: { type: [mongoose.Schema.Types.Mixed], default: [] },
    warnings: { type: [String], default: [] },
    message: { type: String, default: '' },

    // Pre-deployment snapshots so a deployment can be rolled back (§13).
    rollback: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rolledBackAt: { type: Date },
    rolledBackBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

deploymentLogSchema.index({ tenantId: 1, at: -1 });

export default mongoose.model('DeploymentLog', deploymentLogSchema);
