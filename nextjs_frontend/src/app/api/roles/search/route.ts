import { NextRequest, NextResponse } from "next/server";

function toNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeRoleItem(item: any) {
  // Normalize common id/title variants.
  const id = String(item?.id ?? item?.role_id ?? item?.roleId ?? "").trim();
  const title = String(item?.title ?? item?.role_title ?? item?.roleTitle ?? "").trim();

  // Normalize Bedrock scoring/report variants to the UI's expected shape.
  // UI RoleCard reads:
  // - role.compatibilityScore OR role.threeTwoReport.compatibilityScore OR role.threeTwoReport.score
  const threeTwoReport =
    (item?.threeTwoReport && typeof item.threeTwoReport === "object" && item.threeTwoReport) ||
    (item?.three_two_report && typeof item.three_two_report === "object" && item.three_two_report) ||
    (item?.three_two && typeof item.three_two === "object" && item.three_two) ||
    null;

  const topLevelCompatibility =
    item?.compatibilityScore ?? item?.compatibility_score ?? item?.score ?? null;

  const reportCompatibility =
    threeTwoReport?.compatibilityScore ??
    threeTwoReport?.compatibility_score ??
    threeTwoReport?.score ??
    null;

  const compatibilityScore = toNumber(topLevelCompatibility ?? reportCompatibility);

  return {
    ...item,
    ...(id ? { id } : {}),
    ...(title ? { title } : {}),
    ...(threeTwoReport ? { threeTwoReport } : {}),
    ...(compatibilityScore !== null ? { compatibilityScore } : {}),
  };
}

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
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json({ error: "Backend URL env variable not set" }, { status: 500 });
  }

  try {
    const res = await fetch(`${backendUrl}/api/roles/search${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.get("authorization")
          ? { authorization: req.headers.get("authorization")! }
          : {}),
      },
    });

    const data = await res.json();

    // Keep response status the same; normalize payload for UI robustness.
    if (Array.isArray(data)) {
      return NextResponse.json(data.map(normalizeRoleItem), { status: res.status });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to proxy to backend", detail: e.message },
      { status: 500 }
    );
  }
}
