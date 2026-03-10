import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for initial persona-driven Bedrock recommendations.
 *
 * Forwards incoming requests to the backend Express API:
 *   GET {BACKEND}/api/recommendations/initial?personaId=...
 *
 * PUBLIC_INTERFACE
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.search || "";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend URL env variable not set" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${backendUrl}/api/recommendations/initial${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.get("authorization")
          ? { authorization: req.headers.get("authorization")! }
          : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to proxy to backend", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
