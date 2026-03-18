import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '../../_utils/backendProxy';

/**
 * Explore Recommendations Pool (frontend aggregator).
 *
 * This endpoint exists to ensure the BROWSER makes only ONE request when Explore loads.
 *
 * Reliability goals:
 * - Prefer the backend pooled endpoint first: GET {BACKEND}/api/recommendations/pool?personaId=...
 * - Use fallback (GET {BACKEND}/api/recommendations/roles?personaId=...) ONLY after a real timeout/error.
 *   This avoids returning guest_* fallback roles just because the proxy timed out too aggressively.
 *
 * Misconfiguration guard:
 * - If the backend URL accidentally points to the frontend origin, we'd create a proxy loop and 504.
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

  /**
   * Timeout tuning:
   * - Backend pooled Bedrock runs can be ~35–40s on cold runs.
   * - Prior default (~25s) caused the Next.js route to abort early and return 504.
   *
   * We keep a pool-specific timeout with a safer default, and allow override via env.
   *
   * Notes:
   * - NEXT_PUBLIC_* is used here because this app already uses that pattern; however this
   *   code runs server-side (route handler) so it’s safe to read non-public env vars too.
   * - Prefer setting NEXT_PUBLIC_RECOMMENDATIONS_POOL_PROXY_TIMEOUT_MS in the deployment
   *   environment if you need to tune without affecting other routes.
   */
  const poolTimeoutMsFromEnv = Number(
    process.env.NEXT_PUBLIC_RECOMMENDATIONS_POOL_PROXY_TIMEOUT_MS ||
      process.env.NEXT_PUBLIC_BACKEND_PROXY_TIMEOUT_MS ||
      '',
  );

  // Default: 65s, to comfortably cover typical cold-start pool latency.
  const poolTimeoutMs = Number.isFinite(poolTimeoutMsFromEnv) && poolTimeoutMsFromEnv > 0 ? poolTimeoutMsFromEnv : 65_000;

  // Fallback should be fast/deterministic; we keep it bounded.
  const fallbackTimeoutMs = 8_000;

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

  // 1) Pool-first: wait for backend pool to finish (with extended timeout).
  const poolController = new AbortController();
  const rolesController = new AbortController();

  try {
    const pool = await fetchJsonWithTimeout({
      targetUrl: `${backendUrl}/api/recommendations/pool${query}`,
      controller: poolController,
      timeoutMs: poolTimeoutMs,
    });

    /**
     * IMPORTANT: “fallback only after timeout/error”.
     * - If pool returns OK, we return it as-is (even if roles array is empty),
     *   to avoid immediately substituting guest_* fallback roles when the backend is
     *   still the source of truth for pooled Bedrock behavior/persistence.
     * - If pool returns non-OK (>=400), *then* we attempt fallback.
     */
    if (pool.ok) {
      return NextResponse.json(attachFrontendSource(pool.data, 'initial'), { status: pool.status });
    }

    // 2) Pool returned an error; try deterministic fallback endpoint (fast).
    const roles = await fetchJsonWithTimeout({
      targetUrl: `${backendUrl}/api/recommendations/roles${query}`,
      controller: rolesController,
      timeoutMs: fallbackTimeoutMs,
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

    // Ensure we don't keep upstream requests running.
    poolController.abort();

    /**
     * Pool timed out or errored. As a last-resort UX fallback, attempt roles.
     * This meets the requirement: fallback happens only after timeout/error.
     */
    try {
      const roles = await fetchJsonWithTimeout({
        targetUrl: `${backendUrl}/api/recommendations/roles${query}`,
        controller: rolesController,
        timeoutMs: fallbackTimeoutMs,
      });

      if (roles.ok && hasUsableRoles(roles.data)) {
        return NextResponse.json(attachFrontendSource(roles.data, 'roles'), { status: roles.status });
      }
    } catch {
      // ignore fallback failure; we return the original error below
    } finally {
      rolesController.abort();
    }

    return NextResponse.json(
      {
        error: 'Failed to proxy to backend recommendations pool',
        detail: e?.message || String(e),
        ...(isAbort ? { code: 'backend_proxy_timeout', timeoutMs: poolTimeoutMs } : {}),
      },
      { status: isAbort ? 504 : 500 },
    );
  }
}
