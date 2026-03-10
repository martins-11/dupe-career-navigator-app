'use client';

import { useMemo, useState } from 'react';
import { CompatibilityScore } from '@/app/components/explore/compatibility-score';
import { CompatibilityOverrides } from '@/app/components/explore/compatibility-overrides';
import type { SkillWithProficiency } from '@/lib/threeTwoScoring';

interface CompatibilityWidgetProps {
  /** Initial values coming from backend. */
  score?: number;
  masteryAreas?: string[];
  growthAreas?: string[];
  requiredSkills?: string[];

  /**
   * Optional seed: if caller can supply proficiency-bearing skills from persona,
   * it will be used to seed the override sliders.
   */
  initialUserSkills?: SkillWithProficiency[];
}

/**
 * PUBLIC_INTERFACE
 * CompatibilityWidget
 *
 * Renders:
 * - Score ring + counts + mastery/growth tags
 * - Override controls (skill sliders) that recalc score and tags in real time
 */
export function CompatibilityWidget({
  score = 0,
  masteryAreas,
  growthAreas,
  requiredSkills,
  initialUserSkills,
}: CompatibilityWidgetProps) {
  const initial = useMemo(() => {
    return {
      score: Number.isFinite(score) ? score : 0,
      masteryAreas: Array.isArray(masteryAreas) ? masteryAreas : [],
      growthAreas: Array.isArray(growthAreas) ? growthAreas : [],
    };
  }, [score, masteryAreas, growthAreas]);

  const [live, setLive] = useState(initial);

  const masteryCount = live.masteryAreas.length;
  const growthCount = live.growthAreas.length;

  return (
    <div className="w-full">
      <CompatibilityScore
        score={live.score}
        masteryCount={masteryCount}
        growthCount={growthCount}
        masteryAreas={live.masteryAreas}
        growthAreas={live.growthAreas}
      />

      {Array.isArray(requiredSkills) && requiredSkills.length > 0 && (
        <CompatibilityOverrides
          requiredSkills={requiredSkills}
          initialUserSkills={initialUserSkills}
          onRecalc={(next) => {
            setLive({
              score: next.score,
              masteryAreas: next.masteryAreas,
              growthAreas: next.growthAreas,
            });
          }}
        />
      )}
    </div>
  );
}
