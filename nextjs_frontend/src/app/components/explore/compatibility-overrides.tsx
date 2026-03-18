'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SkillWithProficiency } from '@/lib/threeTwoScoring';
import { scoreRoleCompatibilityClient } from '@/lib/threeTwoScoring';

type OverrideRow = SkillWithProficiency;

interface CompatibilityOverridesProps {
  requiredSkills: string[];
  /** Initial user skill proficiencies if available; otherwise defaults will be used. */
  initialUserSkills?: SkillWithProficiency[];

  /** Callback on any change (for parent to re-render score ring). */
  onRecalc: (next: { score: number; masteryAreas: string[]; growthAreas: string[]; userSkills: SkillWithProficiency[] }) => void;
}

/**
 * PUBLIC_INTERFACE
 * CompatibilityOverrides
 *
 * Small control panel to allow user to override skill proficiency and see compatibility score update instantly.
 * Palette constraint: semantic tokens only.
 */
export function CompatibilityOverrides({ requiredSkills, initialUserSkills, onRecalc }: CompatibilityOverridesProps) {
  const initialMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of Array.isArray(initialUserSkills) ? initialUserSkills : []) {
      const name = String(s?.name || '').trim();
      if (!name) continue;
      map.set(name.toLowerCase(), Number(s?.proficiency ?? 0));
    }
    return map;
  }, [initialUserSkills]);

  const [rows, setRows] = useState<OverrideRow[]>(() => {
    return (Array.isArray(requiredSkills) ? requiredSkills : [])
      .map((name) => {
        const p = initialMap.get(String(name).toLowerCase());
        return { name, proficiency: Number.isFinite(Number(p)) ? Number(p) : 0 };
      })
      .slice(0, 12);
  });

  useEffect(() => {
    const userSkills = rows.map((r) => ({ name: r.name, proficiency: r.proficiency }));
    const compat = scoreRoleCompatibilityClient(userSkills, requiredSkills);
    onRecalc({ ...compat, userSkills });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, requiredSkills]);

  return (
    <div className="mt-4 w-full rounded-lg border bg-card p-3 text-card-foreground" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">Adjust skill proficiency (override)</div>
        <div className="text-xs text-muted-foreground">Realtime recalculation</div>
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-foreground" title={r.name}>
                {r.name}
              </div>
            </div>

            <input
              aria-label={`Override proficiency for ${r.name}`}
              type="range"
              min={0}
              max={100}
              value={r.proficiency}
              onChange={(e) => {
                const next = Number(e.target.value);
                setRows((prev) => prev.map((x) => (x.name === r.name ? { ...x, proficiency: next } : x)));
              }}
              className="w-40 accent-[var(--primary)]"
            />

            <div className="w-10 text-right text-sm font-semibold text-foreground">{Math.round(r.proficiency)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
