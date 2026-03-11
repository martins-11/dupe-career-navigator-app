import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Catch-all mindmap API proxy for the Next.js App Router.
 *
 * Why this file exists:
 * - Some runtimes/build-cache states can fail to register a specific nested route handler like
 *   `/api/mindmap/graph` even if the file exists.
 * - A route handler at `/api/mindmap` does NOT catch nested segments; it only matches exactly `/api/mindmap`.
 * - This catch-all ensures every path under `/api/mindmap/*` is always routed through Next.js and proxied
 *   to the Express backend, eliminating persistent 404s seen by the UI for POST /api/mindmap/graph.
 *
 * Backend base path:
 * - {BACKEND}/api/mindmap/*
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

function buildBackendPath(req: NextRequest): string {
  const url = new URL(req.url);
  // `/api/mindmap/...` -> `...`
  const suffix = url.pathname.replace(/^\/api\/mindmap\/?/, '');
  return `/api/mindmap/${suffix}`;
}

// PUBLIC_INTERFACE
export async function GET(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

// PUBLIC_INTERFACE
export async function PUT(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

// PUBLIC_INTERFACE
export async function PATCH(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

// PUBLIC_INTERFACE
export async function DELETE(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}
