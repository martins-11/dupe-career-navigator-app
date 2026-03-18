/**
 * LocalStorage-backed persistence for Mindmap view state.
 *
 * MindmapClient uses this for fast local restore, while also syncing to backend best-effort.
 */

const KEY = 'career_navigator_mindmap_view_state';

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window;
}

// PUBLIC_INTERFACE
export function getLocalMindmapViewState(): any | null {
  /** Read mindmap view state from localStorage (best-effort). */
  const w = safeWindow();
  if (!w) return null;

  try {
    const raw = w.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function persistLocalMindmapViewState(state: any): void {
  /** Persist mindmap view state to localStorage (best-effort). */
  const w = safeWindow();
  if (!w) return;

  try {
    w.localStorage.setItem(KEY, JSON.stringify(state ?? null));
  } catch {
    // ignore
  }
}
