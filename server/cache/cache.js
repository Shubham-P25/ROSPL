/**
 * cache/cache.js
 * MongoDB cache with stale-while-revalidate pattern.
 * Uses soft expiration (freshUntil) and hard TTL deletion (expiresAt).
 */
const mongoose = require("mongoose");

const CacheSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, index: true },
    value: mongoose.Schema.Types.Mixed,
    freshUntil: Date,
    expiresAt: { type: Date, index: { expires: 0 } },
  },
  { versionKey: false, timestamps: true },
);

// If model already exists, use it; otherwise create it
const Cache = mongoose.models.Cache || mongoose.model("Cache", CacheSchema);

// In-memory fallback map if Mongo is disconnected or in memory-only test mode
const inMemoryCache = new Map();

async function cacheGet(key) {
  try {
    if (mongoose.connection.readyState === 1) {
      const doc = await Cache.findOne({ key }).lean();
      if (!doc) return null;
      return {
        value: doc.value,
        stale: new Date(doc.freshUntil) < new Date(),
      };
    }
  } catch (_err) {
    // MongoDB error - fallback to in-memory
  }

  const mem = inMemoryCache.get(key);
  if (!mem) return null;
  if (mem.expiresAt && mem.expiresAt < Date.now()) {
    inMemoryCache.delete(key);
    return null;
  }
  return {
    value: mem.value,
    stale: mem.freshUntil < Date.now(),
  };
}

async function cacheSet(
  key,
  value,
  { freshMs = 86400000, hardMs = 30 * 864e5 } = {},
) {
  const now = Date.now();
  const freshUntil = new Date(now + freshMs);
  const expiresAt = new Date(now + hardMs);

  try {
    if (mongoose.connection.readyState === 1) {
      await Cache.updateOne(
        { key },
        {
          $set: {
            value,
            freshUntil,
            expiresAt,
          },
        },
        { upsert: true },
      );
      return;
    }
  } catch (_err) {
    // MongoDB error - fallback to in-memory
  }

  inMemoryCache.set(key, {
    value,
    freshUntil: now + freshMs,
    expiresAt: now + hardMs,
  });
}

module.exports = {
  Cache,
  cacheGet,
  cacheSet,
  inMemoryCache,
};
