import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Mindmap view-state persistence proxy.
 *
 * Fixes 404s when Next.js rewrites are not applied in the current runtime by ensuring
 * the API route exists in the Next.js app router.
 *
 * Backend endpoints (expected by UI and/or backend):
 *  - GET   {BACKEND}/api/mindmap/view-state?personaId=...
 *  - PUT   {BACKEND}/api/mindmap/view-state
 *  - POST  {BACKEND}/api/mindmap/view-state  (legacy/client compatibility)
 *
 * Notes:
 * - The frontend client currently uses POST for save. Next.js App Router returns 405
 *   when a method handler is missing, so we explicitly implement POST here.
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

/**
 * PUBLIC_INTERFACE
 */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/api/mindmap/view-state');
}
