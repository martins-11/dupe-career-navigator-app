import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'cn_auth';

/**
 * Basic login gate middleware.
 *
 * - If the user is not "logged in" (cookie missing), redirect to /login.
 * - Login is intentionally non-secure for this prototype: any email/password is accepted.
 * - The existing ingestion flow remains unchanged; this only gates access.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow Next internals, public assets, and API routes without gating.
  const publicPrefixes = ['/login', '/api', '/_next', '/assets', '/health'];
  if (
    publicPrefixes.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    ) ||
    // Allow direct file requests (e.g., /favicon.ico, /robots.txt, /health, etc.)
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!authCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';

    // Preserve intended destination so login can route back.
    loginUrl.searchParams.set('next', `${pathname}${search ?? ''}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes; we bypass public routes inside middleware().
  matcher: '/:path*',
};
