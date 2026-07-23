/**
 * Admin Supabase client — uses SERVICE ROLE KEY.
 *
 * ⚠️  NEVER import this in browser/client components.
 * ⚠️  NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 * ⚠️  Only use in trusted server-side code (API routes, Server Actions, migrations).
 *
 * This client bypasses RLS entirely. Use only where RLS bypass is explicitly required:
 * - Atomic check-in (verify_and_checkin DB function, called with auth check first)
 * - Atomic ticket claiming (capacity enforcement)
 * - Admin operations with explicit role checks done beforehand in application code
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Module-level singleton — initialised once when the module first loads.
let _adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      '[supabase/admin] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. ' +
      'Never expose service role key to the browser.'
    );
  }

  _adminClient = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
