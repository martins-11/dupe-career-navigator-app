import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper utilities for Next.js Route Handlers that proxy to the Express backend.
 */

/**
 * PUBLIC_INTERFACE
 * getBackendBaseUrl
 *
 * Resolves the backend base URL from environment variables.
 * We support both NEXT_PUBLIC_* and REACT_APP_* env naming conventions used in Kavia preview environments.
 */
export function getBackendBaseUrl(): string | null {
  // Prefer internal cluster URL when available (Kavia/preview), then public backend URL, then common legacy vars.
  // NOTE: This repo's .env includes NEXT_PUBLIC_API_BASE in some environments.
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    null
  );
}

/**
 * PUBLIC_INTERFACE
 * proxyToBackend
 *
 * Proxies a Next.js route handler request to the backend, returning the backend response as-is (JSON when possible).
 *
 * @param req Incoming NextRequest
 * @param backendPath Path on the backend, e.g. "/api/mindmap/view-state"
 */
export async function proxyToBackend(req: NextRequest, backendPath: string): Promise<NextResponse> {
  const backendUrl = getBackendBaseUrl();

  if (!backendUrl) {
    return NextResponse.json({ error: 'backend_url_not_set', message: 'Backend URL env variable not set' }, { status: 500 });
  }

  const incomingUrl = new URL(req.url);

  /**
   * IMPORTANT:
   * Some route handlers pass `backendPath` that already includes a querystring
   * (e.g. "/api/multiverse/graph?personaId=..."). If we naïvely append
   * `incomingUrl.search` we can end up with malformed URLs like:
   *   /api/multiverse/graph?x=1?x=1
   * which the Express backend will treat as a different path and return 404.
   *
   * So: strip any query from backendPath and append exactly one querystring:
   * - Prefer the query embedded in backendPath (explicit proxy intent)
   * - Otherwise use the incomingUrl.search (original request query)
   */
  const [backendPathNoQuery, backendQuery = ''] = backendPath.split('?', 2);
  const qs = backendQuery ? `?${backendQuery}` : incomingUrl.search || '';
  const targetUrl = `${backendUrl}${backendPathNoQuery}${qs}`;

  // Forward common headers; avoid forwarding "host" which can confuse upstream.
  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers.authorization = auth;

  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  // Support JSON body methods and also allow empty bodies.
  let body: string | undefined = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // We only expect JSON payloads for these endpoints.
    // If parsing fails, still try to forward raw text.
    try {
      const json = await req.json();
      body = JSON.stringify(json ?? {});
      headers['content-type'] = 'application/json';
    } catch {
      try {
        const text = await req.text();
        if (text) body = text;
      } catch {
        // ignore
      }
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // Don't cache proxied API responses on the Next server.
      cache: 'no-store',
    });

    const resContentType = res.headers.get('content-type') || '';
    if (resContentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      return NextResponse.json(data ?? {}, { status: res.status });
    }

    const text = await res.text().catch(() => '');
    return new NextResponse(text, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'proxy_failed', message: 'Failed to proxy to backend', detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
