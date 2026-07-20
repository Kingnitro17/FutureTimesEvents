/**
 * POST /api/tickets/claim
 *
 * Atomically claims a free ticket for an event.
 *
 * Security:
 * - Rate limited (basic — extend with Redis/Upstash if needed)
 * - Input validated with Zod
 * - Capacity enforced atomically via Postgres function
 * - Idempotency key prevents duplicate submissions
 * - QR token generated server-side with 256-bit entropy
 * - Only SHA-256 hash stored in database — raw token returned once
 * - Email/phone normalised before storage
 * - No private data leaked in error responses
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ── Rate limiting (in-memory — use Redis for multi-instance) ─────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_MAX = 5;        // max claims per window
const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ── Input schema ─────────────────────────────────────────────
const ClaimSchema = z.object({
  eventId:           z.string().uuid('Invalid event ID'),
  ticketTypeId:      z.string().uuid('Invalid ticket type ID'),
  attendeeName:      z.string().min(2, 'Name is too short').max(100, 'Name is too long').trim(),
  attendeeEmail:     z.string().email('Invalid email address').toLowerCase().trim(),
  attendeePhone:     z.string().max(20).optional().nullable(),
  quantity:          z.number().int().min(1).max(10).default(1),
  idempotencyKey:    z.string().max(128).optional().nullable(),
  showInWhosGoing:   z.boolean().default(false),
  marketingOptIn:    z.boolean().default(false),
  termsAccepted:     z.boolean().refine(v => v === true, 'You must accept the terms'),
});

// ── Helpers ──────────────────────────────────────────────────

/** Generate a 256-bit (32 byte) cryptographically secure random token */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** SHA-256 hash of a token — this is what gets stored in the database */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Generate a human-readable ticket number */
function generateTicketNumber(): string {
  const prefix = 'FTE';
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

// ── Handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ── Rate limit by IP ───────────────────────────────────
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';

    if (!checkRateLimit(`claim:${ip}`)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    // ── Parse body ─────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parse = ClaimSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parse.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = parse.data;

    // ── Generate secure QR token ───────────────────────────
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const ticketNumber = generateTicketNumber();

    // ── Call atomic DB function ────────────────────────────
    // Uses admin client because claim_ticket_atomic is SECURITY DEFINER
    // and we need to bypass RLS for the atomic capacity update.
    // Role + auth checks happen INSIDE the DB function.
    const adminClient = getSupabaseAdminClient();

    const { data: result, error: rpcError } = await adminClient.rpc('claim_ticket_atomic', {
      p_event_id:           data.eventId,
      p_ticket_type_id:     data.ticketTypeId,
      p_attendee_name:      data.attendeeName,
      p_attendee_email:     data.attendeeEmail.toLowerCase(),
      p_attendee_phone:     data.attendeePhone ?? null,
      p_quantity:           data.quantity,
      p_idempotency_key:    data.idempotencyKey ?? null,
      p_show_in_whos_going: data.showInWhosGoing,
      p_marketing_opt_in:   data.marketingOptIn,
      p_qr_token_hash:      tokenHash,
      p_ticket_number:      ticketNumber,
    });

    if (rpcError) {
      console.error('[claim] RPC error:', rpcError.message);
      return NextResponse.json(
        { error: 'Ticket claim failed. Please try again.' },
        { status: 500 }
      );
    }

    const claimResult = result as {
      result: string;
      ticket_id?: string;
      ticket_number?: string;
      claim_id?: string;
      available?: number;
      limit?: number;
      held?: number;
      opens_at?: string;
      status?: string;
    };

    // ── Handle DB function result codes ────────────────────
    switch (claimResult.result) {
      case 'success':
      case 'already_claimed':
        // Queue confirmation email job (fire and forget)
        void adminClient.from('notification_jobs').insert({
          type: 'ticket_confirmation',
          recipient_email: data.attendeeEmail.toLowerCase(),
          recipient_name:  data.attendeeName,
          payload: {
            ticket_id:     claimResult.ticket_id,
            ticket_number: claimResult.ticket_number,
            event_id:      data.eventId,
            // The raw token is needed for the ticket link in the email
            // Store it encrypted or use a signed URL
            ticket_url:    `${process.env.NEXT_PUBLIC_SITE_URL}/ticket/${claimResult.ticket_id}`,
          },
          idempotency_key: `email:claim:${claimResult.ticket_id}`,
        });

        // Return ticket_id and the RAW TOKEN (only time it's revealed)
        // The frontend will show the QR code using this token.
        // NEVER log or store the raw token server-side beyond this response.
        return NextResponse.json(
          {
            success: true,
            ticketId:     claimResult.ticket_id,
            ticketNumber: claimResult.ticket_number,
            claimId:      claimResult.claim_id,
            // raw token for QR display — never stored, never logged
            qrToken:      claimResult.result === 'success' ? rawToken : undefined,
          },
          { status: 201 }
        );

      case 'sold_out':
        return NextResponse.json(
          { error: 'Sold out', available: claimResult.available ?? 0 },
          { status: 409 }
        );

      case 'claim_limit_exceeded':
        return NextResponse.json(
          { error: `You already have the maximum number of tickets (${claimResult.limit}) for this event.` },
          { status: 409 }
        );

      case 'claim_not_open':
        return NextResponse.json(
          { error: 'Ticket claiming has not opened yet.', opensAt: claimResult.opens_at },
          { status: 409 }
        );

      case 'claim_closed':
        return NextResponse.json(
          { error: 'Ticket claiming has closed.' },
          { status: 409 }
        );

      case 'event_not_available':
        return NextResponse.json(
          { error: 'This event is not currently available.' },
          { status: 409 }
        );

      case 'invalid_ticket_type':
        return NextResponse.json(
          { error: 'Invalid ticket type.' },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { error: 'Unexpected error during claim.' },
          { status: 500 }
        );
    }
  } catch (err) {
    console.error('[claim] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}

// Disable GET for this route
export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
