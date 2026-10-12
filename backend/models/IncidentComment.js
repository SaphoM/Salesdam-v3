import mongoose from 'mongoose';

const replySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const incidentCommentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    replies: [replySchema],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
incidentCommentSchema.index({ tenantId: 1, incidentId: 1, createdAt: 1 });

export default mongoose.model('IncidentComment', incidentCommentSchema);
