import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Persona Draft (latest) API proxy (Next.js App Router).
 *
 * Browser calls:
 *  - GET /api/personas/:id/draft/latest
 *
 * Backend implements (compat mounted under /api/personas/* as well):
 *  - GET /api/personas/:id/draft/latest
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  /** Proxies GET /api/personas/:id/draft/latest to the backend. */
  const { id } = await ctx.params;
  return proxyToBackend(req, `/api/personas/${encodeURIComponent(id)}/draft/latest`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  /** Proxies OPTIONS /api/personas/:id/draft/latest to the backend. */
  const { id } = await ctx.params;
  return proxyToBackend(req, `/api/personas/${encodeURIComponent(id)}/draft/latest`);
}
