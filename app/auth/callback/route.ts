import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';

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
  const requestedNext = url.searchParams.get('next');
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/profile';
  const origin = url.origin;

  if (code) {
    const { url: supabaseUrl, anonKey: supabaseKey } = getPublicSupabaseConfig();

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
