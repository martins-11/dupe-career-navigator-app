import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Orchestration Finalize Persona (proxy)
 *
 * The browser calls same-origin:
 *   POST /api/orchestration/builds/:id/finalize
 * against the Next.js server (port 3000).
 *
 * The Express backend implements:
 *   POST /orchestration/builds/:id/finalize
 * (note: backend path is NOT under /api).
 *
 * This route handler proxies the request to the backend to prevent a Next.js-side 404
 * during persona finalization.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/orchestration/builds/${encodeURIComponent(id)}/finalize`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/orchestration/builds/${encodeURIComponent(id)}/finalize`);
}
