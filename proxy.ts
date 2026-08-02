import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';

// Routes that require any authenticated session
const AUTH_ROUTES = ['/tickets', '/profile', '/settings', '/notifications'];

// Routes that require admin or super_admin role
const ADMIN_ROUTES = ['/admin'];

// Routes that require host, event_manager, admin, or super_admin role
const HOST_ROUTES = ['/checkin'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a mutable response — Supabase SSR will set/refresh auth cookies on it
  let supabaseResponse = NextResponse.next({ request });

  let supabase;
  try {
    const { url, anonKey } = getPublicSupabaseConfig();

    supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Propagate cookie changes to the outgoing response
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );
  } catch {
    // Supabase env vars are not configured yet — skip auth completely.
    // The site still renders for public pages. Protected routes will show
    // a sign-in prompt via the client-side auth context.
    return supabaseResponse;
  }

  // IMPORTANT: Do not run any code between createServerClient and getUser()
  // that might cause the session refresh to be lost.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Unauthenticated user hitting protected routes ─────────────────────────
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  const isHostRoute = HOST_ROUTES.some(r => pathname.startsWith(r));

  if ((isAuthRoute || isAdminRoute || isHostRoute) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based checks for admin/host routes ───────────────────────────────
  if (user && (isAdminRoute || isHostRoute)) {
    // Read only the signed-in user's authorization profile through the
    // migration-007 RPC. No caller-controlled profile ID is accepted.
    const { data: profileData } = await supabase.rpc('get_my_profile');
    let profile = profileData as {
      role?: string;
      account_status?: string;
    } | null;

    // Fallback: if the RPC returns nothing, try a direct profile query.
    if (!profile) {
      const { data: directProfile } = await supabase
        .from('profiles')
        .select('role, account_status')
        .eq('id', user.id)
        .maybeSingle();

      if (directProfile) {
        profile = directProfile as {
          role?: string;
          account_status?: string;
        } | null;
      }
    }

    const role = profile?.role ?? 'attendee';
    const accountStatus = profile?.account_status ?? 'suspended';

    if (accountStatus !== 'active') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (isAdminRoute && !['admin', 'super_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (isHostRoute && !['host', 'event_manager', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Return the response with refreshed auth cookies
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/tickets/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/notifications/:path*',
    '/admin/:path*',
    '/checkin/:path*',
  ],
};
