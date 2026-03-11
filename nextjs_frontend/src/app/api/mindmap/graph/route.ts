import { NextRequest } from 'next/server';
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
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/api/mindmap/graph');
}
