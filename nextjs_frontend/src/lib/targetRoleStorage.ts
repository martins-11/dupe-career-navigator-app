/**
 * LocalStorage-backed target role selection.
 *
 * Explore uses this to persist a single "target role" selection across routes.
 */

export type TimeHorizon = 'Near' | 'Mid' | 'Far';

export interface TargetRoleSelection {
  roleId: string | null;
  timeHorizon: TimeHorizon;
}

const TARGET_ROLE_ID_KEY = 'career_navigator_target_role_id';
const TARGET_ROLE_TIME_HORIZON_KEY = 'career_navigator_target_role_time_horizon';

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window;
}

function normalizeTimeHorizon(v: unknown): TimeHorizon {
  const s = String(v ?? '').trim();
  if (s === 'Mid' || s === 'Far') return s;
  return 'Near';
}

// PUBLIC_INTERFACE
export function persistTargetRoleSelection(selection: { roleId: string; timeHorizon?: TimeHorizon }): void {
  /** Persist target role selection in localStorage (best-effort). */
  const w = safeWindow();
  if (!w) return;

  const roleId = String(selection.roleId ?? '').trim();
  const timeHorizon = normalizeTimeHorizon(selection.timeHorizon);

  try {
    w.localStorage.setItem(TARGET_ROLE_ID_KEY, roleId);
    w.localStorage.setItem(TARGET_ROLE_TIME_HORIZON_KEY, timeHorizon);
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function getTargetRoleSelection(): TargetRoleSelection {
  /** Get target role selection from localStorage (best-effort). */
  const w = safeWindow();
  if (!w) return { roleId: null, timeHorizon: 'Near' };

  try {
    const roleIdRaw = w.localStorage.getItem(TARGET_ROLE_ID_KEY);
    const timeRaw = w.localStorage.getItem(TARGET_ROLE_TIME_HORIZON_KEY);

    const roleId = roleIdRaw && roleIdRaw.trim() ? roleIdRaw.trim() : null;
    return { roleId, timeHorizon: normalizeTimeHorizon(timeRaw) };
  } catch {
    return { roleId: null, timeHorizon: 'Near' };
  }
}

// PUBLIC_INTERFACE
export function getTargetRoleId(): string | null {
  /** Convenience accessor (used by Mindmap/Persona pages). */
  return getTargetRoleSelection().roleId;
}
