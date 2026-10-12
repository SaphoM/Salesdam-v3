/**
 * ApiKeyUsageLog — one document per API key request.
 * Auto-deleted after 90 days via the TTL index.
 * Written asynchronously (fire-and-forget) so it never slows down the API.
 */
import mongoose from 'mongoose';

const usageLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    keyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey',
      required: true,
      index: true,
    },
    keyPrefix: { type: String, required: true }, // for display without a join
    timestamp: { type: Date, default: Date.now },
    method: { type: String }, // GET POST PUT PATCH DELETE
    path: { type: String }, // /records/contact
    objectApiName: { type: String }, // contact / client / …
    statusCode: { type: Number }, // 200 404 500 …
    responseTime: { type: Number }, // ms
    ip: { type: String },
  },
  {
    timestamps: false, // timestamp field is enough
    versionKey: false,
  },
);

// Auto-delete logs older than 90 days
usageLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

// Fast aggregation queries
usageLogSchema.index({ keyId: 1, timestamp: -1 });
usageLogSchema.index({ tenantId: 1, timestamp: -1 });

export default mongoose.model('ApiKeyUsageLog', usageLogSchema);
