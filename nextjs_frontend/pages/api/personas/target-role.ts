import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Pages Router shim for /api/personas/target-role.
 *
 * Why this exists:
 * - Some build environments have surfaced `PageNotFoundError: Cannot find module for page: /api/...`
 *   during `next build` page data collection when server-side code fetches a relative `/api/...` URL.
 * - This file ensures a resolvable module exists in the Pages Router for that route.
 *
 * Behavior:
 * - Proxies to the Express backend:
 *   POST {BACKEND}/api/personas/target-role
 */
function getBackendBaseUrl(): string | null {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    null
  );
}

// PUBLIC_INTERFACE
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendUrl = getBackendBaseUrl();
  if (!backendUrl) {
    res.status(500).json({ error: 'backend_url_not_set', message: 'Backend URL env variable not set' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const targetUrl = `${backendUrl.replace(/\/+$/, '')}/api/personas/target-role`;

    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(req.headers.authorization ? { authorization: String(req.headers.authorization) } : {}),
      },
      body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : '{}',
      cache: 'no-store',
    });

    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (e: any) {
    res.status(500).json({
      error: 'proxy_failed',
      message: 'Failed to proxy to backend',
      detail: e?.message || String(e),
    });
  }
}
