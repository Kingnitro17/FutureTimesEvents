import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { queueEventReviewNotifications } from '@/lib/events/review';

const schema = z.object({
  eventId: z.string().uuid(),
  organizerNotes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });

  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin.from('profiles').select('role,account_status').eq('id', user.id).maybeSingle();
  if (!profile || profile.account_status !== 'active' || !['event_manager', 'admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Organizer access required.' }, { status: 403 });
  }

  const { data: existing } = await admin.from('events')
    .select('id,organizer_id,status,title,organizer_name,date,time,venue,venue_name,city,capacity,updated_at')
    .eq('id', parsed.data.eventId).maybeSingle();
  if (!existing || (existing.organizer_id !== user.id && !['admin', 'super_admin'].includes(profile.role))) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }
  if (!['draft', 'changes_requested'].includes(existing.status)) {
    return NextResponse.json({ error: 'This event cannot be submitted from its current status.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: event, error } = await admin.from('events').update({
    status: 'pending_review', submitted_at: now, organizer_notes: parsed.data.organizerNotes ?? null,
    review_notes: null,
  }).eq('id', existing.id).select('id,title,organizer_name,date,time,venue,venue_name,city,capacity,updated_at,submitted_at').single();
  if (error || !event) return NextResponse.json({ error: 'Could not submit the event.' }, { status: 500 });

  const notificationError = await queueEventReviewNotifications({
    eventId: event.id,
    action: existing.status === 'changes_requested' ? 'resubmitted' : 'submitted',
    event,
  });
  await admin.from('audit_logs').insert({ actor_id: user.id, action: 'event_submitted', entity_type: 'event', entity_id: event.id,
    before_state: { status: existing.status }, after_state: { status: 'pending_review', notification_error: notificationError } });

  return NextResponse.json({ event, notificationQueued: !notificationError });
}
