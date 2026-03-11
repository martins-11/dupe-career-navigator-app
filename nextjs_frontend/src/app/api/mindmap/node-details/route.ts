import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Mindmap node-details proxy.
 *
 * Backend endpoint:
 *  - POST {BACKEND}/api/mindmap/node-details
 *
 * PUBLIC_INTERFACE
 */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/api/mindmap/node-details');
}
