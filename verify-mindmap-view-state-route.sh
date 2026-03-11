#!/usr/bin/env bash
set -euo pipefail

# Verifies that the Next.js API route exists for POST /api/mindmap/view-state.
# NOTE: This script does NOT start any servers.
#
# Expected:
# - The endpoint should not return 405 Method Not Allowed.
# - Status might still be 4xx/5xx if backend is down, but method must be allowed.

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

echo "-- POST ${FRONTEND_URL}/api/mindmap/view-state"
curl -sS -D /tmp/headers_front_mindmap_view_state_post.txt \
  -H "Content-Type: application/json" \
  -d '{"personaId":"00000000-0000-0000-0000-000000000000","viewState":{"zoom":1}}' \
  "${FRONTEND_URL}/api/mindmap/view-state" \
  -o /tmp/body_front_mindmap_view_state_post.txt || true

echo "Status/Content-Type:"
grep -E '^(HTTP/|content-type:)' -i /tmp/headers_front_mindmap_view_state_post.txt || true
echo "Body (first 200 chars):"
head -c 200 /tmp/body_front_mindmap_view_state_post.txt; echo

if grep -qE '^HTTP/[0-9.]+\s+405\b' /tmp/headers_front_mindmap_view_state_post.txt; then
  echo "ERROR: Frontend returned 405 for POST /api/mindmap/view-state (route missing POST handler)."
  exit 1
fi

echo "OK: POST method is allowed for /api/mindmap/view-state (not 405)."
