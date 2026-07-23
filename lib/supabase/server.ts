/**
 * Server-side Supabase client (Server Components, Route Handlers, Server Actions).
 * Reads/writes auth cookies properly so session is shared across SSR.
 * Uses NEXT_PUBLIC_ anon key — RLS enforces per-user permissions.
 * Never import this in client components.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecbbmcqwluivbzlaqdsd.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYmJtY3F3bHVpdmJ6bGFxZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjEyNzcsImV4cCI6MjA5MzMzNzI3N30.XTTs7RN-SrZ0YnC20m8mZms8ZfVVeANJgvwg1Key6SQ';

  return createServerClient<Database>(
    url,
    key,
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
