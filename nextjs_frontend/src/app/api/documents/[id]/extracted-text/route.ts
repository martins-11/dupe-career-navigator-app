import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Document extracted text (proxy)
 *
 * Proxies:
 *   GET  /api/documents/:id/extracted-text -> GET  {BACKEND}/documents/:id/extracted-text
 *   POST /api/documents/:id/extracted-text -> POST {BACKEND}/documents/:id/extracted-text
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/documents/${encodeURIComponent(id)}/extracted-text`);
}

// PUBLIC_INTERFACE
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/documents/${encodeURIComponent(id)}/extracted-text`);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxyToBackend(req, `/documents/${encodeURIComponent(id)}/extracted-text`);
}
