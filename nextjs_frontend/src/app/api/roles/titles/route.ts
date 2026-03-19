import { NextRequest } from 'next/server';

import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Roles titles API proxy (Next.js App Router).
 *
 * Backend endpoint:
 *  - GET {BACKEND}/api/roles/titles
 *
 * Response:
 *  - string[]
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest) {
  /** Proxies GET /api/roles/titles to the backend (query string preserved). */
  return proxyToBackend(req, '/api/roles/titles');
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  /** Proxies OPTIONS /api/roles/titles to the backend. */
  return proxyToBackend(req, '/api/roles/titles');
}
