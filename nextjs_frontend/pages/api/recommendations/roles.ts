import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Pages Router shim for /api/recommendations/roles.
 *
 * Why this exists:
 * - Build error observed: `PageNotFoundError: Cannot find module for page: /api/recommendations/roles`
 *   during `next build` page data collection.
 * - This file ensures a resolvable module exists in the Pages Router for that route.
 *
 * Behavior:
 * - Proxies to the Express backend:
 *   GET {BACKEND}/api/recommendations/roles?personaId=...&...
 */
function getBackendBaseUrl(): string | null {
  return process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || null;
}

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

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // Preserve query string exactly
  const rawUrl = req.url || '';
  const query = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?')) : '';

  try {
    const targetUrl = `${backendUrl.replace(/\/+$/, '')}/api/recommendations/roles${query}`;

    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        ...(req.headers.authorization ? { authorization: String(req.headers.authorization) } : {}),
      },
      cache: 'no-store',
    });

    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'proxy_failed', message: 'Failed to proxy to backend', detail: e?.message || String(e) });
  }
}
