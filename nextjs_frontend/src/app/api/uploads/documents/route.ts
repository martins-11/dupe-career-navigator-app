import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/app/api/_utils/backendProxy';

/**
 * Upload Documents (proxy)
 *
 * The frontend intentionally calls same-origin `/api/*` routes so that browser requests
 * always hit the Next.js app (port 3000 in dev/preview) without hardcoding backend origins.
 *
 * This route proxies the multipart upload to the Express backend:
 *  - POST {BACKEND}/uploads/documents
 *
 * PUBLIC_INTERFACE
 */
export const runtime = 'nodejs';

// PUBLIC_INTERFACE
export async function POST(req: NextRequest) {
  const backendUrl = getBackendBaseUrl();

  if (!backendUrl) {
    return NextResponse.json(
      { error: 'backend_url_not_set', message: 'Backend URL env variable not set' },
      { status: 500 },
    );
  }

  const incomingUrl = new URL(req.url);
  const targetUrl = `${backendUrl}/uploads/documents${incomingUrl.search}`;

  // Forward only safe headers. For multipart, preserve Content-Type (includes boundary).
  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers.authorization = auth;

  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  try {
    // Avoid parsing multipart: forward raw bytes + original content-type.
    const raw = await req.arrayBuffer();
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: Buffer.from(raw),
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
      {
        error: 'proxy_failed',
        message: 'Failed to proxy upload to backend',
        detail: e?.message || String(e),
      },
      { status: 500 },
    );
  }
}
