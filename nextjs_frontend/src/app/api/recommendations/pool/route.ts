import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '../../_utils/backendProxy';

/**
 * Explore Recommendations Pool (frontend aggregator).
 *
 * This endpoint exists to ensure the BROWSER makes only ONE request when Explore loads.
 * Server-side, we can try "initial" and fall back to "roles" without the UI needing
 * to perform two separate fetches (which becomes 4 in React StrictMode dev).
 *
 * IMPORTANT reliability behavior:
 * - We fetch BOTH upstream endpoints in parallel and return the first usable result.
 *   This avoids waiting on slow Bedrock-backed "initial" before returning a fast fallback.
 * - We also guard against misconfiguration where the "backend" URL accidentally points
 *   at the frontend origin (port 3000), which would create a proxy loop and 504.
 *
 * Upstream backend targets:
 * - GET {BACKEND}/api/recommendations/initial?personaId=...(&allowPadding=true)
 * - GET {BACKEND}/api/recommendations/roles?personaId=...(&allowPadding=true)
 *
 * PUBLIC_INTERFACE
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.search || '';

  // Validate early; prevents pointless proxy attempts and yields faster, clearer failures.
  const personaId = (url.searchParams.get('personaId') || '').trim();
  if (!personaId) {
    return NextResponse.json({ error: 'missing_persona_id', message: 'Query param personaId is required.' }, { status: 400 });
  }

  const rawBackendUrl = getBackendBaseUrl();
  if (!rawBackendUrl) {
    return NextResponse.json({ error: 'backend_url_not_set', message: 'Backend URL env variable not set' }, { status: 500 });
  }

  // Normalize trailing slashes so `${backendUrl}/api/...` doesn't become `//api/...`.
  const backendUrl = rawBackendUrl.replace(/\/+$/, '');

  // Guard: prevent proxying to self (common misconfiguration in preview envs).
  // If backendUrl points at the frontend origin, we'd recurse until we time out with 504.
  try {
    const backendOrigin = new URL(backendUrl).origin;
    const incomingOrigin = url.origin;
    if (backendOrigin === incomingOrigin) {
      return NextResponse.json(
        {
          error: 'backend_url_points_to_frontend',
          message:
            'Backend base URL resolves to the same origin as this Next.js app. Refusing to proxy to avoid a proxy loop. Set BACKEND_INTERNAL_URL or NEXT_PUBLIC_BACKEND_URL to the Express backend origin.',
          details: { backendOrigin, incomingOrigin },
        },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_backend_url',
        message: 'Backend URL env variable is not a valid absolute URL.',
        details: { backendUrl },
      },
      { status: 500 },
    );
  }

  // Avoid waiting for upstream proxies to time out (preview environments often have a hard 30s cap).
  const timeoutMs = Number(process.env.NEXT_PUBLIC_BACKEND_PROXY_TIMEOUT_MS || 25000);
  const effectiveTimeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : 25000;

  type FetchResult = { ok: boolean; status: number; data: any };

  async function fetchJsonWithTimeout(params: {
    targetUrl: string;
    controller: AbortController;
    timeoutMs: number;
  }): Promise<FetchResult> {
    const timer = setTimeout(() => params.controller.abort(), params.timeoutMs);
    try {
      const res = await fetch(params.targetUrl, {
        method: 'GET',
        signal: params.controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.get('authorization') ? { authorization: req.headers.get('authorization')! } : {}),
        },
        cache: 'no-store',
      });

      const data = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  function hasUsableRoles(payload: any): boolean {
    if (!payload) return false;
    const roles = Array.isArray(payload) ? payload : payload?.roles;
    return Array.isArray(roles) && roles.filter(Boolean).length > 0;
  }

  function attachFrontendSource(payload: any, source: 'initial' | 'roles'): any {
    if (Array.isArray(payload)) return payload;
    const meta = payload?.meta ?? null;
    return {
      ...(payload ?? {}),
      meta: meta && typeof meta === 'object' ? { ...meta, frontendSource: source } : { frontendSource: source },
    };
  }

  const initialController = new AbortController();
  const rolesController = new AbortController();

  // IMPORTANT (bugfix):
  // This route must proxy to the backend's pooled endpoint:
  //   GET {BACKEND}/api/recommendations/pool?personaId=...
  // Falling back to /api/recommendations/roles should only happen when the pool
  // endpoint fails or returns no roles. This prevents multiple upstream/model requests.
  const poolPromise = fetchJsonWithTimeout({
    targetUrl: `${backendUrl}/api/recommendations/pool${query}`,
    controller: initialController,
    timeoutMs: effectiveTimeoutMs,
  });

  try {
    const pool = await poolPromise;

    if (pool.ok && hasUsableRoles(pool.data)) {
      return NextResponse.json(attachFrontendSource(pool.data, 'initial'), { status: pool.status });
    }

    // Backwards/defensive behavior:
    // If pool isn't usable, fall back to deterministic roles endpoint (fast).
    const roles = await fetchJsonWithTimeout({
      targetUrl: `${backendUrl}/api/recommendations/roles${query}`,
      controller: rolesController,
      timeoutMs: Math.min(8000, effectiveTimeoutMs),
    });

    if (roles.ok && hasUsableRoles(roles.data)) {
      return NextResponse.json(attachFrontendSource(roles.data, 'roles'), { status: roles.status });
    }

    return NextResponse.json(
      {
        error: 'Failed to load recommendations pool',
        details: {
          poolStatus: pool.status,
          rolesStatus: roles.status,
        },
      },
      { status: 502 },
    );
  } catch (e: any) {
    const isAbort =
      e?.name === 'AbortError' ||
      String(e?.message || '').toLowerCase().includes('aborted') ||
      String(e?.message || '').toLowerCase().includes('timeout');

    initialController.abort();
    rolesController.abort();

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
