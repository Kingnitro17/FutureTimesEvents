// pages/api/push/subscribe.ts
// POST /api/push/subscribe
// Saves a browser PushSubscription for the given user.
// Called by lib/usePushSubscription.ts after SW registration.

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, subscription } = req.body as {
    userId: string;
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  };

  if (!userId || !subscription?.endpoint) {
    return res.status(400).json({ error: 'Missing userId or subscription' });
  }

  const { endpoint, keys: { p256dh, auth } } = subscription;

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, endpoint, p256dh, auth },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('[push/subscribe]', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
