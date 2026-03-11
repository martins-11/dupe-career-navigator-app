import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Mindmap graph proxy.
 *
 * Why this file exists:
 * - The directory `src/app/api/mindmap/graph/` existed without a `route.ts`.
 *   In Next.js App Router, an empty segment directory can shadow a catch-all
 *   route (e.g. `/api/mindmap/[...path]`) and lead to a JSON 404:
 *   "No route for POST /api/mindmap/graph".
 * - Providing an explicit handler guarantees that `/api/mindmap/graph` is
 *   registered and will proxy correctly.
 *
 * Backend endpoint:
 *  - POST {BACKEND}/api/mindmap/graph
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/api/mindmap/graph');
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  return proxyToBackend(req, '/api/mindmap/graph');
}
