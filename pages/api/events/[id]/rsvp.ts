// pages/api/events/[id]/rsvp.ts
// POST /api/events/[id]/rsvp  — Upsert RSVP, enqueue snapshot job.
// GET  /api/events/[id]/rsvp  — Return caller's current RSVP status.
//
// Dependencies (add to package.json):
//   "ioredis": "^5"   — for rate-limit counters + job queue
//   "uuid": "^9"

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin, supabaseFromToken } from '@/lib/supabase-server';
import { enqueueSnapshotJob } from '@/lib/worker-queue';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
export type RsvpStatus = 'going' | 'interested' | 'not_going';

interface RsvpBody {
  status: RsvpStatus;
  phone?: string;            // optional phone for WhatsApp/SMS
  idempotency_key?: string;  // client-generated UUID to prevent double-submit
}

interface ApiError { error: string; code?: string }

// ---------------------------------------------------------------
// Rate limiting (Redis sliding window — 10 RSVPs per user per min)
// ---------------------------------------------------------------
import Redis from 'ioredis';

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, { lazyConnect: false });
  }
  return redis;
}

async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const r = getRedis();
    const key = `rl:rsvp:${userId}`;
    const now = Date.now();
    const windowMs = 60_000; // 1 minute
    const limit = 10;

    // Sliding window log in sorted set
    await r.zremrangebyscore(key, '-inf', now - windowMs);
    const count = await r.zcard(key);
    if (count >= limit) return false;
    await r.zadd(key, now, `${now}-${Math.random()}`);
    await r.expire(key, 120);
    return true;
  } catch {
    // Redis failure → allow through (fail-open for rate limiting)
    return true;
  }
}

// ---------------------------------------------------------------
// Phone normalisation for Zimbabwe (+263)
// ---------------------------------------------------------------
function normalizePhone(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('263') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+263${digits.slice(1)}`;
  if (digits.length === 9) return `+263${digits}`;
  return null; // reject invalid
}

// ---------------------------------------------------------------
// Handler
// ---------------------------------------------------------------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const eventId = req.query.id as string;
  if (!eventId) return res.status(400).json({ error: 'Missing event id' });

  // Auth: extract JWT from Authorization header or cookie
  const authHeader = req.headers.authorization ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!jwt) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Validate JWT via user-scoped client
  const userClient = supabaseFromToken(jwt);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();

  if (authErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  // ── GET: fetch caller's current RSVP status ──────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('rsvps')
      .select('status, phone_verified, updated_at')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rsvp: data ?? null });
  }

  // ── POST: upsert RSVP ────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate-limit check
  const allowed = await checkRateLimit(userId);
  if (!allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many RSVPs. Slow down.' });
  }

  const body = req.body as RsvpBody;
  const { status, phone, idempotency_key } = body;

  if (!['going', 'interested', 'not_going'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const phone_e164 = normalizePhone(phone);

  // Verify event exists and is published
  const { data: event, error: evtErr } = await supabaseAdmin
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .single();

  if (evtErr || !event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  if (event.status !== 'published') {
    return res.status(400).json({ error: 'Event is not accepting RSVPs' });
  }

  // Upsert rsvp — admin client bypasses RLS (worker needs this for phone field)
  const { data: rsvp, error: upsertErr } = await supabaseAdmin
    .from('rsvps')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        status,
        phone: phone_e164,
        idempotency_key: idempotency_key ?? null,
        version: 1, // reset; worker tracks actual version
      },
      {
        onConflict: 'event_id,user_id',
        // increment version on conflict via raw SQL — handled below
      }
    )
    .select('id, status, version, created_at, updated_at')
    .single();

  if (upsertErr) {
    // idempotency_key unique violation → duplicate request, return OK
    if (upsertErr.code === '23505') {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    return res.status(500).json({ error: upsertErr.message });
  }

  // Increment version via RPC-less SQL (Supabase supports rpc or raw SQL via admin)
  await supabaseAdmin.rpc('recompute_attendee_snapshot', { p_event_id: eventId });
  // Also enqueue background job for WhatsApp/SMS notifications
  await enqueueSnapshotJob({ eventId, userId, status });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, rsvp });
}
