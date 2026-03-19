import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Builds (proxy)
 *
 * The browser calls same-origin:
 *   POST /api/builds
 * against the Next.js server (port 3000).
 *
 * The Express backend implements:
 *   POST /builds
 * (note: backend path is NOT under /api).
 *
 * This route handler proxies the request to the backend to prevent a Next.js-side 404.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  /** Create a build/workflow by proxying to the backend POST /builds endpoint. */
  return proxyToBackend(req, `/builds`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  /** CORS/preflight passthrough. */
  return proxyToBackend(req, `/builds`);
}
