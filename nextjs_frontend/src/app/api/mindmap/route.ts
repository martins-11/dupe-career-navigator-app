import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

/**
 * Catch-all mindmap API proxy for the Next.js App Router.
 *
 * Why this file exists:
 * - In some preview runtimes, Next.js `rewrites()` may not apply as expected.
 * - When that happens, client calls like POST /api/mindmap/graph can return 404,
 *   even though the backend endpoint exists.
 * - Providing an app-router route handler at `/api/mindmap` guarantees that
 *   `/api/mindmap/*` resolves within Next.js and is then proxied to the backend.
 *
 * This file complements (and provides a fallback to) the more specific handlers in:
 * - /api/mindmap/graph
 * - /api/mindmap/view-state
 *
 * Backend base path:
 * - {BACKEND}/api/mindmap/*
 *
 * PUBLIC_INTERFACE
 */

function buildBackendPath(req: NextRequest): string {
  const url = new URL(req.url);
  // `/api/mindmap/...` -> `...`
  const suffix = url.pathname.replace(/^\/api\/mindmap\/?/, '');
  return `/api/mindmap/${suffix}`;
}

/**
 * PUBLIC_INTERFACE
 */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

/**
 * PUBLIC_INTERFACE
 */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

/**
 * PUBLIC_INTERFACE
 */
export async function PUT(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

/**
 * PUBLIC_INTERFACE
 */
export async function PATCH(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

/**
 * PUBLIC_INTERFACE
 */
export async function DELETE(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}

/**
 * PUBLIC_INTERFACE
 */
export async function OPTIONS(req: NextRequest) {
  return proxyToBackend(req, buildBackendPath(req));
}
