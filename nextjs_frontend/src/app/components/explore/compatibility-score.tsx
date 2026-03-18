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
}

/**
 * CompatibilityScore
 * Animated circular score meter with mastery/growth counts.
 *
 * Palette constraint:
 * - Uses semantic tokens (primary/foreground/muted) and palette-derived alphas only.
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
        <svg width={size} height={size} className="-rotate-90" aria-label={`Compatibility score: ${safeScore}%`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(var(--cn-slate-rgb), 0.12)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-3xl font-bold text-foreground"
          >
            {safeScore}%
          </motion.span>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-3 text-sm text-muted-foreground"
      >
        <span className="text-primary font-medium">{masteryCount} Mastery</span>
        {" | "}
        <span className="text-foreground font-medium">{growthCount} Growth</span>
      </motion.p>

      {(masteryList.length > 0 || growthList.length > 0) && (
        <div className="mt-3 w-full max-w-xs">
          {masteryList.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {masteryList.map((s) => (
                <span
                  key={`m:${s}`}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold border"
                  style={{
                    background: "rgba(var(--cn-primary-rgb), 0.10)",
                    color: "var(--cn-slate)",
                    borderColor: "rgba(var(--cn-primary-rgb), 0.25)",
                  }}
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
                  className="rounded-full px-2.5 py-1 text-xs font-semibold border"
                  style={{
                    background: "rgba(var(--cn-slate-rgb), 0.08)",
                    color: "var(--cn-muted)",
                    borderColor: "rgba(var(--cn-slate-rgb), 0.18)",
                  }}
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
