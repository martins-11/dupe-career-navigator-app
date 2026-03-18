/**
 * Explore Recommendations Pool client + cache.
 *
 * Why this exists:
 * - In React dev (StrictMode), effects can run twice to detect unsafe side-effects.
 * - Explore has multiple views (Cards + Mindmap) that previously each fetched recommendations.
 * - When initial recommendations failed and the UI fell back to /roles, StrictMode doubled that again,
 *   producing 4 network calls on initial load + 2 more when switching to mindmap.
 *
 * This module provides:
 * - In-flight request de-dupe (same key => same promise)
 * - Short-lived cache (memory + sessionStorage) so switching views/searching doesn’t refetch
 *
 * IMPORTANT:
 * - Cache key is personaId + allowPadding (because that can affect the returned pool).
 * - This is intentionally frontend-side only; backend already de-dupes on its side, but the browser
 *   should not generate duplicates in the first place.
 */

import { apiFetch } from '@/lib/apiClient';

type CacheEntry = {
  roles: any[];
  meta: any | null;
  cachedAtMs: number;
};

type ExploreRecommendationsPoolResult = {
  roles: any[];
  meta: any | null;
};

const MEMORY_CACHE = new Map<string, CacheEntry>();
const IN_FLIGHT = new Map<string, Promise<ExploreRecommendationsPoolResult>>();

/**
 * We keep this short to avoid stale UX when backend logic evolves, but long enough to cover:
 * - initial explore load -> switching Cards/Mindmap
 * - typing search then clearing back to recommendations
 */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function cacheKey(params: { personaId: string; allowPadding: boolean }): string {
  return `${params.personaId}::allowPadding=${params.allowPadding ? '1' : '0'}`;
}

function sessionKey(key: string): string {
  return `career_navigator_explore_recs_pool::${key}`;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readFromSessionStorage(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = safeJsonParse<CacheEntry>(window.sessionStorage.getItem(sessionKey(key)));
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray((parsed as any).roles)) return null;
    if (typeof (parsed as any).cachedAtMs !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeToSessionStorage(key: string, entry: CacheEntry): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(sessionKey(key), JSON.stringify(entry));
  } catch {
    // best-effort; ignore quota/security errors
  }
}

function isFresh(entry: CacheEntry, ttlMs: number): boolean {
  return Date.now() - entry.cachedAtMs < ttlMs;
}

// PUBLIC_INTERFACE
export function primeExploreRecommendationsPoolCache(params: {
  personaId: string;
  allowPadding?: boolean;
  roles: any[];
  meta?: any | null;
}): void {
  /**
   * Allows callers to seed the cache with known recommendations (rarely needed, but useful when
   * a higher-level flow already fetched recommendations and wants Explore views to reuse them).
   */
  const personaId = String(params.personaId ?? '').trim();
  if (!personaId) return;

  const allowPadding = Boolean(params.allowPadding);
  const key = cacheKey({ personaId, allowPadding });

  const entry: CacheEntry = {
    roles: Array.isArray(params.roles) ? params.roles : [],
    meta: params.meta ?? null,
    cachedAtMs: Date.now(),
  };

  MEMORY_CACHE.set(key, entry);
  writeToSessionStorage(key, entry);
}

// PUBLIC_INTERFACE
export function clearExploreRecommendationsPoolCache(personaId?: string): void {
  /**
   * Clears cached recommendations (memory + sessionStorage).
   * If personaId is omitted, clears all cached entries.
   */
  const pid = personaId ? String(personaId).trim() : '';

  for (const key of Array.from(MEMORY_CACHE.keys())) {
    if (!pid || key.startsWith(`${pid}::`)) MEMORY_CACHE.delete(key);
  }
  for (const key of Array.from(IN_FLIGHT.keys())) {
    if (!pid || key.startsWith(`${pid}::`)) IN_FLIGHT.delete(key);
  }

  if (typeof window !== 'undefined') {
    try {
      const prefix = `career_navigator_explore_recs_pool::${pid ? `${pid}::` : ''}`;
      for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
        const k = window.sessionStorage.key(i);
        if (!k) continue;
        if (pid) {
          if (k.startsWith(prefix)) window.sessionStorage.removeItem(k);
        } else if (k.startsWith('career_navigator_explore_recs_pool::')) {
          window.sessionStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  }
}

// PUBLIC_INTERFACE
export async function getExploreRecommendationsPool(params: {
  personaId: string;
  allowPadding?: boolean;
  /**
   * Override cache TTL (ms). Defaults to a few minutes.
   * Use 0 to force a refetch (not recommended for normal UX).
   */
  ttlMs?: number;
}): Promise<ExploreRecommendationsPoolResult> {
  /**
   * Fetches the explore recommendations pool once per personaId (and allowPadding option),
   * and reuses the same promise + cached value across:
   * - Explore Cards view (RecommendationGrid)
   * - Explore Mindmap view
   * - returning from Search back to recommendations
   */
  const personaId = String(params.personaId ?? '').trim();
  if (!personaId) return { roles: [], meta: null };

  const allowPadding = Boolean(params.allowPadding);
  const ttlMs = typeof params.ttlMs === 'number' ? params.ttlMs : DEFAULT_TTL_MS;

  const key = cacheKey({ personaId, allowPadding });

  // 1) Memory cache
  const mem = MEMORY_CACHE.get(key);
  if (mem && ttlMs > 0 && isFresh(mem, ttlMs)) {
    return { roles: mem.roles, meta: mem.meta };
  }

  // 2) Session cache (helps across component unmounts and quick navigations)
  const session = readFromSessionStorage(key);
  if (session && ttlMs > 0 && isFresh(session, ttlMs)) {
    MEMORY_CACHE.set(key, session);
    return { roles: session.roles, meta: session.meta };
  }

  // 3) In-flight de-dupe
  const inflight = IN_FLIGHT.get(key);
  if (inflight) return inflight;

  // 4) Single fetch (browser-level) via /api/recommendations/pool
  const p = (async () => {
    const qs = new URLSearchParams({ personaId });
    if (allowPadding) qs.set('allowPadding', 'true');

    const data: any = await apiFetch(`/api/recommendations/pool?${qs.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const roles = (Array.isArray(data) ? data : data?.roles || []).filter(Boolean);
    const meta = !Array.isArray(data) ? (data?.meta ?? null) : null;

    const entry: CacheEntry = { roles, meta, cachedAtMs: Date.now() };
    MEMORY_CACHE.set(key, entry);
    writeToSessionStorage(key, entry);

    return { roles, meta };
  })()
    .finally(() => {
      // Ensure a failed request doesn't permanently poison the in-flight map.
      IN_FLIGHT.delete(key);
    });

  IN_FLIGHT.set(key, p);
  return p;
}
