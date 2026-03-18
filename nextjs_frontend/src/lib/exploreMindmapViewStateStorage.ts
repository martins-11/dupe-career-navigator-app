/**
 * LocalStorage-backed persistence for the Explore mind map view state.
 *
 * This is intentionally separate from the /mindmap route state so Explore and Mindmap
 * can evolve independently without clobbering each other.
 */

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window;
}

function buildKey(personaId?: string | null): string {
  const suffix = (personaId ?? '').trim() || 'anon';
  return `career_navigator_explore_mindmap_view_state__${suffix}`;
}

export type ExploreMindmapViewState = {
  version: 1;
  panX: number;
  panY: number;
  zoom: number;
  selectedNodeId: string | null;
};

const DEFAULT_STATE: ExploreMindmapViewState = {
  version: 1,
  panX: 0,
  panY: 0,
  zoom: 1,
  selectedNodeId: null,
};

// PUBLIC_INTERFACE
export function getExploreMindmapViewState(personaId?: string | null): ExploreMindmapViewState {
  /** Get the persisted Explore mind map view state for the given persona (best-effort). */
  const w = safeWindow();
  if (!w) return DEFAULT_STATE;

  try {
    const raw = w.localStorage.getItem(buildKey(personaId));
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') return DEFAULT_STATE;

    const panX = typeof parsed.panX === 'number' ? parsed.panX : DEFAULT_STATE.panX;
    const panY = typeof parsed.panY === 'number' ? parsed.panY : DEFAULT_STATE.panY;
    const zoom = typeof parsed.zoom === 'number' ? parsed.zoom : DEFAULT_STATE.zoom;
    const selectedNodeId = typeof parsed.selectedNodeId === 'string' ? parsed.selectedNodeId : null;

    return { version: 1, panX, panY, zoom, selectedNodeId };
  } catch {
    return DEFAULT_STATE;
  }
}

// PUBLIC_INTERFACE
export function persistExploreMindmapViewState(personaId: string | null | undefined, state: ExploreMindmapViewState): void {
  /** Persist the Explore mind map view state for the given persona (best-effort). */
  const w = safeWindow();
  if (!w) return;

  try {
    w.localStorage.setItem(buildKey(personaId), JSON.stringify(state ?? null));
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function getExploreViewMode(): 'cards' | 'mindmap' {
  /** Get Explore view mode (cards vs mindmap). */
  const w = safeWindow();
  if (!w) return 'cards';
  try {
    const raw = w.localStorage.getItem('career_navigator_explore_view_mode');
    return raw === 'mindmap' ? 'mindmap' : 'cards';
  } catch {
    return 'cards';
  }
}

// PUBLIC_INTERFACE
export function persistExploreViewMode(mode: 'cards' | 'mindmap'): void {
  /** Persist Explore view mode (cards vs mindmap). */
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem('career_navigator_explore_view_mode', mode);
  } catch {
    // ignore
  }
}
