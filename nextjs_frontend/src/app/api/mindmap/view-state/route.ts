import { NextRequest } from 'next/server';

import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Mindmap view-state API proxy (Next.js App Router).
 *
 * Backend endpoint:
 *  - GET  {BACKEND}/api/mindmap/view-state?userId=...
 *  - PUT  {BACKEND}/api/mindmap/view-state
 *  - POST {BACKEND}/api/mindmap/view-state (legacy/client compatibility)
 *
 * Notes:
 * - A Pages Router shim also exists at `/pages/api/mindmap/view-state.ts` as an additional safety net
 *   for environments that expect a resolvable Pages Router module during build.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest) {
  /** Proxies GET /api/mindmap/view-state to the backend (query string preserved). */
  return proxyToBackend(req, '/api/mindmap/view-state');
}

// PUBLIC_INTERFACE
export async function PUT(req: NextRequest) {
  /** Proxies PUT /api/mindmap/view-state to the backend. */
  return proxyToBackend(req, '/api/mindmap/view-state');
}

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  /** Proxies POST /api/mindmap/view-state to the backend (legacy/client compatibility). */
  return proxyToBackend(req, '/api/mindmap/view-state');
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  /** Proxies OPTIONS /api/mindmap/view-state to the backend. */
  return proxyToBackend(req, '/api/mindmap/view-state');
}
