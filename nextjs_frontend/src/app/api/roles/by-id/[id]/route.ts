import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to fetch a single role by id from the Express backend.
 *
 * Forwards:
 *   GET {BACKEND}/api/roles/{id}
 *
 * This exists because the UI frequently stores the target role as a UUID role_id,
 * while /api/roles/search expects a text query and may not return results for UUIDs.
 *
 * PUBLIC_INTERFACE
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json({ error: 'Backend URL env variable not set' }, { status: 500 });
  }

  const { id } = await context.params;
  const roleId = (id ?? '').trim();

  if (!roleId) {
    return NextResponse.json({ error: 'validation_error', message: 'role id is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${backendUrl}/api/roles/${encodeURIComponent(roleId)}`, {
      method: 'GET',
      headers: {},
      cache: 'no-store',
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to proxy to backend', detail: e?.message || String(e) }, { status: 500 });
  }
}
