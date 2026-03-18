import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Orchestration Run-All API (proxy)
 *
 * The browser calls same-origin:
 *   POST /api/orchestration/run-all
 * against the Next.js server (port 3000).
 *
 * The Express backend implements:
 *   POST /orchestration/run-all
 * (note: backend path is NOT under /api).
 *
 * This route handler proxies the request to the backend to prevent a Next.js-side 404
 * during draft generation.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/orchestration/run-all');
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  return proxyToBackend(req, '/orchestration/run-all');
}
