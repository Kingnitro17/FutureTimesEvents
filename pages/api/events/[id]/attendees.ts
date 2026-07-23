// pages/api/events/[id]/attendees.ts
// GET /api/events/[id]/attendees
// Cache-first: tries Redis → Supabase snapshot → live DB fallback.
//
// Response shape:
//   { going_count, interested_count, preview_attendees[], online_count?, cached_at }

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCache, setCache } from '@/lib/cache';

const CACHE_TTL_SECONDS = 30; // Short TTL — see caching-strategy.md for rationale

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const eventId = req.query.id as string;
  if (!eventId) return res.status(400).json({ error: 'Missing event id' });

  const cacheKey = `attendees:${eventId}`;

  // ── 1. Try Redis cache ────────────────────────────────────────
  const cached = await getCache(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=10`);
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  // ── 2. Try pre-aggregated snapshot table ─────────────────────
  const { data: snapshot, error: snapErr } = await supabaseAdmin
    .from('event_attendee_snapshots')
    .select('going_count, interested_count, preview_attendees, computed_at')
    .eq('event_id', eventId)
    .maybeSingle();

  if (!snapErr && snapshot) {
    const payload = {
      going_count:      snapshot.going_count,
      interested_count: snapshot.interested_count,
      preview_attendees: snapshot.preview_attendees,
      cached_at: snapshot.computed_at,
      source: 'snapshot',
    };
    await setCache(cacheKey, payload, CACHE_TTL_SECONDS);
    res.setHeader('Cache-Control', `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=10`);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(payload);
  }

  // ── 3. DB fallback — live aggregation ────────────────────────
  // Only reached if snapshot hasn't been computed yet (new events)
  const { data: rsvps, error: rsvpErr } = await supabaseAdmin
    .from('rsvps')
    .select(`
      status,
      profiles:user_id (
        display_name, avatar_url, avatar_color, initials
      )
    `)
    .eq('event_id', eventId)
    .in('status', ['going', 'interested']);

  if (rsvpErr) {
    return res.status(500).json({ error: rsvpErr.message });
  }

  const going      = rsvps?.filter(r => r.status === 'going')      ?? [];
  const interested = rsvps?.filter(r => r.status === 'interested') ?? [];

  const preview = going
    .slice(0, 12)
    .map(r => (r as any).profiles);

  const payload = {
    going_count:      going.length,
    interested_count: interested.length,
    preview_attendees: preview,
    cached_at: new Date().toISOString(),
    source: 'live',
  };

  await setCache(cacheKey, payload, CACHE_TTL_SECONDS);
  res.setHeader('Cache-Control', `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=10`);
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(payload);
}
