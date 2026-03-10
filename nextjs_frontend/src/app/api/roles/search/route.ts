import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for roles search API.
 * Forwards incoming role search queries to the backend Express API.
 *
 * PUBLIC_INTERFACE
 */
export async function GET(req: NextRequest) {
  // Support all search query parameters
  const url = new URL(req.url);
  const query = url.search || "";
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.REACT_APP_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend URL env variable not set" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${backendUrl}/api/roles/search${query}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Forward authorization, etc if needed
          ...(req.headers.get("authorization")
            ? { authorization: req.headers.get("authorization")! }
            : {}),
        },
        // Optionally, you could forward cookies, etc. if required for auth
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to proxy to backend", detail: e.message },
      { status: 500 }
    );
  }
}
