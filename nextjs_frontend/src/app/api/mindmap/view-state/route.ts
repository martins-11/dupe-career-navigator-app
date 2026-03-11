import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Mindmap view-state persistence proxy.
 *
 * Fixes 404s when Next.js rewrites are not applied in the current runtime by ensuring
 * the API route exists in the Next.js app router.
 *
 * Backend endpoints:
 *  - GET  {BACKEND}/api/mindmap/view-state?userKey=...
 *  - PUT  {BACKEND}/api/mindmap/view-state
 *
 * PUBLIC_INTERFACE
 */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/api/mindmap/view-state');
}

/**
 * PUBLIC_INTERFACE
 */
export async function PUT(req: NextRequest) {
  return proxyToBackend(req, '/api/mindmap/view-state');
}
