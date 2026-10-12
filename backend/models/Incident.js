import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        mimeType: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    upvoteCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    upvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    editHistory: [
      {
        editedAt: {
          type: Date,
          default: Date.now,
        },
        editedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changes: {
          type: Map,
          of: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
incidentSchema.index({ tenantId: 1, status: 1 });
incidentSchema.index({ tenantId: 1, priority: 1 });
incidentSchema.index({ tenantId: 1, createdAt: -1 });
incidentSchema.index({ tenantId: 1, upvoteCount: -1 });

export default mongoose.model('Incident', incidentSchema);
