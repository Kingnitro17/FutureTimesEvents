/**
 * POST /api/tickets/:ticketId/qr/reissue
 *
 * Rotates an issued ticket's QR credential for its authenticated owner.
 * This is the recovery path when the one-time raw token is no longer present
 * in the current browser session. The previous downloaded QR becomes invalid.
 */
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const ParamsSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket ID'),
});

const reissueRateLimit = new Map<string, { count: number; resetAt: number }>();
const REISSUE_LIMIT = 3;
const REISSUE_WINDOW_MS = 60_000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const current = reissueRateLimit.get(userId);

  if (!current || now >= current.resetAt) {
    reissueRateLimit.set(userId, { count: 1, resetAt: now + REISSUE_WINDOW_MS });
    return false;
  }

  if (current.count >= REISSUE_LIMIT) return true;
  current.count += 1;
  return false;
}

function noStoreJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
      return noStoreJson({ error: 'Invalid request origin.' }, 403);
    }

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return noStoreJson(
        { error: 'Invalid ticket ID', details: parsedParams.error.flatten().fieldErrors },
        422,
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return noStoreJson({ error: 'Authentication required.' }, 401);
    }

    if (isRateLimited(user.id)) {
      return noStoreJson({ error: 'Too many QR recovery requests. Please wait a minute.' }, 429);
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, user_id, attendee_email, status, ticket_number, event_id, qr_token_hash')
      .eq('id', parsedParams.data.ticketId)
      .single();

    if (ticketError || !ticket) {
      return noStoreJson({ error: 'Ticket not found.' }, 404);
    }

    const authenticatedEmail = user.email?.trim().toLowerCase() ?? '';
    const isOwner = ticket.user_id === user.id
      || (authenticatedEmail.length > 0
        && ticket.attendee_email.trim().toLowerCase() === authenticatedEmail);

    if (!isOwner) {
      return noStoreJson({ error: 'You do not own this ticket.' }, 403);
    }

    if (ticket.status !== 'issued') {
      const message = ticket.status === 'checked_in'
        ? 'This ticket has already been checked in and its QR is no longer valid.'
        : 'A QR cannot be issued for a cancelled or revoked ticket.';
      return noStoreJson({ error: message, status: ticket.status }, 409);
    }

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const admin = getSupabaseAdminClient();

    const { data: updated, error: updateError } = await admin
      .from('tickets')
      .update({
        qr_token_hash: tokenHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id)
      .eq('status', 'issued')
      // Optimistic lock: only one concurrent recovery request can rotate the
      // credential that was read above. A losing request returns no raw token.
      .eq('qr_token_hash', ticket.qr_token_hash)
      .select('id')
      .maybeSingle();

    if (updateError || !updated) {
      return noStoreJson(
        { error: 'The ticket changed while its QR was being recovered. Refresh and try again.' },
        409,
      );
    }

    const { error: auditError } = await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'ticket.qr_reissued',
      entity_type: 'ticket',
      entity_id: ticket.id,
      after_state: {
        ticket_number: ticket.ticket_number,
        event_id: ticket.event_id,
        reissued_at: new Date().toISOString(),
      },
    });

    if (auditError) {
      console.error('[ticket-reissue] Audit insert failed:', auditError.message);
    }

    return noStoreJson(
      {
        success: true,
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        qrToken: rawToken,
      },
      200,
    );
  } catch (error) {
    console.error(
      '[ticket-reissue] Unhandled error:',
      error instanceof Error ? error.message : 'unknown',
    );
    return noStoreJson({ error: 'Could not recover this QR code. Please try again.' }, 500);
  }
}

export function GET() {
  return noStoreJson({ error: 'Method not allowed.' }, 405);
}
