import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Mindmap graph generation proxy.
 *
 * Fixes 404s when Next.js rewrites are not applied in the current runtime by ensuring
 * the API route exists in the Next.js app router.
 *
 * Backend endpoint:
 *  - POST {BACKEND}/api/mindmap/graph
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

/**
 * PUBLIC_INTERFACE
 */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/api/mindmap/graph');
}

/**
 * PUBLIC_INTERFACE
 * Some environments/tools probe API routes with GET. We respond with a stable JSON error
 * to make debugging clearer (and avoid custom routers misclassifying the route as missing).
 */
export async function GET() {
  return NextResponse.json(
    { error: 'method_not_allowed', message: 'Use POST /api/mindmap/graph' },
    { status: 405 }
  );
}

/**
 * PUBLIC_INTERFACE
 * Handle preflight requests (common when running behind proxies or different origins).
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
    },
  });
}
