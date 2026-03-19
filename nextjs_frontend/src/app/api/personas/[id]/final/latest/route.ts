import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Persona Final (latest) API proxy (Next.js App Router).
 *
 * Browser calls:
 *  - GET /api/personas/:id/final/latest
 *
 * Backend canonical endpoint:
 *  - GET /personas/:id/final/latest
 *
 * Response shape (success):
 *  - { personaId, finalId?, finalJson, updatedAt }
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  /** Proxies GET /api/personas/:id/final/latest to the backend. */
  const { id } = await ctx.params;
  return proxyToBackend(req, `/personas/${encodeURIComponent(id)}/final/latest`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  /** Proxies OPTIONS /api/personas/:id/final/latest to the backend. */
  const { id } = await ctx.params;
  return proxyToBackend(req, `/personas/${encodeURIComponent(id)}/final/latest`);
}
