import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Multiverse Explorer API proxy for the Next.js App Router.
 *
 * Proxies:
 *  - GET/POST /api/multiverse/graph
 *  - GET       /api/multiverse/nodes/:id
 *  - GET       /api/multiverse/paths/:id
 *  - GET/PUT/DELETE /api/multiverse/bookmarks
 *
 * This keeps browser calls same-origin while letting the Express backend own the logic.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

function buildSuffix(req: NextRequest): string {
  const url = new URL(req.url);
  // `/api/multiverse/...` -> `...`
  return url.pathname.replace(/^\/api\/multiverse\/?/, '');
}

async function proxyMultiverse(req: NextRequest) {
  const suffix = buildSuffix(req);
  const backendPath = `/api/multiverse/${suffix}`;
  return proxyToBackend(req, backendPath);
}

// PUBLIC_INTERFACE
export async function GET(req: NextRequest) {
  return proxyMultiverse(req);
}

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  return proxyMultiverse(req);
}

// PUBLIC_INTERFACE
export async function PUT(req: NextRequest) {
  return proxyMultiverse(req);
}

// PUBLIC_INTERFACE
export async function PATCH(req: NextRequest) {
  return proxyMultiverse(req);
}

// PUBLIC_INTERFACE
export async function DELETE(req: NextRequest) {
  return proxyMultiverse(req);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  return proxyMultiverse(req);
}
