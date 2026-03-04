"use client";

import type React from "react";
import { useState } from "react";
import { Briefcase, Check, ChevronRight } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import type { Role } from "@/app/components/explore/roles-data";

interface RoleCardProps {
  role: Role;
  index: number;
}

/**
 * RoleCard replicates ZIP interactions:
 * - enter animation with index-based delay
 * - hover: elevate + translate + scale + expands extra content
 * - select: local-only (backend save endpoint is not available yet)
 */
// PUBLIC_INTERFACE
export function RoleCard({ role, index }: RoleCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const isInteractiveHover = isHovered && !isSelected;

  function handleSelect(e: React.MouseEvent) {
    e.stopPropagation();

    // Backend save endpoint is not implemented. We keep selection local-only.
    setIsSelected(true);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
      <div
        className={cn("relative overflow-hidden cursor-pointer", "transition-all duration-[260ms] ease-out")}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-card)",
          boxShadow: isInteractiveHover
            ? "0 14px 34px rgba(23, 166, 166, 0.14), 0 2px 6px rgba(23, 58, 74, 0.06)"
            : "var(--shadow-card)",
          transform: isInteractiveHover ? "translateY(-2px)" : "translateY(0px)",
          borderColor: isInteractiveHover ? "rgba(23,166,166,0.45)" : "var(--border-subtle)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-[14px] leading-tight text-balance" style={{ color: "var(--text-strong)" }}>
                {role.title}
              </h3>
              <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <Briefcase className="h-3 w-3" />
                {role.industry}
              </span>
            </div>

            {/* Career level badge */}
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase shrink-0"
              style={{
                background: "var(--chip-bg)",
                border: "1px solid var(--border-chip)",
                color: "var(--text-body)",
              }}
            >
              {role.careerLevel}
            </span>
          </div>

          {/* Salary & Experience row */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: "var(--text-muted)" }}>Salary</span>
              <span className="font-semibold" style={{ color: "var(--text-strong)" }}>{`₹${role.salaryMin}L – ₹${role.salaryMax}L`}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: "var(--text-muted)" }}>Experience</span>
              <span className="font-semibold" style={{ color: "var(--text-strong)" }}>
                {role.experience}
              </span>
            </div>

            {/* 3/2 Score tags (Mastery/Growth) */}
            {role.threeTwoReport && (
              <div className="flex flex-wrap gap-2 pt-1">
                {typeof role.threeTwoReport.mastery === "number" && (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      background: "rgba(22, 163, 74, 0.10)", // green wash
                      border: "1px solid rgba(22, 163, 74, 0.22)",
                      color: "rgb(21, 128, 61)",
                    }}
                  >
                    Mastery {role.threeTwoReport.mastery}
                  </span>
                )}
                {typeof role.threeTwoReport.growth === "number" && (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      background: "rgba(245, 158, 11, 0.12)", // amber wash
                      border: "1px solid rgba(245, 158, 11, 0.28)",
                      color: "rgb(180, 83, 9)",
                    }}
                  >
                    Growth {role.threeTwoReport.growth}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Skills: show 3 by default (with Mastery/Growth indicators when available) */}
          <div className="flex flex-wrap gap-2">
            {(() => {
              const masterySet = new Set(
                Array.isArray((role as any)?.threeTwoReport?.masteryAreas)
                  ? ((role as any).threeTwoReport.masteryAreas as string[]).map((s) => String(s).toLowerCase())
                  : [],
              );
              const growthSet = new Set(
                Array.isArray((role as any)?.threeTwoReport?.growthAreas)
                  ? ((role as any).threeTwoReport.growthAreas as string[]).map((s) => String(s).toLowerCase())
                  : [],
              );

              return role.skills.slice(0, 3).map((skill) => {
                const key = String(skill).toLowerCase();
                const isMastery = masterySet.has(key);
                const isGrowth = growthSet.has(key);

                const chipStyle = isMastery
                  ? {
                      background: "rgba(22, 163, 74, 0.10)", // green wash
                      border: "1px solid rgba(22, 163, 74, 0.22)",
                      color: "rgb(21, 128, 61)",
                    }
                  : isGrowth
                    ? {
                        background: "rgba(245, 158, 11, 0.12)", // amber wash
                        border: "1px solid rgba(245, 158, 11, 0.28)",
                        color: "rgb(180, 83, 9)",
                      }
                    : {
                        background: "var(--chip-bg)",
                        border: "1px solid var(--border-chip)",
                        color: "var(--text-body)",
                      };

                return (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={chipStyle}
                    title={isMastery ? "Mastery skill" : isGrowth ? "Growth skill" : "Skill"}
                  >
                    {skill}
                  </span>
                );
              });
            })()}
          </div>

          {/* Expanded content */}
          <div className={cn("grid transition-all duration-300 ease-out", isInteractiveHover ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="overflow-hidden">
              <div className="flex flex-col gap-4 pt-2">
                <div className="h-px w-full" style={{ background: "var(--border-subtle)" }} />

                <p
                  className={cn("text-[12px] leading-relaxed", "transition-all duration-200", isInteractiveHover ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}
                  style={{ color: "var(--text-body)" }}
                >
                  {role.description}
                </p>

                {role.responsibilities.length > 0 && (
                  <div className={cn("flex flex-col gap-1.5", "transition-all duration-200", isInteractiveHover ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-strong)" }}>
                      Key Responsibilities
                    </span>
                    <ul className="flex flex-col gap-1">
                      {role.responsibilities.map((resp, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--text-body)" }}>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--zip-teal)" }} />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {role.expandedSkills.length > 0 && (
                  <div className={cn("flex flex-wrap gap-2", "transition-all duration-200", isInteractiveHover ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
                    {role.expandedSkills.map((skill, i) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200"
                        style={{
                          background: "var(--chip-bg)",
                          border: "1px solid var(--border-chip)",
                          color: "var(--text-body)",
                          transitionDelay: isHovered ? `${120 + i * 30}ms` : "0ms",
                          opacity: isInteractiveHover ? 1 : 0,
                          transform: isInteractiveHover ? "scale(1)" : "scale(0.92)",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleSelect}
            disabled={isSelected}
            className={cn(
              "w-full text-[12.5px] font-semibold transition-all duration-200 cursor-pointer active:scale-[0.99]",
              !isSelected ? "hover:brightness-[0.96]" : "",
            )}
            style={{
              height: 38,
              borderRadius: 10,
              background: "var(--zip-teal)",
              border: "1px solid var(--zip-teal)",
              color: "#fff",
              boxShadow: isInteractiveHover ? "0 8px 20px rgba(23,166,166,0.22)" : "none",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (isSelected) return;
              (e.currentTarget as HTMLButtonElement).style.background = "var(--zip-teal-hover)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--zip-teal-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--zip-teal)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--zip-teal)";
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--ring-teal)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = isInteractiveHover ? "0 8px 20px rgba(23,166,166,0.22)" : "none";
            }}
          >
            {isSelected ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                Selected (local only)
              </span>
            ) : (
              "Select as Target Role"
            )}
          </button>

          {/* Missing API note */}
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Selection is not persisted yet (backend “save selected role” API is missing).
          </p>
        </div>

        {/* Subtle teal wash on hover */}
        <div
          className={cn("pointer-events-none absolute inset-0 transition-opacity duration-200", isInteractiveHover ? "opacity-100" : "opacity-0")}
          style={{
            background: "linear-gradient(135deg, rgba(23,166,166,0.035) 0%, rgba(23,166,166,0.075) 100%)",
          }}
        />
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function SkeletonCard() {
  /** ZIP-matching skeleton card with shimmer utility class. */
  return (
    <div
      className="border p-5 flex flex-col gap-4"
      style={{
        borderRadius: "var(--radius-card)",
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-48 rounded-lg bg-muted shimmer" />
          <div className="h-3 w-24 rounded-lg bg-muted shimmer" />
        </div>
        <div className="h-6 w-20 rounded-full bg-muted shimmer" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-full rounded-lg bg-muted shimmer" />
        <div className="h-4 w-2/3 rounded-lg bg-muted shimmer" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-muted shimmer" />
        <div className="h-6 w-20 rounded-full bg-muted shimmer" />
        <div className="h-6 w-14 rounded-full bg-muted shimmer" />
      </div>
      <div className="h-10 w-full" style={{ borderRadius: 10 }} />
      <div className="h-10 w-full rounded-lg bg-muted shimmer" style={{ borderRadius: 10 }} />
    </div>
  );
}
