import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Orchestration Generate Draft Persona (proxy)
 *
 * The browser calls same-origin:
 *   POST /api/orchestration/builds/:id/generate-draft
 * against the Next.js server (port 3000).
 *
 * The Express backend implements:
 *   POST /orchestration/builds/:id/generate-draft
 * (note: backend path is NOT under /api).
 *
 * This route handler proxies the request to the backend so the UI can run
 * the step-by-step orchestration flow.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/orchestration/builds/${encodeURIComponent(id)}/generate-draft`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/orchestration/builds/${encodeURIComponent(id)}/generate-draft`);
}
