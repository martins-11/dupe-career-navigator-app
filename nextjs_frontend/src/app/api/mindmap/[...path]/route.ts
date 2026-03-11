import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/app/api/_utils/backendProxy';

/**
 * Catch-all mindmap API proxy for the Next.js App Router.
 *
 * This proxy is intentionally resilient to backend mount-path drift.
 *
 * Some environments may mount the Express mindmap router at:
 * - /api/mindmap/*  (preferred/canonical)
 * while others may mount it at:
 * - /mindmap/*      (legacy)
 *
 * When the backend returns the standard JSON 404 envelope:
 *   { "error":"not_found", "message":"No route for POST /api/mindmap/graph" }
 * we automatically retry with the legacy mount path.
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

function buildMindmapSuffix(req: NextRequest): string {
  const url = new URL(req.url);
  // `/api/mindmap/...` -> `...`
  return url.pathname.replace(/^\/api\/mindmap\/?/, '');
}

async function proxyMindmapWithFallback(req: NextRequest): Promise<NextResponse> {
  const backendUrl = getBackendBaseUrl();
  if (!backendUrl) {
    return NextResponse.json({ error: 'backend_url_not_set', message: 'Backend URL env variable not set' }, { status: 500 });
  }

  const incomingUrl = new URL(req.url);
  const suffix = buildMindmapSuffix(req);

  // Try canonical path first.
  const canonicalPath = `/api/mindmap/${suffix}`;
  const legacyPath = `/mindmap/${suffix}`;

  // Forward common headers; avoid forwarding "host" which can confuse upstream.
  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers.authorization = auth;

  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  // Support JSON body methods and also allow empty bodies.
  let body: string | undefined = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
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

  async function doFetch(path: string) {
    const targetUrl = `${backendUrl}${path}${incomingUrl.search}`;
    return fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });
  }

  const res = await doFetch(canonicalPath);

  // If the backend is returning its standardized /api 404 envelope, retry on legacy path.
  if (res.status === 404) {
    const resContentType = res.headers.get('content-type') || '';
    if (resContentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      if (data && typeof data === 'object' && (data as any).error === 'not_found') {
        const legacyRes = await doFetch(legacyPath);

        const legacyContentType = legacyRes.headers.get('content-type') || '';
        if (legacyContentType.includes('application/json')) {
          const legacyData = await legacyRes.json().catch(() => null);
          return NextResponse.json(legacyData ?? {}, { status: legacyRes.status });
        }

        const legacyText = await legacyRes.text().catch(() => '');
        return new NextResponse(legacyText, { status: legacyRes.status });
      }

      // Not the "missing route" envelope; return original.
      return NextResponse.json(data ?? {}, { status: res.status });
    }
  }

  // Normal pass-through for canonical response.
  const resContentType = res.headers.get('content-type') || '';
  if (resContentType.includes('application/json')) {
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  }

  const text = await res.text().catch(() => '');
  return new NextResponse(text, { status: res.status });
}

// PUBLIC_INTERFACE
export async function GET(req: NextRequest) {
  return proxyMindmapWithFallback(req);
}

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  return proxyMindmapWithFallback(req);
}

// PUBLIC_INTERFACE
export async function PUT(req: NextRequest) {
  return proxyMindmapWithFallback(req);
}

// PUBLIC_INTERFACE
export async function PATCH(req: NextRequest) {
  return proxyMindmapWithFallback(req);
}

// PUBLIC_INTERFACE
export async function DELETE(req: NextRequest) {
  return proxyMindmapWithFallback(req);
}

// PUBLIC_INTERFACE
export async function OPTIONS(req: NextRequest) {
  return proxyMindmapWithFallback(req);
}
