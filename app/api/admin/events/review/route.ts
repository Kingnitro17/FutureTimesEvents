import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  eventId: z.string().uuid(),
  action: z.enum(['approve_publish', 'request_changes', 'reject']),
  reason: z.string().trim().max(2000).optional(),
}).superRefine((value, context) => {
  if (value.action !== 'approve_publish' && !value.reason) context.addIssue({ code: 'custom', path: ['reason'], message: 'A reason is required.' });
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid review action.' }, { status: 400 });
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin.from('profiles').select('role,account_status').eq('id', user.id).maybeSingle();
  if (!profile || profile.account_status !== 'active' || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super-admin access required.' }, { status: 403 });
  }
  const { data: existing } = await admin.from('events').select('id,status').eq('id', parsed.data.eventId).maybeSingle();
  if (!existing || existing.status !== 'pending_review') return NextResponse.json({ error: 'Pending event not found.' }, { status: 409 });
  const status = parsed.data.action === 'approve_publish' ? 'published' : parsed.data.action === 'request_changes' ? 'changes_requested' : 'rejected';
  const now = new Date().toISOString();
  const { data: event, error } = await admin.from('events').update({ status, reviewed_by: user.id, reviewed_at: now,
    review_notes: parsed.data.reason ?? null, published_at: status === 'published' ? now : null })
    .eq('id', existing.id).eq('status', 'pending_review').select('id,status').single();
  if (error || !event) return NextResponse.json({ error: 'Review action failed.' }, { status: 500 });
  await admin.from('audit_logs').insert({ actor_id: user.id, action: `event_${parsed.data.action}`, entity_type: 'event', entity_id: event.id,
    before_state: { status: existing.status }, after_state: { status, reason: parsed.data.reason ?? null } });
  return NextResponse.json({ event });
}
