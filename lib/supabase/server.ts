/**
 * Server-side Supabase client (Server Components, Route Handlers, Server Actions).
 * Reads/writes auth cookies properly so session is shared across SSR.
 * Uses NEXT_PUBLIC_ anon key — RLS enforces per-user permissions.
 * Never import this in client components.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { getPublicSupabaseConfig } from './config';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const { url, anonKey } = getPublicSupabaseConfig();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // In Server Components we cannot set cookies — ignore.
            // Middleware is responsible for refreshing the session cookie.
          }
        },
      },
    }
  );
}
