/**
 * Derive "current role title" from the persisted persona JSON.
 *
 * Mindmap requires a current role title to center the graph.
 * Since we do not have authentication, we treat local persona storage as authoritative.
 */

import { loadPersonaId, loadPersona } from '@/lib/personaStorage';

function norm(v: unknown): string {
  return String(v ?? '').trim();
}

// PUBLIC_INTERFACE
export function getPersonaDerivedCurrentRoleTitle(): string | null {
  /**
   * Best-effort derivation of current role title from the locally stored persona.
   *
   * Supports multiple schema variants:
   * - PersonaDraft: persona.profile.headline
   * - Legacy: persona.current_role / currentRole / title / headline
   */
  const personaId = loadPersonaId();
  if (!personaId) return null;

  const persona = loadPersona(personaId);
  if (!persona || typeof persona !== 'object') return null;

  const candidates = [
    (persona as any)?.profile?.headline,
    (persona as any)?.current_role,
    (persona as any)?.currentRole,
    (persona as any)?.professional_title,
    (persona as any)?.title,
    (persona as any)?.headline,
    (persona as any)?.role,
  ];

  for (const c of candidates) {
    const v = norm(c);
    if (v) return v;
  }

  return null;
}
