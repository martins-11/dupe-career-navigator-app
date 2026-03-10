"use client";

import { motion } from "framer-motion";

interface CompatibilityScoreProps {
  /** Optional: compatibility percent (0-100). Defaults to 0 for placeholder rendering. */
  score?: number;
  /** Optional: number of mastery matches. Defaults to 0. */
  masteryCount?: number;
  /** Optional: number of growth opportunities. Defaults to 0. */
  growthCount?: number;

  /** Optional: mastery skill names (for chip/tag rendering). */
  masteryAreas?: string[];
  /** Optional: growth skill names (for chip/tag rendering). */
  growthAreas?: string[];

  /** Optional persona id (passed by ExploreClient for future persona-aware scoring). */
  personaId?: string;
}

/**
 * CompatibilityScore
 * Animated circular score meter with mastery/growth counts.
 *
 * This component is used by Explore RoleCard for both:
 * - Suggested Roles (recommendations)
 * - Search results (roles search)
 */
/**
 * NOTE: This component is sometimes rendered as a placeholder (e.g., in ExploreClient's
 * "Compatibility Deep-Dive") without computed scoring data yet. To keep build/type-checking
 * strict and the UI stable, props are optional with safe defaults.
 */
// PUBLIC_INTERFACE
export function CompatibilityScore({
  score = 0,
  masteryCount = 0,
  growthCount = 0,
  masteryAreas,
  growthAreas,
}: CompatibilityScoreProps) {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 100) * circumference;

  const masteryList = Array.isArray(masteryAreas) ? masteryAreas.filter(Boolean).slice(0, 3) : [];
  const growthList = Array.isArray(growthAreas) ? growthAreas.filter(Boolean).slice(0, 2) : [];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-label={`Compatibility score: ${safeScore}%`}
        >
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f0fdfa" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#0d9488"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-3xl font-bold text-gray-800"
          >
            {safeScore}%
          </motion.span>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-3 text-sm text-gray-500"
      >
        <span className="text-teal-600 font-medium">{masteryCount} Mastery</span>
        {' | '}
        <span className="text-amber-600 font-medium">{growthCount} Growth</span>
      </motion.p>

      {(masteryList.length > 0 || growthList.length > 0) && (
        <div className="mt-3 w-full max-w-xs">
          {masteryList.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {masteryList.map((s) => (
                <span
                  key={`m:${s}`}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(13, 148, 136, 0.10)', color: '#0f766e', border: '1px solid rgba(13, 148, 136, 0.25)' }}
                >
                  Mastery: {s}
                </span>
              ))}
            </div>
          )}

          {growthList.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {growthList.map((s) => (
                <span
                  key={`g:${s}`}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.10)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.25)' }}
                >
                  Growth: {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
