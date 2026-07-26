/**
 * POST /api/tickets/claim
 *
 * Claims between one and ten admissions in one atomic database transaction.
 * Every admission receives its own ticket row, ordered ticket number, and
 * independently scannable QR credential.
 *
 * QR security invariant:
 * - This route generates 32 random bytes per ticket.
 * - PostgreSQL receives only SHA-256 hashes.
 * - Raw tokens are returned once for a new claim and are never logged.
 * - An idempotent replay returns ticket metadata without replacement tokens.
 */
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeZimbabweanPhoneNumber } from '@/lib/phone';

export const runtime = 'nodejs';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const ClaimSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  ticketTypeId: z.string().uuid('Invalid ticket type ID'),
  attendeeName: z.string().trim().min(2, 'Name is too short').max(100, 'Name is too long'),
  attendeeEmail: z.string().trim().toLowerCase().email('Invalid email address'),
  attendeePhone: z.string().trim().max(20, 'Phone number is too long').optional().nullable(),
  quantity: z.number().int().min(1).max(10).default(1),
  idempotencyKey: z.string().uuid('Invalid idempotency key'),
  showInWhosGoing: z.boolean().default(false),
  marketingOptIn: z.boolean().default(false),
  termsAccepted: z.literal(true, {
    error: 'You must accept the terms',
  }),
});

interface RpcTicket {
  ticket_id: string;
  ticket_number: string;
  token_index: number;
}

interface BatchClaimRpcResult {
  result: string;
  claim_id?: string;
  quantity?: number;
  remaining?: number;
  event_attendees?: number;
  available?: number;
  limit?: number;
  held?: number;
  opens_at?: string;
  status?: string;
  requires_qr_reissue?: boolean;
  tickets?: RpcTicket[];
}

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const current = rateLimitMap.get(key);

  if (!current || now >= current.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) return false;
  current.count += 1;
  return true;
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function isRpcTicket(value: unknown): value is RpcTicket {
  if (!value || typeof value !== 'object') return false;
  const ticket = value as Partial<RpcTicket>;
  return (
    typeof ticket.ticket_id === 'string'
    && typeof ticket.ticket_number === 'string'
    && Number.isInteger(ticket.token_index)
  );
}

function normaliseRpcTickets(value: unknown): RpcTicket[] | null {
  if (!Array.isArray(value) || !value.every(isRpcTicket)) return null;
  return [...value].sort((a, b) => a.token_index - b.token_index);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const forwardedIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const requestIdentity = user?.id
      ? `user:${user.id}`
      : `ip:${forwardedIp ?? req.headers.get('x-real-ip') ?? 'unknown'}`;

    if (!checkRateLimit(`ticket-claim:${requestIdentity}`)) {
      return noStoreJson(
        { error: 'Too many requests. Please wait a moment and try again.' },
        429,
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return noStoreJson({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = ClaimSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson(
        {
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        422,
      );
    }

    const input = parsed.data;

    let adminClient: ReturnType<typeof getSupabaseAdminClient>;
    try {
      adminClient = getSupabaseAdminClient();
    } catch (adminError) {
      const errorMessage = adminError instanceof Error ? adminError.message : 'Unknown error';
      console.error('[ticket-claim] Supabase admin client initialization failed:', errorMessage);
      return noStoreJson(
        {
          error: 'Ticket claim is temporarily unavailable due to a server configuration issue.',
          details: 'The service credentials required for this operation are missing or invalid.'
        },
        503, // Service Unavailable
      );
    }

    let userId: string | null = null;
    let attendeeEmail = input.attendeeEmail;

    // When a session exists, bind ownership to the authenticated account and
    // its authoritative Auth email. A caller cannot claim into another user's
    // wallet by changing attendeeEmail in the request body.
    if (user) {
      if (!user.email) {
        return noStoreJson(
          { error: 'Your account does not have a verified email address.' },
          422,
        );
      }

      // Use the authenticated server client for profile read (no service key needed)
      // rather than the admin client, so a missing SUPABASE_SERVICE_ROLE_KEY does
      // not prevent the profile check from succeeding.
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, account_status')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('[ticket-claim] Profile lookup failed:', profileError.message);
          return noStoreJson({ error: 'Unable to verify your account.' }, 500);
        }

        if (!profile) {
          return noStoreJson(
            { error: 'Your account profile is not ready. Sign out and sign in again.' },
            409,
          );
        }

        if (profile.account_status !== 'active') {
          return noStoreJson({ error: 'This account cannot claim tickets.' }, 403);
        }
      } catch (profileError) {
        console.error('[ticket-claim] Profile lookup threw:', profileError instanceof Error ? profileError.message : 'unknown');
        return noStoreJson({ error: 'Unable to verify your account.' }, 500);
      }

      userId = user.id;
      attendeeEmail = user.email.trim().toLowerCase();
    }

    const rawTokens = Array.from(
      { length: input.quantity },
      () => generateSecureToken(),
    );
    const tokenHashes = rawTokens.map(hashToken);
    const normalizedPhone = input.attendeePhone
      ? normalizeZimbabweanPhoneNumber(input.attendeePhone)
      : null;

    const { data: rpcData, error: rpcError } = await adminClient.rpc(
      'claim_tickets_batch_atomic',
      {
        p_event_id: input.eventId,
        p_ticket_type_id: input.ticketTypeId,
        p_user_id: userId,
        p_attendee_name: input.attendeeName,
        p_attendee_email: attendeeEmail,
        p_attendee_phone: normalizedPhone,
        p_quantity: input.quantity,
        p_idempotency_key: input.idempotencyKey,
        p_show_in_whos_going: input.showInWhosGoing,
        p_marketing_opt_in: input.marketingOptIn,
        p_qr_token_hashes: tokenHashes,
      },
    );

    if (rpcError) {
      console.error('[ticket-claim] Batch RPC failed:', rpcError.message);
      return noStoreJson(
        { error: 'Ticket claim failed. Please try again.' },
        500,
      );
    }

    if (!rpcData || typeof rpcData !== 'object' || Array.isArray(rpcData)) {
      console.error('[ticket-claim] Batch RPC returned an invalid result.');
      return noStoreJson(
        { error: 'Ticket claim returned an invalid result.' },
        500,
      );
    }

    const claimResult = rpcData as unknown as BatchClaimRpcResult;
    const rpcTickets = normaliseRpcTickets(claimResult.tickets);

    switch (claimResult.result) {
      case 'success': {
        if (
          !claimResult.claim_id
          || !rpcTickets
          || rpcTickets.length !== input.quantity
          || rpcTickets.some(
            (ticket, index) =>
              ticket.token_index !== index || !rawTokens[ticket.token_index],
          )
        ) {
          console.error('[ticket-claim] Batch RPC ticket mapping was invalid.');
          return noStoreJson(
            { error: 'Ticket claim returned an invalid ticket batch.' },
            500,
          );
        }

        const responseTickets = rpcTickets.map((ticket) => ({
          ticketId: ticket.ticket_id,
          ticketNumber: ticket.ticket_number,
          qrToken: rawTokens[ticket.token_index],
        }));

        const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
        const siteUrl = configuredSiteUrl || req.nextUrl.origin;
        const { error: notificationError } = await adminClient
          .from('notification_jobs')
          .insert({
            type: 'ticket_confirmation',
            recipient_email: attendeeEmail,
            recipient_name: input.attendeeName,
            payload: {
              claim_id: claimResult.claim_id,
              event_id: input.eventId,
              quantity: input.quantity,
              wallet_url: `${siteUrl}/tickets`,
              tickets: responseTickets.map((ticket) => ({
                ticket_id: ticket.ticketId,
                ticket_number: ticket.ticketNumber,
                ticket_url: `${siteUrl}/ticket/${ticket.ticketId}`,
              })),
            },
            idempotency_key: `email:claim:${claimResult.claim_id}`,
          });

        if (notificationError) {
          // The claim is already committed. Do not fail or retry ticket issuance
          // because a confirmation job could not be queued.
          console.error(
            '[ticket-claim] Confirmation job could not be queued:',
            notificationError.message,
          );
        }

        return noStoreJson(
          {
            success: true,
            result: 'success',
            claimId: claimResult.claim_id,
            quantity: input.quantity,
            remaining: claimResult.remaining,
            eventAttendees: claimResult.event_attendees,
            requiresQrReissue: false,
            tickets: responseTickets,
          },
          201,
        );
      }

      case 'already_claimed': {
        if (!claimResult.claim_id || !rpcTickets) {
          console.error('[ticket-claim] Idempotent RPC result was invalid.');
          return noStoreJson(
            { error: 'Existing ticket claim could not be loaded.' },
            500,
          );
        }

        return noStoreJson(
          {
            success: true,
            result: 'already_claimed',
            idempotent: true,
            claimId: claimResult.claim_id,
            quantity: claimResult.quantity ?? rpcTickets.length,
            requiresQrReissue: true,
            tickets: rpcTickets.map((ticket) => ({
              ticketId: ticket.ticket_id,
              ticketNumber: ticket.ticket_number,
            })),
          },
          200,
        );
      }

      case 'sold_out':
        return noStoreJson(
          { error: 'Sold out', available: claimResult.available ?? 0 },
          409,
        );

      case 'event_capacity_exceeded':
        return noStoreJson(
          {
            error: 'The event does not have enough remaining capacity.',
            available: claimResult.available ?? 0,
          },
          409,
        );

      case 'claim_limit_exceeded':
        return noStoreJson(
          {
            error: `You already hold the maximum number of tickets (${claimResult.limit ?? 0}) for this ticket type.`,
            limit: claimResult.limit ?? 0,
            held: claimResult.held ?? 0,
          },
          409,
        );

      case 'claim_not_open':
        return noStoreJson(
          {
            error: 'Ticket claiming has not opened yet.',
            opensAt: claimResult.opens_at,
          },
          409,
        );

      case 'claim_closed':
        return noStoreJson({ error: 'Ticket claiming has closed.' }, 409);

      case 'event_not_available':
        return noStoreJson(
          { error: 'This event is not currently available.' },
          409,
        );

      case 'event_not_found':
        return noStoreJson({ error: 'Event not found.' }, 404);

      case 'invalid_ticket_type':
        return noStoreJson({ error: 'Invalid ticket type.' }, 400);

      case 'idempotency_conflict':
        return noStoreJson(
          { error: 'This request key was already used for a different claim.' },
          409,
        );

      case 'invalid_quantity':
      case 'invalid_token_hashes':
      case 'invalid_attendee':
      case 'invalid_idempotency_key':
      case 'duplicate_token_hash':
        return noStoreJson({ error: 'Invalid ticket claim.' }, 422);

      default:
        console.error(
          '[ticket-claim] Unhandled batch result code:',
          claimResult.result,
        );
        return noStoreJson(
          { error: 'Unexpected error during ticket claim.' },
          500,
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ticket-claim] Unhandled server error:', message);
    return noStoreJson(
      { error: 'Internal server error. Please try again.' },
      500,
    );
  }
}

export function GET() {
  return noStoreJson({ error: 'Method not allowed' }, 405);
}
