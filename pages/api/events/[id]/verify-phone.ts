// pages/api/events/[id]/verify-phone.ts
// POST /api/events/[id]/verify-phone
// Body: { phone: string }  → sends OTP
// Body: { phone: string, code: string } → checks OTP, marks phone_verified=true

import type { NextApiRequest, NextApiResponse } from 'next';
import Redis from 'ioredis';
import { z } from 'zod';
import { supabaseAdmin, supabaseFromToken } from '@/lib/supabase-server';
import { sendOtp, checkOtp } from '@/workers/twilio-service';

const MethodSchema = z.literal('POST');
const QuerySchema = z.object({
  id: z.string().trim().uuid('Invalid event id'),
});
const OTP_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const OTP_SEND_LIMIT = 3;
const OTP_CHECK_LIMIT = 10;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('263') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10)  return `+263${digits.slice(1)}`;
  if (digits.length === 9) return `+263${digits}`;
  return null;
}

const BodySchema = z.object({
  phone: z.string()
    .trim()
    .min(9, 'Phone number is too short')
    .max(32, 'Phone number is too long')
    .regex(/^[+\d\s().-]+$/, 'Invalid phone number')
    .refine(value => normalizePhone(value) !== null, {
      message: 'Invalid Zimbabwe phone number',
    }),
  code: z.preprocess(
    value => value === '' ? undefined : value,
    z.string()
      .trim()
      .min(4, 'Invalid verification code')
      .max(10, 'Invalid verification code')
      .regex(/^\d+$/, 'Invalid verification code')
      .optional(),
  ),
});

interface LocalRateLimitEntry {
  count: number;
  resetAt: number;
}

const localRateLimits = new Map<string, LocalRateLimitEntry>();
let redis: Redis | null = null;

function checkLocalRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = localRateLimits.get(key);

  if (!existing || existing.resetAt <= now) {
    localRateLimits.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { allowed: true, retryAfter: windowSeconds };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

async function checkOtpRateLimit(
  key: string,
  limit: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      if (!redis) {
        redis = new Redis(redisUrl, {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        });
      }

      const redisKey = `rl:verify-phone:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, OTP_RATE_LIMIT_WINDOW_SECONDS);
      }
      const ttl = await redis.ttl(redisKey);
      return {
        allowed: count <= limit,
        retryAfter: ttl > 0 ? ttl : OTP_RATE_LIMIT_WINDOW_SECONDS,
      };
    } catch {
      // Fall back to an instance-local guard if Redis is temporarily unavailable.
    }
  }

  return checkLocalRateLimit(key, limit, OTP_RATE_LIMIT_WINDOW_SECONDS);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!MethodSchema.safeParse(req.method).success) return res.status(405).end();

  const jwt = (req.headers.authorization ?? '').replace('Bearer ', '');
  if (!jwt) return res.status(401).json({ error: 'Not authenticated' });

  const userClient = supabaseFromToken(jwt);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const queryResult = QuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  const { id: eventId } = queryResult.data;

  const bodyResult = BodySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({ error: 'Invalid phone verification request' });
  }
  const { phone, code } = bodyResult.data;

  const e164 = normalizePhone(phone);
  if (!e164) return res.status(400).json({ error: 'Invalid Zimbabwe phone number' });

  const operation = code ? 'check' : 'send';
  const rateLimit = await checkOtpRateLimit(
    `${operation}:${user.id}:${eventId}`,
    code ? OTP_CHECK_LIMIT : OTP_SEND_LIMIT,
  );
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({
      error: code
        ? 'Too many verification attempts. Try again later.'
        : 'Too many verification codes requested. Try again later.',
    });
  }

  const { data: rsvp, error: rsvpError } = await supabaseAdmin
    .from('rsvps')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (rsvpError) {
    return res.status(500).json({ error: 'Could not verify RSVP ownership' });
  }
  if (!rsvp) {
    return res.status(404).json({ error: 'RSVP not found' });
  }

  // ── Send OTP ─────────────────────────────────────────────────
  if (!code) {
    await sendOtp(e164);
    return res.status(200).json({ ok: true, message: 'OTP sent' });
  }

  // ── Verify OTP ───────────────────────────────────────────────
  const approved = await checkOtp(e164, code);
  if (!approved) return res.status(400).json({ error: 'Invalid or expired code' });

  // Mark only the authenticated user's RSVP for this routed event.
  const { error: updateError } = await supabaseAdmin
    .from('rsvps')
    .update({ phone: e164, phone_verified: true })
    .eq('id', rsvp.id)
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  if (updateError) {
    return res.status(500).json({ error: 'Could not update phone verification' });
  }

  return res.status(200).json({ ok: true, phone_verified: true });
}
