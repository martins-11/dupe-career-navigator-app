import { NextRequest } from 'next/server';

import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Personas target-role API proxy (Next.js App Router).
 *
 * Backend endpoint:
 *  - POST {BACKEND}/api/personas/target-role
 *
 * Body:
 *  - { user_id: uuid, role_id: uuid, time_horizon: "Near"|"Mid"|"Far" }
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  /** Proxies POST /api/personas/target-role to the backend. */
  return proxyToBackend(req, '/api/personas/target-role');
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  /** Proxies OPTIONS /api/personas/target-role to the backend. */
  return proxyToBackend(req, '/api/personas/target-role');
}
