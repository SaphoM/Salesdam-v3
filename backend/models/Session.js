import mongoose from 'mongoose';

/**
 * Session model — manual session management, replacing connect-mongo.
 * Each document represents one active user session.
 */
const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
    },

    // Arbitrary session payload (mirrors express-session session object)
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    expiresAt: {
      type: Date,
      required: true,
      // index: true, // used by TTL + manual cleanup
    },

    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },

    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true, // adds createdAt / updatedAt
  },
);

// MongoDB TTL index: automatically removes expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookups by userId (e.g. "invalidate all sessions for this user")
sessionSchema.index({ userId: 1 });
sessionSchema.index({ tenantId: 1 });

/**
 * Mark session as accessed now (resets lastAccessedAt + extends TTL).
 * @param {number} maxAgeMs  - Session lifetime in ms (default 24 h)
 */
sessionSchema.methods.touch = async function (maxAgeMs = 86400000) {
  this.lastAccessedAt = new Date();
  this.expiresAt = new Date(Date.now() + maxAgeMs);
  return this.save();
};

/**
 * Static: destroy all sessions belonging to a user (e.g. on password change).
 */
sessionSchema.statics.destroyAllForUser = function (userId) {
  return this.deleteMany({ userId });
};

/**
 * Static: purge all expired sessions (manual cleanup fallback).
 */
sessionSchema.statics.purgeExpired = function () {
  return this.deleteMany({ expiresAt: { $lte: new Date() } });
};

export default mongoose.model('Session', sessionSchema);
