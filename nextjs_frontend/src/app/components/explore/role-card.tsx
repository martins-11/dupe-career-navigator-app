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
 * - select: disables button and shows full overlay state
 */
// PUBLIC_INTERFACE
export function RoleCard({ role, index }: RoleCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  function handleSelect(e: React.MouseEvent) {
    e.stopPropagation();
    setIsSelected(true);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
      <div
        className={cn(
          "relative rounded-3xl bg-card border overflow-hidden cursor-pointer",
          "transition-all duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          isHovered && !isSelected && "shadow-xl -translate-y-1 scale-[1.02]",
          !isHovered && !isSelected && "shadow-sm",
          isSelected && "shadow-sm",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card content */}
        <div className="p-6 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-foreground text-lg leading-tight text-balance">{role.title}</h3>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                {role.industry}
              </span>
            </div>
            {/* Career level badge */}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase shrink-0",
                "transition-all duration-300",
                "bg-secondary text-secondary-foreground",
              )}
            >
              {role.careerLevel}
            </span>
          </div>

          {/* Salary & Experience row */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Salary</span>
              <span className="font-medium text-foreground">{`₹${role.salaryMin}L – ₹${role.salaryMax}L`}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Experience</span>
              <span className="font-medium text-foreground">{role.experience}</span>
            </div>
          </div>

          {/* Skills: show 3 by default */}
          <div className="flex flex-wrap gap-1.5">
            {role.skills.slice(0, 3).map((skill) => (
              <span key={skill} className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-2.5 py-1 text-xs font-medium">
                {skill}
              </span>
            ))}
          </div>

          {/* Expanded content: description, responsibilities, expanded skills */}
          <div
            className={cn(
              "grid transition-all duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
              isHovered && !isSelected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-4 pt-2">
                <div className="h-px w-full bg-border" />

                <p
                  className={cn(
                    "text-sm text-muted-foreground leading-relaxed",
                    "transition-all duration-300 delay-75",
                    isHovered && !isSelected ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                  )}
                >
                  {role.description}
                </p>

                <div
                  className={cn(
                    "flex flex-col gap-1.5",
                    "transition-all duration-300 delay-100",
                    isHovered && !isSelected ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                  )}
                >
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Key Responsibilities</span>
                  <ul className="flex flex-col gap-1">
                    {role.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={cn(
                    "flex flex-wrap gap-1.5",
                    "transition-all duration-300 delay-150",
                    isHovered && !isSelected ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                  )}
                >
                  {role.expandedSkills.map((skill, i) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-2.5 py-1 text-xs font-medium transition-all duration-200"
                      style={{
                        transitionDelay: isHovered ? `${150 + i * 40}ms` : "0ms",
                        opacity: isHovered && !isSelected ? 1 : 0,
                        transform: isHovered && !isSelected ? "scale(1)" : "scale(0.85)",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleSelect}
            disabled={isSelected}
            className={cn(
              "w-full rounded-2xl py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer",
              isSelected
                ? "bg-primary text-primary-foreground"
                : isHovered
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            {isSelected ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" />
                Selected
              </span>
            ) : (
              "Select as Target Role"
            )}
          </button>
        </div>

        {/* Glassmorphism overlay on hover */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-3xl transition-all duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
            isHovered && !isSelected ? "opacity-100" : "opacity-0",
          )}
          style={{
            background: "linear-gradient(135deg, rgba(13,148,136,0.04) 0%, rgba(15,118,110,0.06) 100%)",
            boxShadow: isHovered && !isSelected ? "inset 0 0 0 1px rgba(13,148,136,0.12), 0 0 20px rgba(13,148,136,0.06)" : "none",
          }}
        />

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-primary animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary-foreground/20 animate-in zoom-in duration-500">
                <Check className="h-7 w-7 text-primary-foreground" />
              </div>
              <p className="text-primary-foreground font-semibold text-base">Role Selected Successfully</p>
              <p className="text-primary-foreground/70 text-sm">{role.title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function SkeletonCard() {
  /** ZIP-matching skeleton card with shimmer utility class. */
  return (
    <div className="rounded-3xl border bg-card p-6 flex flex-col gap-4">
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
      <div className="h-10 w-full rounded-2xl bg-muted shimmer" />
    </div>
  );
}
