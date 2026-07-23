/**
 * GET /api/health
 * Simple health-check endpoint — no auth required.
 * Used by Netlify, monitoring, and smoke tests.
 */
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dbStatus = 'unknown';

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('events')
      .select('id')
      .limit(1)
      .single();

    // error can be "no rows" (PGRST116) which is fine — still means DB is up
    dbStatus = (!error || error.code === 'PGRST116') ? 'ok' : 'error';
  } catch {
    dbStatus = 'error';
  }

  const latencyMs = Date.now() - start;

  const status = dbStatus === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status:    status === 200 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version:   process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
      services: {
        database: dbStatus,
      },
      latencyMs,
    },
    { status }
  );
}
