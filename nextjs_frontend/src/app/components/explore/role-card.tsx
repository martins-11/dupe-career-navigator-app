"use client";

import React from "react";
import { CompatibilityScore } from "./compatibility-score";
import { apiFetch } from "@/lib/apiClient";
import { loadPersona } from "@/lib/personaStorage";
import { getTargetRoleSelection, persistTargetRoleSelection } from "@/lib/targetRoleStorage";

function normString(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function toBulletedSentences(items: string[]): string[] {
  return items
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((s) => {
      const noPrefix = s.replace(/^[-•*]\s+/, "").trim();
      if (!noPrefix) return "";
      return /[.!?]$/.test(noPrefix) ? noPrefix : `${noPrefix}.`;
    })
    .filter(Boolean);
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

type RoleCardProps = {
  role: any;
  personaId?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

function normalizeSkillKey(v: string): string {
  return v.trim().toLowerCase();
}

function intersectSkills(params: { personaSkills: string[]; requiredSkills: string[] }): string[] {
  const requiredSet = new Set(params.requiredSkills.map(normalizeSkillKey).filter(Boolean));
  const matched: string[] = [];
  const seen = new Set<string>();

  for (const s of params.personaSkills) {
    const key = normalizeSkillKey(s);
    if (!key) continue;
    if (!requiredSet.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    matched.push(s.trim());
  }

  return matched;
}

// PUBLIC_INTERFACE
/**
 * RoleCard (Explore)
 *
 * Expandable in-flow panel. All colors use semantic tokens mapped to the 5-color palette.
 */
const RoleCard = ({ role, personaId, expanded: expandedProp, onExpandedChange }: RoleCardProps) => {
  const title = normString(role?.title || role?.role_title) || "Untitled Role";
  const industry = normString(role?.industry) || "—";
  const description = normString(role?.description);

  const report = role?.threeTwoReport && typeof role.threeTwoReport === "object" ? role.threeTwoReport : {};
  const masteryAreas = safeStringArray(report?.masteryAreas);
  const growthAreas = safeStringArray(report?.growthAreas);

  const score = clampPercent(
    role?.finalCompatibilityScore ?? role?.compatibilityScore ?? report?.compatibilityScore ?? report?.score ?? 0,
  );

  const requiredSkills = safeStringArray(role?.skills_required ?? role?.required_skills ?? []);
  const responsibilities = toBulletedSentences(
    safeStringArray(role?.responsibilities ?? role?.key_responsibilities ?? role?.keyResponsibilities ?? []),
  );
  const tags = safeStringArray(role?.tags);

  const [expandedUncontrolled, setExpandedUncontrolled] = React.useState(false);
  const expanded = typeof expandedProp === "boolean" ? expandedProp : expandedUncontrolled;
  const expandedId = React.useId();

  const setExpanded = React.useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const nextValue = typeof next === "function" ? (next as any)(expanded) : next;
      if (onExpandedChange) onExpandedChange(nextValue);
      else setExpandedUncontrolled(nextValue);
    },
    [expanded, onExpandedChange],
  );

  const [targetRoleId, setTargetRoleId] = React.useState<string | null>(null);
  const [savingTarget, setSavingTarget] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const [personaSkills, setPersonaSkills] = React.useState<string[]>([]);

  React.useEffect(() => {
    const sel = getTargetRoleSelection();
    setTargetRoleId(sel.roleId);

    function onStorage(evt: StorageEvent) {
      if (!evt.key) return;
      if (evt.key.includes("career_navigator_target_role_id")) {
        const next = getTargetRoleSelection();
        setTargetRoleId(next.roleId);
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (!personaId) {
      setPersonaSkills([]);
      return;
    }
    const persona = loadPersona(personaId);
    setPersonaSkills(extractPersonaSkills(persona));
  }, [personaId]);

  const matchedPersonaSkills = React.useMemo(() => {
    return intersectSkills({ personaSkills, requiredSkills });
  }, [personaSkills, requiredSkills]);

  const thisRoleId = roleIdFromRole(role);
  const isTarget = Boolean(thisRoleId) && targetRoleId === thisRoleId;

  async function handleSetAsTargetRole() {
    if (!thisRoleId) return;
    setSavingTarget(true);
    setSaveError(null);

    persistTargetRoleSelection({ roleId: thisRoleId, timeHorizon: "Near" });
    setTargetRoleId(thisRoleId);

    try {
      if (!personaId) return;

      await apiFetch("/api/personas/target-role", {
        method: "POST",
        body: JSON.stringify({
          user_id: personaId,
          role_id: thisRoleId,
          time_horizon: "Near",
        }),
      });
    } catch {
      setSaveError("Saved locally. Backend persistence unavailable.");
    } finally {
      setSavingTarget(false);
    }
  }

  return (
    <div
      className={[
        "group rounded-2xl border bg-card text-card-foreground transition-all duration-200",
        "border-border hover:shadow-[0_20px_40px_-18px_rgba(var(--cn-ink-rgb),0.16)]",
        expanded ? "shadow-[0_24px_60px_-22px_rgba(var(--cn-ink-rgb),0.18)]" : "",
      ].join(" ")}
      aria-label={`${title} role card`}
    >
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
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                Explore Role
              </span>
              <h2 className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">{industry}</p>
            </div>

            <div className="scale-75 origin-top-right -mr-4 -mt-2 shrink-0 pointer-events-none">
              <CompatibilityScore score={score} masteryCount={masteryAreas.length} growthCount={growthAreas.length} />
            </div>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
            {description !== "" ? (
              description
            ) : (
              <span className="italic text-muted-foreground">No description provided</span>
            )}
          </p>

          {(tags.length > 0 || requiredSkills.length > 0) && (
            <div className="pt-4 mt-4 border-t border-border/50">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((t) => (
                    <span key={t} className="px-2 py-1 bg-secondary rounded-full text-[11px] text-foreground border border-border">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {requiredSkills.length > 0 && (
                <div className="mt-3 text-[11px] text-muted-foreground">
                  {expanded ? "Showing details" : "Click to expand"} • {requiredSkills.length} required skills
                </div>
              )}
            </div>
          )}
        </button>
      </div>

      <div className={["grid transition-[grid-template-rows] duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"].join(" ")}>
        <div className="overflow-hidden">
          <div className={["px-6 pb-6 pt-0", "transition-all duration-200 ease-out", expanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"].join(" ")}>
            <div className="mt-2 rounded-xl border border-border bg-secondary/30">
              <div className="max-h-[260px] overflow-auto px-4 py-4">
                {description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{description}</p>}

                <div className="mt-4 grid gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-foreground">Required skills</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {requiredSkills.length > 0 ? (
                        requiredSkills.slice(0, 24).map((s) => (
                          <span key={s} className="px-3 py-1.5 rounded-full text-[11px] border border-border bg-background text-foreground">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No required skills listed.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-foreground">Your matching skills</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {matchedPersonaSkills.length > 0 ? (
                        matchedPersonaSkills.slice(0, 24).map((s) => (
                          <span key={s} className="px-3 py-1.5 rounded-full text-[11px] bg-accent text-accent-foreground border border-border">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No matching persona skills found for this role.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-foreground">Key responsibilities</div>
                    <ul className="mt-2 space-y-2 list-disc pl-5">
                      {responsibilities.slice(0, 6).map((r) => (
                        <li key={r} className="text-xs text-foreground leading-relaxed">
                          {r}
                        </li>
                      ))}
                      {responsibilities.length === 0 && <li className="text-xs text-muted-foreground italic list-none -ml-5">Not provided for this role.</li>}
                    </ul>
                  </div>

                  {(masteryAreas.length > 0 || growthAreas.length > 0) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] font-bold text-primary uppercase tracking-wide">Mastery ({masteryAreas.length})</div>
                        <ul className="mt-2 space-y-1">
                          {masteryAreas.slice(0, 4).map((s) => (
                            <li key={s} className="text-xs text-foreground">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Growth ({growthAreas.length})</div>
                        <ul className="mt-2 space-y-1">
                          {growthAreas.slice(0, 4).map((s) => (
                            <li key={s} className="text-xs text-foreground">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              <div className="flex items-center gap-2 sm:justify-end">
                {saveError && <span className="text-[11px] text-muted-foreground">{saveError}</span>}

                <button
                  type="button"
                  className={[
                    "h-9 px-4 rounded-xl text-sm font-semibold transition-colors border",
                    isTarget
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-secondary",
                    savingTarget ? "opacity-70 cursor-wait" : "",
                  ].join(" ")}
                  onClick={handleSetAsTargetRole}
                  disabled={savingTarget || !thisRoleId}
                >
                  {savingTarget ? "Saving…" : isTarget ? "Target role" : "Set as target role"}
                </button>

                <button
                  type="button"
                  className="h-9 px-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
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
