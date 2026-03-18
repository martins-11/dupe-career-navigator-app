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
    // Avoid waiting for upstream proxies to time out (preview environments often have a hard 30s cap).
    const timeoutMs = Number(process.env.NEXT_PUBLIC_BACKEND_PROXY_TIMEOUT_MS || 25000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 25000);

    const res = await fetch(`${backendUrl}/api/recommendations/initial${query}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.get("authorization")
          ? { authorization: req.headers.get("authorization")! }
          : {}),
      },
    }).finally(() => clearTimeout(timer));

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    const isAbort =
      e?.name === "AbortError" ||
      String(e?.message || "").toLowerCase().includes("aborted") ||
      String(e?.message || "").toLowerCase().includes("timeout");

    return NextResponse.json(
      {
        error: "Failed to proxy to backend",
        detail: e?.message || String(e),
        ...(isAbort ? { code: "backend_proxy_timeout" } : {}),
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
