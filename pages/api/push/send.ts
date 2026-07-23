// pages/api/push/send.ts
// POST /api/push/send
// Internal route — sends a Web Push notification to all browser subscriptions
// for a given user. Called by workers or other API routes (never by the client directly).
//
// Body: { userId, title, body, url? }
//
// Required env vars (server-only, never prefix with NEXT_PUBLIC_):
//   VAPID_EMAIL                    — e.g. mailto:you@futuretimesevents.com
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY   — from: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY              — same command, private key

import type { NextApiRequest, NextApiResponse } from 'next';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase-server';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, url } = req.body as {
    userId: string;
    title:  string;
    body:   string;
    url?:   string;
  };

  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'Missing userId, title, or body' });
  }

  // Fetch all push subscriptions for this user
  const { data: subs, error: fetchErr } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (fetchErr) {
    console.error('[push/send] DB error:', fetchErr);
    return res.status(500).json({ error: fetchErr.message });
  }

  if (!subs || subs.length === 0) {
    return res.status(200).json({ ok: true, sent: 0, skipped: 'no subscriptions' });
  }

  const payload = JSON.stringify({ title, body, url: url || '/' });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Remove expired / invalid subscriptions (HTTP 410 Gone)
  const expiredEndpoints: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410) {
        expiredEndpoints.push(subs[i].endpoint);
      }
    }
  });

  if (expiredEndpoints.length > 0) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return res.status(200).json({ ok: true, sent, failed });
}
