"use client";

import React from "react";
import { CompatibilityScore } from "./compatibility-score";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";

function normString(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function clampPercent(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// PUBLIC_INTERFACE
/**
 * RoleCard (Explore)
 *
 * Renders a role card for Explore search/suggestions with:
 * - Compatibility score ring (0-100)
 * - Mastery/Growth counts from threeTwoReport
 * - Hover details (description + skills + mastery/growth lists)
 *
 * Accepts both backend shapes:
 * - Explore search roles: { role_title, skills_required, compatibilityScore, threeTwoReport }
 * - Generic role: { title, required_skills, ... }
 */
const RoleCard = ({ role }: { role: any }) => {
  const title = normString(role?.title || role?.role_title) || "Untitled Role";
  const industry = normString(role?.industry) || "—";
  const description = normString(role?.description);

  const report = (role?.threeTwoReport && typeof role.threeTwoReport === "object") ? role.threeTwoReport : {};
  const masteryAreas = safeStringArray(report?.masteryAreas);
  const growthAreas = safeStringArray(report?.growthAreas);

  // Prefer top-level compatibilityScore, then report.compatibilityScore, then report.score.
  const score = clampPercent(role?.compatibilityScore ?? report?.compatibilityScore ?? report?.score ?? 0);

  const requiredSkills = safeStringArray(role?.skills_required ?? role?.required_skills ?? []);
  const tags = safeStringArray(role?.tags);

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div
          className="group relative bg-white border border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:border-[#0D9488]/40 hover:shadow-[0_20px_40px_-15px_rgba(13,148,136,0.1)] flex flex-col min-h-[220px] cursor-default"
          aria-label={`${title} role card`}
        >
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#0D9488] font-black">
                Explore Role
              </span>
              <h2 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-[#0D9488] transition-colors line-clamp-2">
                {title}
              </h2>
              <p className="text-xs text-slate-400 font-medium">{industry}</p>
            </div>

            <div className="scale-75 origin-top-right -mr-4 -mt-2 shrink-0 pointer-events-none">
              <CompatibilityScore
                score={score}
                masteryCount={masteryAreas.length}
                growthCount={growthAreas.length}
              />
            </div>
          </div>

          <p className="text-slate-500 text-sm leading-relaxed line-clamp-4 mb-4 flex-grow">
            {description !== "" ? (
              description
            ) : (
              <span className="italic text-gray-400">No description provided</span>
            )}
          </p>

          {(tags.length > 0 || requiredSkills.length > 0) && (
            <div className="mt-auto pt-4 border-t border-slate-50">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 bg-slate-100 rounded-full text-[11px] text-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {requiredSkills.length > 0 && (
                <div className="mt-3 text-[11px] text-slate-400">
                  Hover for details • {requiredSkills.length} required skills
                </div>
              )}
            </div>
          )}
        </div>
      </HoverCardTrigger>

      <HoverCardContent align="center" sideOffset={10} className="w-[360px]">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-500">{industry}</div>
          </div>

          {description && (
            <p className="text-xs text-slate-600 leading-relaxed">
              {description}
            </p>
          )}

          {(masteryAreas.length > 0 || growthAreas.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">
                  Mastery ({masteryAreas.length})
                </div>
                <ul className="mt-1 space-y-1">
                  {masteryAreas.slice(0, 6).map((s) => (
                    <li key={s} className="text-xs text-slate-700">
                      {s}
                    </li>
                  ))}
                  {masteryAreas.length === 0 && (
                    <li className="text-xs text-slate-400 italic">None detected</li>
                  )}
                </ul>
              </div>

              <div>
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                  Growth ({growthAreas.length})
                </div>
                <ul className="mt-1 space-y-1">
                  {growthAreas.slice(0, 6).map((s) => (
                    <li key={s} className="text-xs text-slate-700">
                      {s}
                    </li>
                  ))}
                  {growthAreas.length === 0 && (
                    <li className="text-xs text-slate-400 italic">None detected</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {requiredSkills.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Required skills
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredSkills.slice(0, 12).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] text-slate-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Compatibility: <span className="font-semibold text-slate-800">{score}%</span>
            </div>
            <div className="text-[11px] text-slate-400">Hover card</div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default RoleCard;
