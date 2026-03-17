/**
 * Client-side role compatibility scoring helpers ("3-2 report" scoring).
 *
 * This module is used only by the frontend to provide instant feedback when users
 * adjust their skill proficiency overrides (no backend round-trip).
 */

export type SkillWithProficiency = {
  name: string;
  /**
   * 0..100 where:
   * - 0   = no experience
   * - 100 = expert
   */
  proficiency: number;
};

export type CompatibilityScoreResult = {
  /** Overall compatibility score as 0..100 integer. */
  score: number;
  /** Skills the user is strong in (subset of requiredSkills). */
  masteryAreas: string[];
  /** Skills the user should improve (subset of requiredSkills). */
  growthAreas: string[];
};

function normSkill(s: unknown): string {
  return String(s ?? '').trim();
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Convert 0..100 proficiency to a 0..1 score.
 * We keep this linear and simple for deterministic UI behavior.
 */
function proficiencyToUnit(p: unknown): number {
  const n = Number(p);
  return clamp01(n / 100);
}

// PUBLIC_INTERFACE
export function scoreRoleCompatibilityClient(
  userSkills: SkillWithProficiency[],
  requiredSkills: string[]
): CompatibilityScoreResult {
  /**
   * Score compatibility between user skills and required role skills.
   *
   * Deterministic heuristic:
   * - For each required skill, look up user proficiency (0..100, default 0)
   * - Compute average proficiency across required skills
   * - masteryAreas: proficiency >= 70
   * - growthAreas: 0 < proficiency < 70, plus missing skills (0) capped for UI
   */
  const required = (Array.isArray(requiredSkills) ? requiredSkills : [])
    .map(normSkill)
    .filter(Boolean);

  if (required.length === 0) {
    return { score: 0, masteryAreas: [], growthAreas: [] };
  }

  const map = new Map<string, number>();
  for (const s of Array.isArray(userSkills) ? userSkills : []) {
    const name = normSkill((s as any)?.name).toLowerCase();
    if (!name) continue;
    map.set(name, Number((s as any)?.proficiency ?? 0));
  }

  const masteryAreas: string[] = [];
  const growthAreas: string[] = [];

  let sum = 0;
  for (const req of required) {
    const p = Number(map.get(req.toLowerCase()) ?? 0);
    const unit = proficiencyToUnit(p);
    sum += unit;

    if (p >= 70) masteryAreas.push(req);
    else growthAreas.push(req);
  }

  const avgUnit = sum / required.length;
  const score = clampPercent(avgUnit * 100);

  // Keep arrays compact and stable for UI.
  return {
    score,
    masteryAreas: masteryAreas.slice(0, 6),
    growthAreas: growthAreas.slice(0, 6),
  };
}
