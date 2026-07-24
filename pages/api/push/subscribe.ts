// pages/api/push/subscribe.ts
// POST /api/push/subscribe
// Saves the authenticated user's browser PushSubscription.
// Called by lib/usePushSubscription.ts after service-worker registration.

import { createServerClient, serializeCookieHeader } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/types/database';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const SubscriptionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  subscription: z.object({
    endpoint: z.string()
      .trim()
      .url('Invalid push endpoint')
      .max(4096, 'Push endpoint is too long')
      .refine((value) => {
        try {
          return new URL(value).protocol === 'https:';
        } catch {
          return false;
        }
      }, {
        message: 'Push endpoint must use HTTPS',
      }),
    expirationTime: z.number().finite().nonnegative().nullable().optional(),
    keys: z.object({
      p256dh: z.string()
        .trim()
        .min(16, 'Invalid p256dh key')
        .max(256, 'Invalid p256dh key')
        .regex(/^[A-Za-z0-9_-]+={0,2}$/, 'Invalid p256dh key'),
      auth: z.string()
        .trim()
        .min(8, 'Invalid auth key')
        .max(256, 'Invalid auth key')
        .regex(/^[A-Za-z0-9_-]+={0,2}$/, 'Invalid auth key'),
    }).strict(),
  }).strict(),
}).strict();

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '16kb',
    },
  },
};

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function clientIp(req: NextApiRequest): string {
  return (
    firstHeader(req.headers['x-forwarded-for'])?.split(',')[0]?.trim()
    || firstHeader(req.headers['x-real-ip'])
    || req.socket.remoteAddress
    || 'unknown'
  );
}

function isSameOrigin(req: NextApiRequest): boolean {
  const origin = firstHeader(req.headers.origin);
  if (!origin) return true;

  const forwardedHost = firstHeader(req.headers['x-forwarded-host'])
    ?.split(',')[0]
    ?.trim();
  const requestHost = forwardedHost || firstHeader(req.headers.host);
  if (!requestHost) return false;

  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}

function takeRateLimit(key: string, max: number): boolean {
  const now = Date.now();

  if (rateLimitMap.size > 1_000) {
    for (const [entryKey, entry] of rateLimitMap) {
      if (now >= entry.resetAt) rateLimitMap.delete(entryKey);
    }
  }

  const current = rateLimitMap.get(key);

  if (!current || now >= current.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (current.count >= max) return false;
  current.count += 1;

  return true;
}

function createRequestClient(req: NextApiRequest, res: NextApiResponse) {
  const { url, anonKey } = getPublicSupabaseConfig();
  const token = bearerToken(req);

  return createServerClient<Database>(url, anonKey, {
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
    cookies: {
      getAll() {
        return Object.entries(req.cookies).flatMap(([name, value]) =>
          value === undefined ? [] : [{ name, value }]
        );
      },
      setAll(cookiesToSet, headersToSet) {
        const existingHeader = res.getHeader('Set-Cookie');
        const existingCookies = Array.isArray(existingHeader)
          ? existingHeader.map(String)
          : existingHeader
            ? [String(existingHeader)]
            : [];
        const refreshedCookies = cookiesToSet.map(({ name, value, options }) =>
          serializeCookieHeader(name, value, options)
        );

        res.setHeader('Set-Cookie', [...existingCookies, ...refreshedCookies]);
        Object.entries(headersToSet).forEach(([name, value]) => {
          res.setHeader(name, value);
        });
      },
    },
  });
}

function bearerToken(req: NextApiRequest): string | undefined {
  const authorization = firstHeader(req.headers.authorization);
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const token = authorization.slice(7).trim();
  return token || undefined;
}

async function getVerifiedUser(
  supabase: ReturnType<typeof createRequestClient>,
  req: NextApiRequest,
): Promise<User | null> {
  const token = bearerToken(req);
  const {
    data: { user },
    error,
  } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  return error ? null : user;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isSameOrigin(req)) {
    return res.status(403).json({ error: 'Invalid request origin' });
  }

  if (!takeRateLimit(`ip:${clientIp(req)}`, 30)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }

  const parsed = SubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: 'Invalid push subscription',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const supabase = createRequestClient(req, res);
    const user = await getVerifiedUser(supabase, req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (parsed.data.userId !== user.id) {
      return res.status(403).json({ error: 'Subscription user does not match session' });
    }

    if (!takeRateLimit(`user:${user.id}`, RATE_LIMIT_MAX)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Too many subscription requests. Please wait.' });
    }

    const admin = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('account_status')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[push/subscribe] Profile lookup failed:', profileError.message);
      return res.status(500).json({ error: 'Unable to verify account' });
    }

    if (!profile || profile.account_status !== 'active') {
      return res.status(403).json({ error: 'This account cannot subscribe to push notifications' });
    }

    const {
      endpoint,
      keys: { p256dh, auth },
    } = parsed.data.subscription;

    // The client is scoped to the verified session, and the RLS policy also
    // requires auth.uid() = user_id. Never trust the body userId for storage.
    const pushClient = supabase as unknown as SupabaseClient;
    const { error } = await pushClient
      .from('push_subscriptions')
      .upsert(
        { user_id: user.id, endpoint, p256dh, auth },
        { onConflict: 'endpoint' },
      );

    if (error) {
      console.error('[push/subscribe] Subscription save failed:', error.message);
      return res.status(500).json({ error: 'Could not save push subscription' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(
      '[push/subscribe] Unexpected error:',
      error instanceof Error ? error.message : 'unknown',
    );
    return res.status(500).json({ error: 'Push subscription failed' });
  }
}
