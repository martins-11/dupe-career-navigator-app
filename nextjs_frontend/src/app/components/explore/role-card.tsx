"use client";

import React from "react";
import { CompatibilityScore } from "./compatibility-score";
import { apiFetch } from "../../../lib/apiClient";
import { loadPersona } from "../../../lib/personaStorage";
import { getTargetRoleSelection, persistTargetRoleSelection } from "../../../lib/targetRoleStorage";

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

function roleIdFromRole(role: any): string {
  return normString(role?.id ?? role?.role_id ?? role?.roleId);
}

/**
 * Best-effort extractor for persona skills stored in localStorage.
 * The persona schema may evolve; keep this defensive.
 */
function extractPersonaSkills(persona: any): string[] {
  const fromTop = safeStringArray(persona?.skills);
  const fromProfile = safeStringArray(persona?.profile?.skills);
  const fromTaxonomy = safeStringArray(persona?.taxonomy?.skills);
  const fromExperience = safeStringArray(persona?.experience?.skills);

  const combined = [...fromTop, ...fromProfile, ...fromTaxonomy, ...fromExperience]
    .map((s) => s.trim())
    .filter(Boolean);

  // de-dupe while preserving order
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const s of combined) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(s);
  }
  return uniq;
}

// PUBLIC_INTERFACE
/**
 * RoleCard (Explore)
 *
 * Implements an in-flow expandable panel (accordion style) that pushes content down
 * instead of using a popover/popup. The expanded panel includes:
 * - Required skills
 * - Key responsibilities
 * - Persona skills (chips)
 * - “Set as target role” single-selection action (persisted)
 */
const RoleCard = ({ role, personaId }: { role: any; personaId?: string }) => {
  const title = normString(role?.title || role?.role_title) || "Untitled Role";
  const industry = normString(role?.industry) || "—";
  const description = normString(role?.description);

  const report =
    role?.threeTwoReport && typeof role.threeTwoReport === "object" ? role.threeTwoReport : {};
  const masteryAreas = safeStringArray(report?.masteryAreas);
  const growthAreas = safeStringArray(report?.growthAreas);

  // Prefer top-level compatibilityScore, then report.compatibilityScore, then report.score.
  const score = clampPercent(role?.compatibilityScore ?? report?.compatibilityScore ?? report?.score ?? 0);

  const requiredSkills = safeStringArray(role?.skills_required ?? role?.required_skills ?? []);
  const responsibilities = safeStringArray(
    role?.responsibilities ?? role?.key_responsibilities ?? role?.keyResponsibilities ?? []
  );
  const tags = safeStringArray(role?.tags);

  const [expanded, setExpanded] = React.useState(false);
  const expandedId = React.useId();

  // Target role selection (single selection) — persisted
  const [targetRoleId, setTargetRoleId] = React.useState<string | null>(null);
  const [savingTarget, setSavingTarget] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Persona skills (from local persona storage) — shown in expanded panel
  const [personaSkills, setPersonaSkills] = React.useState<string[]>([]);

  React.useEffect(() => {
    const sel = getTargetRoleSelection();
    setTargetRoleId(sel.roleId);
  }, []);

  React.useEffect(() => {
    if (!personaId) return;
    const persona = loadPersona(personaId);
    setPersonaSkills(extractPersonaSkills(persona));
  }, [personaId]);

  const thisRoleId = roleIdFromRole(role);
  const isTarget = Boolean(thisRoleId) && targetRoleId === thisRoleId;

  async function handleSetAsTargetRole() {
    if (!thisRoleId) return;
    setSavingTarget(true);
    setSaveError(null);

    // Persist in UI immediately for snappy UX (single-selection across cards)
    persistTargetRoleSelection({ roleId: thisRoleId, timeHorizon: "Near" });
    setTargetRoleId(thisRoleId);

    // Best-effort backend persistence (may fail if DB not configured)
    try {
      // We do not currently have a stable user id in the frontend template.
      // Use personaId as a best-effort stable identifier if available; otherwise skip backend call.
      if (!personaId) return;

      await apiFetch("/api/personas/target-role", {
        method: "POST",
        body: JSON.stringify({
          user_id: personaId,
          role_id: thisRoleId,
          time_horizon: "Near",
        }),
      });
    } catch (e: any) {
      // Keep selection in UI; surface a subtle message.
      setSaveError("Saved locally. Backend persistence unavailable.");
    } finally {
      setSavingTarget(false);
    }
  }

  return (
    <div
      className={[
        "group bg-white border rounded-2xl transition-all duration-200",
        "border-slate-200 hover:border-slate-300 hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.10)]",
        expanded ? "shadow-[0_24px_60px_-22px_rgba(15,23,42,0.14)]" : "",
      ].join(" ")}
      aria-label={`${title} role card`}
    >
      {/* Header (collapsed content) */}
      <div className="p-6">
        <button
          type="button"
          className="w-full text-left cursor-pointer"
          aria-expanded={expanded}
          aria-controls={expandedId}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
                Explore Role
              </span>
              <h2 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                {title}
              </h2>
              <p className="text-xs text-slate-500 font-medium">{industry}</p>
            </div>

            <div className="scale-75 origin-top-right -mr-4 -mt-2 shrink-0 pointer-events-none">
              <CompatibilityScore score={score} masteryCount={masteryAreas.length} growthCount={growthAreas.length} />
            </div>
          </div>

          <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
            {description !== "" ? description : <span className="italic text-gray-400">No description provided</span>}
          </p>

          {(tags.length > 0 || requiredSkills.length > 0) && (
            <div className="pt-4 mt-4 border-t border-slate-50">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((t) => (
                    <span key={t} className="px-2 py-1 bg-slate-100 rounded-full text-[11px] text-slate-700">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {requiredSkills.length > 0 && (
                <div className="mt-3 text-[11px] text-slate-400">
                  {expanded ? "Showing details" : "Click to expand"} • {requiredSkills.length} required skills
                </div>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Expanded panel (push-down; no overlay) */}
      <div
        id={expandedId}
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div
            className={[
              "px-6 pb-6 pt-0",
              "transition-all duration-200 ease-out",
              expanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1",
            ].join(" ")}
          >
            {/* Subtle divider spacing like screenshot */}
            <div className="pt-2" />

            {/* Description (expanded copy; 1–3 lines) */}
            {description && <p className="text-xs text-slate-600 leading-relaxed">{description}</p>}

            {/* Key Responsibilities */}
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">
                Key responsibilities
              </div>
              <ul className="mt-2 space-y-1">
                {(responsibilities.length > 0 ? responsibilities : []).slice(0, 6).map((r) => (
                  <li key={r} className="text-xs text-slate-700">
                    {r}
                  </li>
                ))}
                {responsibilities.length === 0 && (
                  <li className="text-xs text-slate-400 italic">Not provided for this role.</li>
                )}
              </ul>
            </div>

            {/* Required Skills */}
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">
                Required skills
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredSkills.length > 0 ? (
                  requiredSkills.slice(0, 18).map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full text-[11px] border border-slate-200 bg-slate-50 text-slate-700"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No required skills listed.</span>
                )}
              </div>
            </div>

            {/* Persona Skills */}
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">
                Your persona skills
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {personaSkills.length > 0 ? (
                  personaSkills.slice(0, 18).map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full text-[11px] bg-indigo-50 text-slate-700 border border-indigo-100"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Persona skills not available.</span>
                )}
              </div>
            </div>

            {/* Optional: mastery/growth summary (kept compact) */}
            {(masteryAreas.length > 0 || growthAreas.length > 0) && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                    Mastery ({masteryAreas.length})
                  </div>
                  <ul className="mt-2 space-y-1">
                    {masteryAreas.slice(0, 4).map((s) => (
                      <li key={s} className="text-xs text-slate-700">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                    Growth ({growthAreas.length})
                  </div>
                  <ul className="mt-2 space-y-1">
                    {growthAreas.slice(0, 4).map((s) => (
                      <li key={s} className="text-xs text-slate-700">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Bottom action row: More ... (left) + Set as target role (right) + Close */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="button"
                className="text-[12px] text-[#1D4ED8] hover:underline self-start"
                onClick={() => {
                  // Placeholder for future “full details” navigation.
                  // Keep in UI per design note; actual route can be wired later.
                }}
              >
                More …
              </button>

              <div className="flex items-center gap-2 sm:justify-end">
                {saveError && <span className="text-[11px] text-amber-700">{saveError}</span>}

                <button
                  type="button"
                  className={[
                    "h-9 px-4 rounded-xl text-sm font-semibold transition-colors",
                    "border",
                    isTarget
                      ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                      : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50",
                    savingTarget ? "opacity-70 cursor-wait" : "",
                  ].join(" ")}
                  onClick={handleSetAsTargetRole}
                  disabled={savingTarget || !thisRoleId}
                >
                  {savingTarget ? "Saving…" : isTarget ? "Target role" : "Set as target role"}
                </button>

                <button
                  type="button"
                  className="h-9 px-3 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  onClick={() => setExpanded(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCard;
