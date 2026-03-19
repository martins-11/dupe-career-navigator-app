import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Persona Draft (latest) API proxy (Next.js App Router).
 *
 * Browser calls:
 *  - GET /api/personas/:id/draft/latest
 *  - PUT /api/personas/:id/draft/latest
 *
 * Backend canonical endpoints:
 *  - GET /personas/:id/draft/latest
 *  - PUT /personas/:id/draft/latest
 *
 * Response shape (GET/PUT success):
 *  - { personaId, draftId?, draftJson, updatedAt }
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  /** Proxies GET /api/personas/:id/draft/latest to the backend. */
  const { id } = await ctx.params;
  return proxyToBackend(req, `/personas/${encodeURIComponent(id)}/draft/latest`);
}

// PUBLIC_INTERFACE
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  /**
   * Proxies PUT /api/personas/:id/draft/latest to the backend.
   *
   * Backend accepts either:
   * - { draftJson: object }
   * - raw JSON object (the draft itself)
   */
  const { id } = await ctx.params;
  return proxyToBackend(req, `/personas/${encodeURIComponent(id)}/draft/latest`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  /** Proxies OPTIONS /api/personas/:id/draft/latest to the backend. */
  const { id } = await ctx.params;
  return proxyToBackend(req, `/personas/${encodeURIComponent(id)}/draft/latest`);
}
