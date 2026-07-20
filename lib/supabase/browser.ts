/**
 * Browser (client-side) Supabase client.
 * Uses NEXT_PUBLIC_ env vars — safe for browser.
 * Never use service-role key here.
 */
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}

/** Convenience alias */
export const supabase = getSupabaseBrowserClient;
