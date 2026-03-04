#!/usr/bin/env bash
set -euo pipefail

# Verifies that the backend routes and Next.js rewrites return JSON (not HTML 404 pages).
# NOTE: This script does NOT start any servers.
#
# Expected:
# - /api/roles/autocomplete returns a JSON array (possibly empty).
# - /api/recommendations/roles returns a JSON object with { roles: [...] } (or a JSON error), but never HTML.

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

echo "== Backend direct checks (Express) =="
echo "-- GET ${BACKEND_URL}/api/roles/autocomplete?q=manager"
curl -sS -D /tmp/headers_roles_autocomplete.txt \
  "${BACKEND_URL}/api/roles/autocomplete?q=manager" \
  -o /tmp/body_roles_autocomplete.txt

echo "Status/Content-Type:"
grep -E '^(HTTP/|content-type:)' -i /tmp/headers_roles_autocomplete.txt || true
echo "Body (first 200 chars):"
head -c 200 /tmp/body_roles_autocomplete.txt; echo
if grep -qi '<!DOCTYPE html' /tmp/body_roles_autocomplete.txt; then
  echo "ERROR: Backend returned HTML for /api/roles/autocomplete (routing likely broken)."
  exit 1
fi

echo
echo "-- GET ${BACKEND_URL}/api/recommendations/roles"
curl -sS -D /tmp/headers_reco_roles.txt \
  "${BACKEND_URL}/api/recommendations/roles" \
  -o /tmp/body_reco_roles.txt

echo "Status/Content-Type:"
grep -E '^(HTTP/|content-type:)' -i /tmp/headers_reco_roles.txt || true
echo "Body (first 200 chars):"
head -c 200 /tmp/body_reco_roles.txt; echo
if grep -qi '<!DOCTYPE html' /tmp/body_reco_roles.txt; then
  echo "ERROR: Backend returned HTML for /api/recommendations/roles (routing likely broken)."
  exit 1
fi

echo
echo "== Frontend proxy checks (Next.js rewrites) =="
echo "-- GET ${FRONTEND_URL}/api/roles/autocomplete?q=manager"
curl -sS -D /tmp/headers_front_roles_autocomplete.txt \
  "${FRONTEND_URL}/api/roles/autocomplete?q=manager" \
  -o /tmp/body_front_roles_autocomplete.txt

echo "Status/Content-Type:"
grep -E '^(HTTP/|content-type:)' -i /tmp/headers_front_roles_autocomplete.txt || true
echo "Body (first 200 chars):"
head -c 200 /tmp/body_front_roles_autocomplete.txt; echo
if grep -qi '<!DOCTYPE html' /tmp/body_front_roles_autocomplete.txt; then
  echo "ERROR: Frontend returned HTML for /api/roles/autocomplete (rewrite missing or backend unreachable)."
  exit 1
fi

echo
echo "-- GET ${FRONTEND_URL}/api/recommendations/roles"
curl -sS -D /tmp/headers_front_reco_roles.txt \
  "${FRONTEND_URL}/api/recommendations/roles" \
  -o /tmp/body_front_reco_roles.txt

echo "Status/Content-Type:"
grep -E '^(HTTP/|content-type:)' -i /tmp/headers_front_reco_roles.txt || true
echo "Body (first 200 chars):"
head -c 200 /tmp/body_front_reco_roles.txt; echo
if grep -qi '<!DOCTYPE html' /tmp/body_front_reco_roles.txt; then
  echo "ERROR: Frontend returned HTML for /api/recommendations/roles (rewrite missing or backend unreachable)."
  exit 1
fi

echo
echo "OK: API routing verification passed (no HTML responses detected)."
