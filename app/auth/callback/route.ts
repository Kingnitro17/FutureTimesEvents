import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * /auth/callback
 * Supabase redirects here after OAuth (Google) or magic-link sign-in.
 * The `code` query parameter is exchanged for a session via PKCE.
 * 
 * IMPORTANT: Uses SSR client to properly set HTTP cookies for server-side auth.
 * The cookies MUST be forwarded on the redirect so the proxy can read the session.
 */
export async function GET(request: NextRequest) {
  const url    = new URL(request.url);
  const code   = url.searchParams.get('code');
  const next   = url.searchParams.get('next') ?? '/profile';
  const origin = url.origin;

  if (code) {
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecbbmcqwluivbzlaqdsd.supabase.co';
    const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYmJtY3F3bHVpdmJ6bGFxZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjEyNzcsImV4cCI6MjA5MzMzNzI3N30.XTTs7RN-SrZ0YnC20m8mZms8ZfVVeANJgvwg1Key6SQ';

    // Create a response that will carry the auth cookies
    const supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the requested path, carrying the auth cookies from supabaseResponse
      const redirectUrl = new URL(`${origin}${next}`);
      const redirectResponse = NextResponse.redirect(redirectUrl);

      // Forward all set-cookie headers from supabaseResponse to the redirect
      const setCookieHeaders = supabaseResponse.headers.getSetCookie();
      for (const cookie of setCookieHeaders) {
        redirectResponse.headers.append('Set-Cookie', cookie);
      }

      return redirectResponse;
    }
  }

  // If something went wrong, redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}