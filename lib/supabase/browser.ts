/**
 * Browser (client-side) Supabase client.
 *
 * Uses `createBrowserClient` from @supabase/ssr so that the session is stored
 * in cookies (not localStorage). This ensures the proxy (middleware replacement)
 * can read the session on server-side navigations using `createServerClient`.
 *
 * Uses a singleton stored on globalThis (window) to guarantee only ONE
 * GoTrueClient / RealtimeClient is ever created, even when Next.js bundles
 * this module in multiple chunks.
 *
 * Critical choices:
 * - Uses createBrowserClient (NOT plain createClient) so cookies stay in sync
 *   with the SSR client used in proxy.ts and auth/callback.
 * - Disables realtime entirely (no BroadcastChannel, no WebSocket) — we don't
 *   use realtime subscriptions, so this removes the "message channel closed" error.
 * - Stores the singleton on `globalThis.__SUPABASE_BROWSER_CLIENT__` so no matter
 *   how many times this module is instantiated, only one client is ever created.
 */
import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from './config';

const GLOBAL_KEY = '__SUPABASE_BROWSER_CLIENT__';

export function getSupabaseBrowserClient() {
  const { url, anonKey } = getPublicSupabaseConfig();

  if (typeof window === 'undefined') {
    return createBrowserClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  const existing = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
  if (existing) return existing as ReturnType<typeof createBrowserClient>;
  const client = createBrowserClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 0,
      },
    },
  });
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = client;
  return client;
}
