// pages/api/events/[id]/verify-phone.ts
// POST /api/events/[id]/verify-phone
// Body: { phone: string }  → sends OTP
// Body: { phone: string, code: string } → checks OTP, marks phone_verified=true

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin, supabaseFromToken } from '@/lib/supabase-server';
import { sendOtp, checkOtp } from '@/workers/twilio-service';

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('263') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10)  return `+263${digits.slice(1)}`;
  if (digits.length === 9) return `+263${digits}`;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const jwt = (req.headers.authorization ?? '').replace('Bearer ', '');
  if (!jwt) return res.status(401).json({ error: 'Not authenticated' });

  const userClient = supabaseFromToken(jwt);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { phone, code } = req.body as { phone?: string; code?: string };
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const e164 = normalizePhone(phone);
  if (!e164) return res.status(400).json({ error: 'Invalid Zimbabwe phone number' });

  // ── Send OTP ─────────────────────────────────────────────────
  if (!code) {
    await sendOtp(e164);
    return res.status(200).json({ ok: true, message: 'OTP sent' });
  }

  // ── Verify OTP ───────────────────────────────────────────────
  const approved = await checkOtp(e164, code);
  if (!approved) return res.status(400).json({ error: 'Invalid or expired code' });

  // Mark phone_verified on any rsvp row for this user
  await supabaseAdmin
    .from('rsvps')
    .update({ phone: e164, phone_verified: true })
    .eq('user_id', user.id);

  return res.status(200).json({ ok: true, phone_verified: true });
}
