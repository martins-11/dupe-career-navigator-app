import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Pages Router shim for /api/mindmap/view-state.
 *
 * Why this exists:
 * - Some build environments surface `PageNotFoundError: Cannot find module for page: /api/mindmap/view-state`
 *   during `next build` "Collecting page data", even though the App Router route handler exists.
 * - Providing a Pages Router API implementation ensures Next can always resolve a module for this route.
 *
 * Behavior:
 * - Proxies to the Express backend:
 *   - GET  {BACKEND}/api/mindmap/view-state?...
 *   - PUT  {BACKEND}/api/mindmap/view-state
 *   - POST {BACKEND}/api/mindmap/view-state (legacy/client compatibility)
 */
function getBackendBaseUrl(): string | null {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    null
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendUrl = getBackendBaseUrl();
  if (!backendUrl) {
    res.status(500).json({
      error: 'backend_url_not_set',
      message: 'Backend URL env variable not set',
    });
    return;
  }

  if (req.method === 'OPTIONS') {
    // Minimal preflight response; proxying OPTIONS is unnecessary for same-origin in most deployments.
    res.status(204).end();
    return;
  }

  const method = (req.method || 'GET').toUpperCase();
  const allowed = ['GET', 'PUT', 'POST'];

  if (!allowed.includes(method)) {
    res.setHeader('Allow', `${allowed.join(', ')}, OPTIONS`);
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // Preserve query string exactly for GET
  const rawUrl = req.url || '';
  const query = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?')) : '';

  try {
    const targetUrl = `${backendUrl.replace(/\/+$/, '')}/api/mindmap/view-state${method === 'GET' ? query : ''}`;

    const upstream = await fetch(targetUrl, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(req.headers.authorization ? { authorization: String(req.headers.authorization) } : {}),
      },
      body: method === 'GET' ? undefined : JSON.stringify(req.body ?? {}),
      cache: 'no-store',
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(data);
      return;
    }

    const text = await upstream.text().catch(() => '');
    res.status(upstream.status).send(text);
  } catch (e: any) {
    res.status(500).json({
      error: 'proxy_failed',
      message: 'Failed to proxy to backend',
      detail: e?.message || String(e),
    });
  }
}
