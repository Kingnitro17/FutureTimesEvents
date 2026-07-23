// lib/cache.ts
// Redis-backed cache helper with automatic JSON serialisation.
// Falls back gracefully if Redis is unavailable (returns null / no-ops).
//
// Key format spec:
//   attendees:{eventId}          TTL=30s   — attendee snapshot per event
//   rsvp:{userId}:{eventId}      TTL=60s   — caller's own RSVP status
//   event:{eventId}              TTL=300s  — full event object
//
// Rationale for short TTLs:
//   30 s for attendees: RSVP count changes frequently near event day;
//   stale data >30 s would mislead users. Combined with stale-while-revalidate
//   the UX stays snappy. For >10k concurrent users, increase to 60 s and
//   use fan-out-on-write (worker pushes to cache on every RSVP write).

import Redis from 'ioredis';

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      retryStrategy: times => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 1,
    });
    _redis.on('error', () => { /* swallow — we fall back */ });
  }
  return _redis;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Redis unavailable — ignore, DB is source of truth
  }
}

export async function deleteCache(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch { /* ignore */ }
}

/**
 * Invalidate all cache keys for an event (call after RSVP write).
 * Pattern: attendees:{id}, event:{id}
 */
export async function invalidateEventCache(eventId: string): Promise<void> {
  await Promise.allSettled([
    deleteCache(`attendees:${eventId}`),
    deleteCache(`event:${eventId}`),
  ]);
}
