import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const paramsSchema = z.object({ id: z.string().uuid() });
const actionSchema = z.object({ going: z.boolean() });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event.' }, { status: 400 });
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  const admin = getSupabaseAdminClient();
  const { data: rows, error } = await admin.from('rsvps').select('user_id,created_at')
    .eq('event_id', parsed.data.id).eq('status', 'going').eq('is_public', true)
    .order('created_at', { ascending: false }).limit(24);
  if (error) return NextResponse.json({ error: 'Could not load attendees.' }, { status: 500 });
  const ids = (rows ?? []).map(row => row.user_id);
  const { data: profiles } = ids.length ? await admin.from('profiles')
    .select('id,display_name,avatar_url,avatar_color,initials').in('id', ids).eq('account_status', 'active') : { data: [] };
  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  const attendees = (rows ?? []).map(row => profileMap.get(row.user_id)).filter(Boolean).slice(0, 12);
  const [countResult, ownResult] = await Promise.all([
    admin.from('rsvps').select('id', { count: 'exact', head: true })
      .eq('event_id', parsed.data.id).eq('status', 'going').eq('is_public', true),
    user ? admin.from('rsvps').select('id').eq('event_id', parsed.data.id).eq('user_id', user.id).eq('status', 'going').eq('is_public', true).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return NextResponse.json({ count: countResult.count ?? 0, attendees, joined: Boolean(ownResult.data) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  const body = actionSchema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) return NextResponse.json({ error: 'Invalid attendance request.' }, { status: 400 });
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (body.data.going) {
    const { error } = await admin.from('rsvps').upsert({ event_id: params.data.id, user_id: user.id, status: 'going', is_public: true }, { onConflict: 'event_id,user_id' });
    if (error) return NextResponse.json({ error: 'Could not join the attendee list.' }, { status: 500 });
  } else {
    const { error } = await admin.from('rsvps').update({ is_public: false }).eq('event_id', params.data.id).eq('user_id', user.id);
    if (error) return NextResponse.json({ error: 'Could not leave the attendee list.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
