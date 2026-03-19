import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../_utils/backendProxy';

/**
 * Direct Trajectory recommendations proxy.
 *
 * Browser calls this Next.js same-origin route; it proxies to the Express backend:
 * POST {BACKEND}/api/recommendations/direct-trajectory
 */

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  /** Proxies direct-trajectory recommendation generation to the Express backend. */
  return proxyToBackend(req, '/api/recommendations/direct-trajectory');
}
