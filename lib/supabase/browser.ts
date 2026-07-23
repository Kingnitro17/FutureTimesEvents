/**
 * Browser (client-side) Supabase client.
 * Uses NEXT_PUBLIC_ env vars — safe for browser.
 * Never use service-role key here.
 */
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecbbmcqwluivbzlaqdsd.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYmJtY3F3bHVpdmJ6bGFxZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjEyNzcsImV4cCI6MjA5MzMzNzI3N30.XTTs7RN-SrZ0YnC20m8mZms8ZfVVeANJgvwg1Key6SQ';
  _client = createBrowserClient(url, key);
  return _client;
}

/** Convenience alias */
export const supabase = getSupabaseBrowserClient;
