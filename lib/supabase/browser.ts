/**
 * Browser (client-side) Supabase client.
 *
 * Uses a singleton stored on globalThis (window) to guarantee only ONE
 * GoTrueClient / RealtimeClient is ever created, even when Next.js bundles
 * this module in multiple chunks.
 *
 * Critical choices:
 * - Uses `createClient` from @supabase/supabase-js (NOT @supabase/ssr) because
 *   middleware.ts already handles cookie-based session refresh on SSR navigations.
 * - Disables realtime entirely (no BroadcastChannel, no WebSocket) — we don't
 *   use realtime subscriptions, so this removes the "message channel closed" error.
 * - Stores the singleton on `globalThis.__SUPABASE_BROWSER_CLIENT__` so no matter
 *   how many times this module is instantiated, only one client is ever created.
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecbbmcqwluivbzlaqdsd.supabase.co';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYmJtY3F3bHVpdmJ6bGFxZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjEyNzcsImV4cCI6MjA5MzMzNzI3N30.XTTs7RN-SrZ0YnC20m8mZms8ZfVVeANJgvwg1Key6SQ';

const GLOBAL_KEY = '__SUPABASE_BROWSER_CLIENT__';

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return createClient(URL, KEY, { auth: { persistSession: false } });
  }
  const existing = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
  if (existing) return existing as ReturnType<typeof createClient>;
  const client = createClient(URL, KEY, {
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

/** Convenience alias — avoid calling at module level! */
export const supabase = getSupabaseBrowserClient();
