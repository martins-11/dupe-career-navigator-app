import { NextRequest, NextResponse } from 'next/server';

/**
 * Explore Recommendations Pool (frontend aggregator).
 *
 * This endpoint exists to ensure the BROWSER makes only ONE request when Explore loads.
 * Server-side, we can try "initial" first and fall back to "roles" without the UI needing
 * to perform two separate fetches (which becomes 4 in React StrictMode dev).
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
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json({ error: 'Backend URL env variable not set' }, { status: 500 });
  }

  // Match /initial route: avoid waiting for upstream proxies to time out.
  const timeoutMs = Number(process.env.NEXT_PUBLIC_BACKEND_PROXY_TIMEOUT_MS || 25000);

  async function fetchJsonWithTimeout(targetUrl: string): Promise<{ ok: boolean; status: number; data: any }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 25000);

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
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

  try {
    // 1) Try initial
    const initial = await fetchJsonWithTimeout(`${backendUrl}/api/recommendations/initial${query}`);
    if (initial.ok && hasUsableRoles(initial.data)) {
      const meta = !Array.isArray(initial.data) ? (initial.data?.meta ?? null) : null;
      const merged = Array.isArray(initial.data)
        ? initial.data
        : { ...initial.data, meta: meta && typeof meta === 'object' ? { ...meta, frontendSource: 'initial' } : { frontendSource: 'initial' } };

      return NextResponse.json(merged, { status: initial.status });
    }

    // 2) Fallback to roles
    const roles = await fetchJsonWithTimeout(`${backendUrl}/api/recommendations/roles${query}`);
    if (roles.ok) {
      const meta = !Array.isArray(roles.data) ? (roles.data?.meta ?? null) : null;
      const merged = Array.isArray(roles.data)
        ? roles.data
        : { ...roles.data, meta: meta && typeof meta === 'object' ? { ...meta, frontendSource: 'roles' } : { frontendSource: 'roles' } };

      return NextResponse.json(merged, { status: roles.status });
    }

    return NextResponse.json(
      {
        error: 'Failed to load recommendations pool',
        details: {
          initialStatus: initial.status,
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
