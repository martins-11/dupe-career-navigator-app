/**
 * LocalStorage-backed persona persistence helpers.
 *
 * The app uses these utilities to persist personaId and persona JSON across refreshes
 * and to share context between routes (Ingestion -> Explore -> Mindmap).
 */

import type { UUID } from '@/lib/apiClient';

const PERSONA_ID_KEY = 'career_navigator_persona_id';
const PERSONA_KEY_PREFIX = 'career_navigator_persona_';

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window;
}

// PUBLIC_INTERFACE
export function persistPersonaId(personaId: UUID | null | undefined): UUID | null {
  /** Persist persona id in localStorage (best-effort). */
  const w = safeWindow();
  if (!w) return personaId ? String(personaId) : null;

  const value = String(personaId ?? '').trim();
  try {
    if (value) w.localStorage.setItem(PERSONA_ID_KEY, value);
    else w.localStorage.removeItem(PERSONA_ID_KEY);
  } catch {
    // ignore storage failures (private browsing / quota / disabled)
  }
  return value || null;
}

// PUBLIC_INTERFACE
export function loadPersonaId(): UUID | null {
  /** Load persisted personaId from localStorage (best-effort). */
  const w = safeWindow();
  if (!w) return null;

  try {
    const v = w.localStorage.getItem(PERSONA_ID_KEY);
    return v && v.trim() ? (v.trim() as UUID) : null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function getCurrentPersonaId(): UUID | null {
  /** Alias used by App.tsx for readability. */
  return loadPersonaId();
}

// PUBLIC_INTERFACE
export function savePersona(personaId: UUID, personaJson: any): void {
  /** Persist persona JSON blob for a specific persona id (best-effort). */
  const w = safeWindow();
  if (!w) return;

  const key = `${PERSONA_KEY_PREFIX}${String(personaId)}`;
  try {
    w.localStorage.setItem(key, JSON.stringify(personaJson ?? null));
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function loadPersona(personaId: UUID): any | null {
  /** Load persona JSON blob for a specific persona id (best-effort). */
  const w = safeWindow();
  if (!w) return null;

  const key = `${PERSONA_KEY_PREFIX}${String(personaId)}`;
  try {
    const raw = w.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function persistPersonaIdFromOrchestrationResponse(orchestrationEnvelope: any): UUID | null {
  /**
   * Best-effort extraction of personaId from orchestration responses.
   * The backend envelope may evolve, so this function tries several known paths.
   */
  const candidates: unknown[] = [
    orchestrationEnvelope?.results?.generate?.personaId,
    orchestrationEnvelope?.results?.finalize?.personaId,
    orchestrationEnvelope?.orchestration?.personaId,
    orchestrationEnvelope?.build?.personaId,
    orchestrationEnvelope?.personaId,
  ];

  for (const c of candidates) {
    const v = String(c ?? '').trim();
    if (v) return v as UUID;
  }
  return null;
}
