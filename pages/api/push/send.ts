// pages/api/push/send.ts
// POST /api/push/send
// Privileged route for sending Web Push notifications to a user's browsers.
//
// Authorization:
// - an active admin/super_admin Supabase session, or
// - x-internal-push-secret matching PUSH_INTERNAL_SECRET for trusted workers.

import { createHash, timingSafeEqual } from 'node:crypto';
import { createServerClient, serializeCookieHeader } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import webpush from 'web-push';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/types/database';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const SendSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long'),
  body: z.string().trim().min(1, 'Body is required').max(500, 'Body is too long'),
  url: z.string()
    .trim()
    .max(2048, 'URL is too long')
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
      message: 'URL must be a same-origin path',
    })
    .optional(),
}).strict();

interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

type SenderAuthorization =
  | { ok: true; rateKey: string }
  | { ok: false; status: 401 | 403 | 500; error: string };

let vapidConfigured = false;

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

function internalSecretHeader(req: NextApiRequest): string | null {
  return firstHeader(req.headers['x-internal-push-secret']);
}

function isValidInternalSecret(value: string): boolean {
  const configuredSecret = process.env.PUSH_INTERNAL_SECRET;
  if (!configuredSecret) return false;

  const suppliedDigest = createHash('sha256').update(value).digest();
  const configuredDigest = createHash('sha256').update(configuredSecret).digest();
  return timingSafeEqual(suppliedDigest, configuredDigest);
}

async function authorizeSender(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<SenderAuthorization> {
  const internalSecret = internalSecretHeader(req);
  if (internalSecret !== null) {
    if (!isValidInternalSecret(internalSecret)) {
      return { ok: false, status: 401, error: 'Invalid internal credentials' };
    }
    return { ok: true, rateKey: `internal:${clientIp(req)}` };
  }

  const supabase = createRequestClient(req, res);
  const user = await getVerifiedUser(supabase, req);
  if (!user) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[push/send] Sender profile lookup failed:', error.message);
    return { ok: false, status: 500, error: 'Unable to verify sender' };
  }

  if (
    !profile
    || profile.account_status !== 'active'
    || !['admin', 'super_admin'].includes(profile.role)
  ) {
    return { ok: false, status: 403, error: 'Insufficient permissions' };
  }

  return { ok: true, rateKey: `admin:${user.id}` };
}

function configureVapid(): void {
  if (vapidConfigured) return;

  const email = process.env.VAPID_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!email || !publicKey || !privateKey) {
    throw new Error('VAPID configuration is incomplete');
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  vapidConfigured = true;
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

  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: 'Invalid notification',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const authorization = await authorizeSender(req, res);
    if (!authorization.ok) {
      return res.status(authorization.status).json({ error: authorization.error });
    }

    if (!takeRateLimit(authorization.rateKey, RATE_LIMIT_MAX)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Push send rate limit exceeded. Please wait.' });
    }

    const admin = getSupabaseAdminClient();
    const pushAdmin = admin as unknown as SupabaseClient;
    const { data, error: fetchError } = await pushAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', parsed.data.userId);

    if (fetchError) {
      console.error('[push/send] Subscription lookup failed:', fetchError.message);
      return res.status(500).json({ error: 'Unable to load push subscriptions' });
    }

    const subscriptions = (data ?? []) as PushSubscriptionRecord[];
    if (subscriptions.length === 0) {
      return res.status(200).json({
        ok: true,
        sent: 0,
        skipped: 'no subscriptions',
      });
    }

    try {
      configureVapid();
    } catch (error) {
      console.error(
        '[push/send] VAPID setup failed:',
        error instanceof Error ? error.message : 'unknown',
      );
      return res.status(503).json({ error: 'Push delivery is not configured' });
    }

    const payload = JSON.stringify({
      title: parsed.data.title,
      body: parsed.data.body,
      url: parsed.data.url ?? '/',
    });

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        )
      ),
    );

    const expiredEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason as { statusCode?: number };
        if (error?.statusCode === 410) {
          expiredEndpoints.push(subscriptions[index].endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      const { error: cleanupError } = await pushAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', parsed.data.userId)
        .in('endpoint', expiredEndpoints);

      if (cleanupError) {
        console.error('[push/send] Expired subscription cleanup failed:', cleanupError.message);
      }
    }

    const sent = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - sent;

    return res.status(200).json({ ok: true, sent, failed });
  } catch (error) {
    console.error(
      '[push/send] Unexpected error:',
      error instanceof Error ? error.message : 'unknown',
    );
    return res.status(500).json({ error: 'Push notification failed' });
  }
}
