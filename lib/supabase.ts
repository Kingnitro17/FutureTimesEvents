/**
 * Legacy barrel export for client-side Supabase.
 * Uses a Proxy-based lazy getter to avoid module-level instantiation
 * (which causes "Multiple GoTrueClient instances" when Next.js bundles
 * this module in different chunks).
 *
 * New code should import from '@/lib/supabase/browser' directly.
 */
import { getSupabaseBrowserClient } from './supabase/browser';

function getClient() {
  return getSupabaseBrowserClient();
}

// Proxy delegates all property access to the lazily-created singleton
export const supabase = new Proxy({} as ReturnType<typeof getSupabaseBrowserClient>, {
  get(_, prop) {
    return getClient()[prop as keyof ReturnType<typeof getSupabaseBrowserClient>];
  },
});

export default supabase;
