import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Orchestration Extract+Normalize (proxy)
 *
 * The browser calls same-origin:
 *   POST /api/orchestration/builds/:id/extract-normalize
 * against the Next.js server (port 3000).
 *
 * The Express backend implements:
 *   POST /orchestration/builds/:id/extract-normalize
 * (note: backend path is NOT under /api).
 *
 * This route handler proxies the request to the backend to keep the browser
 * client same-origin and avoid CORS/backend-origin hardcoding.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/orchestration/builds/${encodeURIComponent(id)}/extract-normalize`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/orchestration/builds/${encodeURIComponent(id)}/extract-normalize`);
}
