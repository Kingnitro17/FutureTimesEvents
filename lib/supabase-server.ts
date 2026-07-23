// lib/supabase-server.ts
// Server-only module — import only inside API routes / server components.
// NEVER import this in client components; it exposes SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// ⚠️  SERVICE_ROLE_KEY bypasses all RLS.
// Must ONLY be set in server-side env (Vercel → Settings → Environment Variables).
// Never prefix with NEXT_PUBLIC_.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
  );
}

/**
 * Admin client — full RLS bypass.
 * Use for worker jobs, migrations, server-side aggregations.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * Build a user-scoped client from the request JWT.
 * Use in API routes that need to respect RLS.
 */
export function supabaseFromToken(jwt: string) {
  return createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}
