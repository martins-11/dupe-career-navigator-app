import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Documents API (proxy)
 *
 * Fixes frontend 404s where the browser calls:
 *   GET /api/documents?limit=50&offset=0
 * on the Next.js app (same-origin), but no route existed.
 *
 * This route proxies to the Express backend (note: backend path is NOT under /api):
 *   - GET  {BACKEND}/documents?limit=...&offset=...
 *   - POST {BACKEND}/documents
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/documents');
}

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/documents');
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  return proxyToBackend(req, '/documents');
}
