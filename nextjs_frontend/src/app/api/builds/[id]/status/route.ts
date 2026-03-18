import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Build Status (proxy)
 *
 * The browser polls same-origin:
 *   GET /api/builds/:id/status
 * against the Next.js server (port 3000).
 *
 * The Express backend implements:
 *   GET /builds/:id/status
 * (note: backend path is NOT under /api).
 *
 * This route handler proxies the request to the backend to prevent a Next.js-side 404.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/builds/${encodeURIComponent(id)}/status`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/builds/${encodeURIComponent(id)}/status`);
}
