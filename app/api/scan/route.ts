/**
 * POST /api/scan
 *
 * Atomic QR ticket verification and check-in.
 *
 * Security requirements:
 * 1. Scanner must be authenticated (valid Supabase session)
 * 2. Scanner must be assigned to the event as host/manager (or be admin)
 * 3. Token is validated and hashed server-side — never trust client hash
 * 4. Atomic via Postgres verify_and_checkin() with row-level lock
 * 5. Rate limited per scanner
 * 6. Returns minimal attendee info (name + ticket type only) — no email, no phone
 * 7. All scan attempts recorded in ticket_scans regardless of result
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

// ── Rate limiting ─────────────────────────────────────────────
const scanRateMap = new Map<string, { count: number; reset: number }>();
const SCAN_RATE_MAX = 30;              // 30 scans per minute per scanner
const SCAN_RATE_WINDOW_MS = 60_000;

function checkScanRateLimit(scannerId: string): boolean {
  const now = Date.now();
  const key = `scan:${scannerId}`;
  const entry = scanRateMap.get(key);
  if (!entry || now > entry.reset) {
    scanRateMap.set(key, { count: 1, reset: now + SCAN_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= SCAN_RATE_MAX) return false;
  entry.count++;
  return true;
}

// ── Input schema ─────────────────────────────────────────────
const ScanSchema = z.object({
  qrToken: z.string().min(8).max(256, 'Token too long'),
  eventId: z.string().uuid('Invalid event ID'),
  gate:    z.string().max(50).optional().nullable(),
});

// ── Hash helper ───────────────────────────────────────────────
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Handler ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ── Authenticate scanner ────────────────────────────────
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // ── Rate limit per scanner ──────────────────────────────
    if (!checkScanRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Scan rate limit exceeded. Please slow down.' },
        { status: 429 }
      );
    }

    // ── Parse and validate body ─────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parse = ScanSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid scan request', details: parse.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { qrToken, eventId, gate } = parse.data;

    // ── Verify scanner is authorised for this event ─────────
    // Check: is staff for this event OR is admin/super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as unknown as { data: { role: string } | null };

    const isAdmin = ['admin', 'super_admin'].includes((profile as { role: string } | null)?.role ?? '');

    if (!isAdmin) {
      const { data: staffRecord } = await supabase
        .from('event_staff')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!staffRecord) {
        return NextResponse.json(
          { error: 'You are not authorised to scan tickets for this event.' },
          { status: 403 }
        );
      }
    }

    // ── Hash the presented token ────────────────────────────
    // Never trust a client-provided hash — always hash server-side
    const tokenHash = hashToken(qrToken);

    // ── Call atomic check-in function ───────────────────────
    const adminClient = getSupabaseAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error: rpcError } = await (adminClient as any).rpc('verify_and_checkin', {
      p_token_hash: tokenHash,
      p_scanner_id: user.id,
      p_event_id:   eventId,
      p_gate:       gate ?? null,
    });

    if (rpcError) {
      console.error('[scan] RPC error:', rpcError.message);
      return NextResponse.json(
        { error: 'Check-in system error. Please try again.' },
        { status: 500 }
      );
    }

    const scanResult = result as {
      result: string;
      ticket_number?: string;
      attendee_name?: string;
      ticket_type_id?: string;
      checked_in_at?: string;
      gate?: string;
      scan_id?: string;
      event_status?: string;
      status?: string;
    };

    // ── Map result to HTTP response ─────────────────────────
    // Return only what the scanner UI needs — no email, no phone, no QR hash
    switch (scanResult.result) {
      case 'valid_checked_in':
        return NextResponse.json({
          result:        'valid_checked_in',
          ticketNumber:  scanResult.ticket_number,
          attendeeName:  scanResult.attendee_name,
          checkedInAt:   scanResult.checked_in_at,
          scanId:        scanResult.scan_id,
        }, { status: 200 });

      case 'already_checked_in':
        return NextResponse.json({
          result:        'already_checked_in',
          ticketNumber:  scanResult.ticket_number,
          attendeeName:  scanResult.attendee_name,
          checkedInAt:   scanResult.checked_in_at,
          gate:          scanResult.gate,
        }, { status: 200 });

      case 'not_found':
        return NextResponse.json({ result: 'not_found' }, { status: 200 });

      case 'wrong_event':
        return NextResponse.json({ result: 'wrong_event' }, { status: 200 });

      case 'cancelled':
        return NextResponse.json({ result: 'cancelled' }, { status: 200 });

      case 'revoked':
        return NextResponse.json({ result: 'revoked' }, { status: 200 });

      case 'event_not_open':
        return NextResponse.json({ result: 'event_not_open' }, { status: 200 });

      case 'invalid_token':
        return NextResponse.json({ result: 'invalid_token' }, { status: 200 });

      default:
        return NextResponse.json({ result: 'error' }, { status: 200 });
    }
  } catch (err) {
    console.error('[scan] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
