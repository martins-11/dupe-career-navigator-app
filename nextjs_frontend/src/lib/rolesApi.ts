/**
 * Roles-related client helpers.
 *
 * This module exists primarily to support the Explore search autocomplete experience.
 */

import { apiFetch } from '@/lib/apiClient';

export type RoleSuggestion = {
  id: string;
  title: string;
};

function normalizeSuggestion(value: any, idx: number): RoleSuggestion | null {
  const titleRaw = value?.title ?? value?.role_title ?? value?.label ?? value?.name;
  const title = String(titleRaw ?? '').trim();
  if (!title) return null;

  const idRaw = value?.id ?? value?.role_id ?? value?.roleId ?? title;
  const id = String(idRaw ?? '').trim() || `suggestion-${idx}`;
  return { id, title };
}

// PUBLIC_INTERFACE
export async function getRoleSuggestions(
  q: string,
  limit = 5,
  opts: { signal?: AbortSignal; personaId?: string } = {}
): Promise<RoleSuggestion[]> {
  /**
   * Fetch role title suggestions.
   *
   * We prefer the app's Next.js API route for autocomplete:
   *   GET /api/roles/autocomplete?q=...&limit=...
   *
   * If a personaId is provided, we forward it as a query param for future compatibility
   * (the route handler may ignore it).
   */
  const qs = new URLSearchParams();
  qs.set('q', String(q ?? '').trim());
  qs.set('limit', String(limit));
  if (opts.personaId) qs.set('personaId', String(opts.personaId));

  const res = await apiFetch<any>(`/api/roles/autocomplete?${qs.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    signal: opts.signal,
  });

  const arr = Array.isArray(res) ? res : Array.isArray(res?.suggestions) ? res.suggestions : [];
  const normalized = arr.map(normalizeSuggestion).filter(Boolean) as RoleSuggestion[];

  // De-dupe while preserving order
  const seen = new Set<string>();
  const uniq: RoleSuggestion[] = [];
  for (const s of normalized) {
    const key = s.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(s);
  }
  return uniq.slice(0, limit);
}
