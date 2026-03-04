"use client";

import { motion } from "framer-motion";

interface CompatibilityScoreProps {
  score: number;
  masteryCount: number;
  growthCount: number;
}

/**
 * CompatibilityScore
 * Animated circular score meter with mastery/growth counts.
 *
 * This component is used by Explore RoleCard for both:
 * - Suggested Roles (recommendations)
 * - Search results (roles search)
 */
// PUBLIC_INTERFACE
export function CompatibilityScore({ score, masteryCount, growthCount }: CompatibilityScoreProps) {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-label={`Compatibility score: ${safeScore}%`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f0fdfa"
            strokeWidth={strokeWidth}
          />
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
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
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
        {" | "}
        <span className="text-amber-600 font-medium">{growthCount} Growth</span>
      </motion.p>
    </div>
  );
}
