/**
 * POST /api/tickets/:ticketId/view
 *
 * Returns non-secret ticket metadata to either:
 * - the authenticated ticket owner, or
 * - a browser that proves possession of the one-time raw QR token.
 *
 * The QR hash is never returned.
 */
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const ParamsSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket ID'),
});

const BodySchema = z.object({
  qrToken: z.string().min(32).max(256).optional(),
}).strict();

const viewRateLimit = new Map<string, { count: number; resetAt: number }>();
const VIEW_LIMIT = 30;
const VIEW_WINDOW_MS = 60_000;

function exceedsViewLimit(key: string) {
  const now = Date.now();
  const current = viewRateLimit.get(key);
  if (!current || now >= current.resetAt) {
    viewRateLimit.set(key, { count: 1, resetAt: now + VIEW_WINDOW_MS });
    return false;
  }
  if (current.count >= VIEW_LIMIT) return true;
  current.count += 1;
  return false;
}

function noStoreJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

function tokenMatches(rawToken: string, storedHash: string | null) {
  if (!storedHash || !/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  const presentedHash = crypto.createHash('sha256').update(rawToken).digest();
  const expectedHash = Buffer.from(storedHash, 'hex');
  return presentedHash.length === expectedHash.length
    && crypto.timingSafeEqual(presentedHash, expectedHash);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return noStoreJson(
        { error: 'Invalid ticket ID', details: parsedParams.error.flatten().fieldErrors },
        422,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const parsedBody = BodySchema.safeParse(body);
    if (!parsedBody.success) {
      return noStoreJson(
        { error: 'Invalid ticket request', details: parsedBody.error.flatten().fieldErrors },
        422,
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
    if (exceedsViewLimit(`ticket-view:${ip}`)) {
      return noStoreJson({ error: 'Too many ticket requests. Please wait a minute.' }, 429);
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const admin = getSupabaseAdminClient();

    const { data: ticket, error } = await admin
      .from('tickets')
      .select(`
        id,
        ticket_number,
        user_id,
        attendee_name,
        attendee_email,
        status,
        issued_at,
        checked_in_at,
        gate,
        qr_token_hash,
        events (
          id,
          title,
          slug,
          starts_at,
          date,
          time,
          venue,
          venue_name,
          address,
          image_url,
          category
        ),
        ticket_type:ticket_types!tickets_ticket_type_id_fkey (
          id,
          name,
          price
        )
      `)
      .eq('id', parsedParams.data.ticketId)
      .maybeSingle();

    if (error || !ticket) {
      return noStoreJson({ error: 'Ticket not found.' }, 404);
    }

    const authEmail = user?.email?.trim().toLowerCase() ?? '';
    const ownsTicket = Boolean(user) && (
      ticket.user_id === user?.id
      || (authEmail.length > 0 && ticket.attendee_email.trim().toLowerCase() === authEmail)
    );
    const hasValidToken = parsedBody.data.qrToken
      ? tokenMatches(parsedBody.data.qrToken, ticket.qr_token_hash)
      : false;

    if (!ownsTicket && !hasValidToken) {
      return noStoreJson({ error: user ? 'You do not own this ticket.' : 'Ticket access required.' }, 403);
    }

    const event = ticket.events as unknown as {
      id: string;
      title: string;
      slug: string;
      starts_at: string | null;
      date: string | null;
      time: string | null;
      venue: string | null;
      venue_name: string | null;
      address: string | null;
      image_url: string | null;
      category: string | null;
    } | null;
    const ticketType = ticket.ticket_type as unknown as {
      id: string;
      name: string;
      price: number | string;
    } | null;
    const date = event?.date ?? '';
    const time = event?.time ?? '';

    return noStoreJson({
      qrTokenValid: hasValidToken,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        issuedAt: ticket.issued_at,
        checkedInAt: ticket.checked_in_at,
        gate: ticket.gate,
        holderName: ticket.attendee_name,
        holderEmail: ticket.attendee_email,
        event: {
          id: event?.id ?? '',
          title: event?.title ?? 'Event',
          slug: event?.slug ?? '',
          startsAt: event?.starts_at
            ?? (date ? `${date}T${time || '00:00:00'}+02:00` : ''),
          date,
          time,
          venue: event?.venue_name ?? event?.venue ?? '',
          address: event?.address ?? '',
          image: event?.image_url ?? '',
          category: event?.category ?? 'lounge',
        },
        ticketType: {
          id: ticketType?.id ?? '',
          name: ticketType?.name ?? 'General Admission',
          price: Number(ticketType?.price) || 0,
        },
      },
    }, 200);
  } catch (error) {
    console.error(
      '[ticket-view] Unhandled error:',
      error instanceof Error ? error.message : 'unknown',
    );
    return noStoreJson({ error: 'Could not load this ticket.' }, 500);
  }
}

export function GET() {
  return noStoreJson({ error: 'Method not allowed.' }, 405);
}
