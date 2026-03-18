import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '../../_utils/backendProxy';

/**
 * Proxy for initial persona-driven Bedrock recommendations.
 *
 * Forwards incoming requests to the backend Express API:
 *   GET {BACKEND}/api/recommendations/initial?personaId=...
 *
 * PUBLIC_INTERFACE
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.search || '';
  const rawBackendUrl = getBackendBaseUrl();

  if (!rawBackendUrl) {
    return NextResponse.json({ error: 'backend_url_not_set', message: 'Backend URL env variable not set' }, { status: 500 });
  }

  const backendUrl = rawBackendUrl.replace(/\/+$/, '');

  // Guard: prevent proxying to self (otherwise this route can recurse and 504).
  try {
    const backendOrigin = new URL(backendUrl).origin;
    if (backendOrigin === url.origin) {
      return NextResponse.json(
        {
          error: 'backend_url_points_to_frontend',
          message:
            'Backend base URL resolves to the same origin as this Next.js app. Refusing to proxy to avoid a proxy loop. Set BACKEND_INTERNAL_URL or NEXT_PUBLIC_BACKEND_URL to the Express backend origin.',
          details: { backendOrigin, incomingOrigin: url.origin },
        },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'invalid_backend_url', message: 'Backend URL env variable is not a valid absolute URL.', details: { backendUrl } },
      { status: 500 },
    );
  }

  try {
    // Avoid waiting for upstream proxies to time out (preview environments often have a hard 30s cap).
    const timeoutMs = Number(process.env.NEXT_PUBLIC_BACKEND_PROXY_TIMEOUT_MS || 25000);
    const effectiveTimeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : 25000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);

    const res = await fetch(`${backendUrl}/api/recommendations/initial${query}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.get('authorization') ? { authorization: req.headers.get('authorization')! } : {}),
      },
      cache: 'no-store',
    }).finally(() => clearTimeout(timer));

    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (e: any) {
    const isAbort =
      e?.name === 'AbortError' ||
      String(e?.message || '').toLowerCase().includes('aborted') ||
      String(e?.message || '').toLowerCase().includes('timeout');

    return NextResponse.json(
      {
        error: 'Failed to proxy to backend',
        detail: e?.message || String(e),
        ...(isAbort ? { code: 'backend_proxy_timeout' } : {}),
      },
      { status: isAbort ? 504 : 500 },
    );
  }
}
