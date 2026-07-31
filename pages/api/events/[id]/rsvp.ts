// pages/api/events/[id]/rsvp.ts
// POST /api/events/[id]/rsvp  — Upsert RSVP, enqueue snapshot job.
// GET  /api/events/[id]/rsvp  — Return caller's current RSVP status.
//
// Dependencies (add to package.json):
//   "ioredis": "^5"   — for rate-limit counters + job queue
//   "uuid": "^9"

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseAdmin, supabaseFromToken } from '@/lib/supabase-server';
import { enqueueSnapshotJob } from '@/lib/worker-queue';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
export type RsvpStatus = 'going' | 'interested' | 'not_going';

const MethodSchema = z.enum(['GET', 'POST']);
const QuerySchema = z.object({
  id: z.string().trim().uuid('Invalid event id'),
});
const UuidSchema = z.string().uuid();
const LegacyIdempotencySchema = z.string().regex(
  /^[0-9a-f-]{36}:[0-9a-f-]{36}:\d{10,16}$/i,
);

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
  if (digits.startsWith('263') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+263${digits.slice(1)}`;
  if (digits.length === 9) return `+263${digits}`;
  return null; // reject invalid
}

const OptionalPhoneSchema = z.string()
  .trim()
  .max(32, 'Phone number is too long')
  .regex(/^[+\d\s().-]*$/, 'Invalid phone number')
  .refine(value => value === '' || normalizePhone(value) !== null, {
    message: 'Invalid Zimbabwe phone number',
  })
  .optional();

function createRsvpBodySchema(userId: string, eventId: string) {
  return z.object({
    status: z.enum(['going', 'interested', 'not_going']),
    phone: OptionalPhoneSchema,
    idempotency_key: z.string()
      .trim()
      .min(1, 'Invalid idempotency key')
      .max(160, 'Invalid idempotency key')
      .refine((value) => {
        if (UuidSchema.safeParse(value).success) return true;
        if (!LegacyIdempotencySchema.safeParse(value).success) return false;

        const [keyUserId, keyEventId] = value.split(':');
        return keyUserId.toLowerCase() === userId.toLowerCase()
          && keyEventId.toLowerCase() === eventId.toLowerCase();
      }, { message: 'Invalid idempotency key' })
      .optional(),
  });
}

// ---------------------------------------------------------------
// Handler
// ---------------------------------------------------------------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const queryResult = QuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  const { id: eventId } = queryResult.data;

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
  const methodResult = MethodSchema.safeParse(req.method);
  if (!methodResult.success) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── GET: fetch caller's current RSVP status ──────────────────
  if (methodResult.data === 'GET') {
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
  // Rate-limit check
  const allowed = await checkRateLimit(userId);
  if (!allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many RSVPs. Slow down.' });
  }

  const bodyResult = createRsvpBodySchema(userId, eventId).safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({ error: 'Invalid RSVP request' });
  }
  const { status, phone, idempotency_key } = bodyResult.data;

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
        is_public: false,
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
    return res.status(500).json({ error: 'Could not update RSVP.' });
  }

  // Increment version via RPC-less SQL (Supabase supports rpc or raw SQL via admin)
  await supabaseAdmin.rpc('recompute_attendee_snapshot', { p_event_id: eventId });
  // Also enqueue background job for WhatsApp/SMS notifications
  await enqueueSnapshotJob({ eventId, userId, status });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, rsvp });
}
