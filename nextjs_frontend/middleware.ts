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

  /**
   * Some preview/proxy deployments emit requests for browser sourcemaps like:
   * `/_next/static/<build-id>/chunks/app/page.mjs.map`
   *
   * When sourcemaps are not present/served, these become noisy 404s in logs.
   * To keep logs clean, return 204 for `/_next/static/*.map` unless explicitly enabled.
   */
  if (pathname.startsWith('/_next/static') && pathname.endsWith('.map')) {
    const enableSourceMaps = process.env.NEXT_PUBLIC_ENABLE_SOURCE_MAPS === 'true';
    if (!enableSourceMaps) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          // Avoid caching a "no content" response in case the deployment later enables maps.
          'Cache-Control': 'no-store',
        },
      });
    }
  }

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
