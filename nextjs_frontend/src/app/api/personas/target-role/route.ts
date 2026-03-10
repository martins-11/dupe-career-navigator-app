import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for target-role selection persistence.
 *
 * Forwards incoming requests to backend Express API:
 *   POST {BACKEND}/api/personas/target-role
 *
 * Body:
 *   { user_id: uuid, role_id: uuid, time_horizon: "Near"|"Mid"|"Far" }
 *
 * PUBLIC_INTERFACE
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json({ error: "Backend URL env variable not set" }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e: any) {
    return NextResponse.json(
      { error: "invalid_json", detail: e?.message || String(e) },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${backendUrl}/api/personas/target-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.get("authorization")
          ? { authorization: req.headers.get("authorization")! }
          : {}),
      },
      body: JSON.stringify(body ?? {}),
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to proxy to backend", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
