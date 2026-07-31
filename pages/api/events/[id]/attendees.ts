// pages/api/events/[id]/attendees.ts
// GET /api/events/[id]/attendees
// Cache-first: tries Redis → Supabase snapshot → live DB fallback.
//
// Response shape:
//   { going_count, interested_count, preview_attendees[], online_count?, cached_at }

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCache, setCache } from '@/lib/cache';

const CACHE_TTL_SECONDS = 30; // Short TTL — see caching-strategy.md for rationale
const MethodSchema = z.literal('GET');
const QuerySchema = z.object({
  id: z.string().trim().uuid('Invalid event id'),
});

interface AttendeeProfileJoin {
  display_name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  initials: string | null;
}

interface RsvpAttendeeRow {
  user_id: string;
  status: 'going' | 'interested';
  profiles: AttendeeProfileJoin | AttendeeProfileJoin[] | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!MethodSchema.safeParse(req.method).success) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const queryResult = QuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  const { id: eventId } = queryResult.data;

  const cacheKey = `public-attendees:v2:${eventId}`;

  // ── 1. Try Redis cache ────────────────────────────────────────
  const cached = await getCache(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=10`);
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  // ── 2. Try pre-aggregated snapshot table ─────────────────────
  // ── 3. DB fallback — live aggregation ────────────────────────
  // Only reached if snapshot hasn't been computed yet (new events)
  const { data: rsvps, error: rsvpErr } = await supabaseAdmin
    .from('rsvps')
    .select(`
      user_id,
      status,
      profiles:user_id (
        display_name, avatar_url, avatar_color, initials
      )
    `)
    .eq('event_id', eventId)
    .eq('is_public', true)
    .in('status', ['going', 'interested']);

  if (rsvpErr) {
    return res.status(500).json({ error: 'Could not load attendees.' });
  }

  const rows = (rsvps ?? []) as unknown as RsvpAttendeeRow[];
  const going = rows.filter(row => row.status === 'going');
  const interested = rows.filter(row => row.status === 'interested');

  const preview = going
    .slice(0, 12)
    .flatMap((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      if (!profile) return [];

      return [{
        user_id: row.user_id,
        display_name: profile.display_name ?? 'Guest',
        avatar_url: profile.avatar_url ?? '',
        avatar_color: profile.avatar_color ?? '#7222E3',
        initials: profile.initials ?? '',
      }];
    });

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
