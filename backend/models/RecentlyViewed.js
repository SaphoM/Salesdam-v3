import mongoose from 'mongoose';

/**
 * RecentlyViewed — per-user record view history, powering the "Recently Viewed"
 * list view.
 *
 * Tracked per user rather than as a single timestamp on the record, because a
 * field on DynamicRecord would be global to the tenant and would show a
 * colleague's browsing history as your own.
 */
const recentlyViewedSchema = new mongoose.Schema(
  {
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
    objectApiName: { type: String, required: true, trim: true },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DynamicRecord',
      required: true,
    },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

// One row per (user, record) — viewing again updates the timestamp in place
// rather than growing the collection.
recentlyViewedSchema.index(
  { tenantId: 1, userId: 1, objectApiName: 1, recordId: 1 },
  { unique: true },
);
recentlyViewedSchema.index({ tenantId: 1, userId: 1, objectApiName: 1, viewedAt: -1 });

/** How many records per user/object are kept. */
const MAX_PER_OBJECT = 50;

/**
 * Records a view, fire-and-forget. Never throws — a failure here must not break
 * fetching the record.
 */
recentlyViewedSchema.statics.track = async function track({
  tenantId,
  userId,
  objectApiName,
  recordId,
}) {
  if (!tenantId || !userId || !objectApiName || !recordId) return;
  try {
    await this.updateOne(
      { tenantId, userId, objectApiName, recordId },
      { $set: { viewedAt: new Date() } },
      { upsert: true },
    );

    // Trim the tail so history stays bounded.
    const stale = await this.find({ tenantId, userId, objectApiName })
      .sort({ viewedAt: -1 })
      .skip(MAX_PER_OBJECT)
      .select('_id')
      .lean();
    if (stale.length > 0) {
      await this.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
    }
  } catch {
    // Intentionally silent.
  }
};

/** Returns recordIds for a user/object, most recently viewed first. */
recentlyViewedSchema.statics.recordIdsFor = async function recordIdsFor({
  tenantId,
  userId,
  objectApiName,
  limit = MAX_PER_OBJECT,
}) {
  const rows = await this.find({ tenantId, userId, objectApiName })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .select('recordId')
    .lean();
  return rows.map((r) => r.recordId);
};

export default mongoose.model('RecentlyViewed', recentlyViewedSchema);
