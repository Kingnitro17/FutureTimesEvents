/**
 * Browser (client-side) Supabase client.
 * Uses NEXT_PUBLIC_ env vars — safe for browser.
 * Never use service-role key here.
 */
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  _client = createBrowserClient(url, key);
  return _client;
}

/** Convenience alias */
export const supabase = getSupabaseBrowserClient;
