import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/checkout', '/tickets', '/profile', '/dashboard', '/settings', '/notifications', '/checkin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r));

  if (!isProtected) return NextResponse.next();

  // Check Supabase session via cookie
  const accessToken = request.cookies.get('sb-ecbbmcqwluivbzlaqdsd-auth-token')?.value
    || request.cookies.get('supabase-auth-token')?.value;

  // Try the standard cookie names Supabase uses
  const hasSession = !!accessToken
    || request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  if (!hasSession) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
};
