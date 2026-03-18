import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Orchestration Build Lookup API (proxy)
 *
 * The browser calls same-origin:
 *   GET /api/orchestration/builds/:id
 * against the Next.js server (port 3000).
 *
 * The Express backend implements:
 *   GET /orchestration/builds/:id
 * (note: backend path is NOT under /api).
 *
 * This route handler proxies the request to the backend to prevent a Next.js-side 404
 * when fetching orchestration artifacts for a given build.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/orchestration/builds/${encodeURIComponent(id)}`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/orchestration/builds/${encodeURIComponent(id)}`);
}
