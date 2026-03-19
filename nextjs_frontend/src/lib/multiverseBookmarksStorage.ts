/**
 * LocalStorage-backed bookmarking for Multiverse Explorer.
 *
 * Bookmarks are stored per-persona when a personaId is available; otherwise stored under "anon".
 */

export type MultiversePathType = 'vertical' | 'lateral' | 'pivot' | 'non_linear';

export interface MultiversePathBookmark {
  /** Stable id used for de-dupe; typically backend path id. */
  id: string;
  /** Human-readable label for the path, e.g. "Vertical: Software Engineer → Senior → Lead". */
  title: string;
  /** Underlying role titles/ids that make up the path. */
  steps: string[];
  /** Optional path type (when known). */
  pathType?: MultiversePathType;
  createdAt: string;
}

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window;
}

function keyFor(personaId?: string | null): string {
  const suffix = String(personaId ?? '').trim() || 'anon';
  return `career_navigator_multiverse_bookmarks__${suffix}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function listMultiverseBookmarks(personaId?: string | null): MultiversePathBookmark[] {
  /** List bookmarks for Multiverse Explorer (best-effort; returns [] on any failure). */
  const w = safeWindow();
  if (!w) return [];
  const parsed = safeParse<MultiversePathBookmark[]>(w.localStorage.getItem(keyFor(personaId)));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((b) => b && typeof b === 'object' && typeof (b as any).id === 'string')
    .map((b) => ({
      id: String((b as any).id),
      title: String((b as any).title ?? ''),
      steps: Array.isArray((b as any).steps) ? (b as any).steps.map(String) : [],
      pathType: (b as any).pathType,
      createdAt: String((b as any).createdAt ?? new Date().toISOString()),
    }));
}

function persist(personaId: string | null | undefined, bookmarks: MultiversePathBookmark[]): void {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(keyFor(personaId), JSON.stringify(bookmarks ?? []));
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function isMultiverseBookmarked(params: { personaId?: string | null; bookmarkId: string }): boolean {
  /** Returns true if the given path id is bookmarked. */
  const id = String(params.bookmarkId ?? '').trim();
  if (!id) return false;
  return listMultiverseBookmarks(params.personaId).some((b) => b.id === id);
}

// PUBLIC_INTERFACE
export function addMultiverseBookmark(params: {
  personaId?: string | null;
  bookmark: Omit<MultiversePathBookmark, 'createdAt'> & { createdAt?: string };
}): MultiversePathBookmark[] {
  /** Add (or upsert) a bookmark and return the updated list. */
  const id = String(params.bookmark?.id ?? '').trim();
  if (!id) return listMultiverseBookmarks(params.personaId);

  const next: MultiversePathBookmark = {
    id,
    title: String(params.bookmark.title ?? ''),
    steps: Array.isArray(params.bookmark.steps) ? params.bookmark.steps.map(String) : [],
    pathType: params.bookmark.pathType,
    createdAt: params.bookmark.createdAt ? String(params.bookmark.createdAt) : new Date().toISOString(),
  };

  const existing = listMultiverseBookmarks(params.personaId);
  const without = existing.filter((b) => b.id !== id);
  const updated = [next, ...without].slice(0, 200); // cap to avoid unbounded localStorage usage
  persist(params.personaId, updated);
  return updated;
}

// PUBLIC_INTERFACE
export function removeMultiverseBookmark(params: { personaId?: string | null; bookmarkId: string }): MultiversePathBookmark[] {
  /** Remove a bookmark by id and return the updated list. */
  const id = String(params.bookmarkId ?? '').trim();
  const existing = listMultiverseBookmarks(params.personaId);
  const updated = existing.filter((b) => b.id !== id);
  persist(params.personaId, updated);
  return updated;
}

// PUBLIC_INTERFACE
export function clearMultiverseBookmarks(personaId?: string | null): void {
  /** Clear all multiverse bookmarks for the given persona. */
  persist(personaId, []);
}

/**
 * Persist the last selected multiverse path type for UX continuity.
 */
function pathTypeKey(personaId?: string | null): string {
  const suffix = String(personaId ?? '').trim() || 'anon';
  return `career_navigator_multiverse_path_type__${suffix}`;
}

// PUBLIC_INTERFACE
export function getLastMultiversePathType(personaId?: string | null): MultiversePathType | null {
  /** Get last selected Multiverse path type (best-effort). */
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = String(w.localStorage.getItem(pathTypeKey(personaId)) ?? '').trim();
    if (raw === 'vertical' || raw === 'lateral' || raw === 'pivot' || raw === 'non_linear') return raw;
    return null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function persistLastMultiversePathType(personaId: string | null | undefined, t: MultiversePathType | null): void {
  /** Persist last selected Multiverse path type (best-effort). */
  const w = safeWindow();
  if (!w) return;
  try {
    if (!t) {
      w.localStorage.removeItem(pathTypeKey(personaId));
      return;
    }
    w.localStorage.setItem(pathTypeKey(personaId), t);
  } catch {
    // ignore
  }
}
