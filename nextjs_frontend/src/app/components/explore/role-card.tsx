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
 * Expandable in-flow panel.
 * This version intentionally leans "flashy" with premium glow/shine effects,
 * while still honoring semantic tokens and maintaining accessibility.
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

  // Click micro-interaction animation (separate from hover transforms).
  const [isClickAnimating, setIsClickAnimating] = React.useState(false);
  const clickAnimTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (clickAnimTimeoutRef.current) window.clearTimeout(clickAnimTimeoutRef.current);
    };
  }, []);

  const triggerClickAnim = React.useCallback(() => {
    setIsClickAnimating(true);
    if (clickAnimTimeoutRef.current) window.clearTimeout(clickAnimTimeoutRef.current);
    clickAnimTimeoutRef.current = window.setTimeout(() => setIsClickAnimating(false), 460);
  }, []);

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
        // Base
        "group relative overflow-hidden rounded-2xl border bg-card text-card-foreground",
        "border-border/70",
        // Premium hover movement + glow
        "transform-gpu transition-[transform,box-shadow,border-color] duration-500 ease-out will-change-transform",
        "hover:-translate-y-1 hover:scale-[1.01] hover:rotate-[-0.12deg]",
        "hover:border-primary/55 hover:shadow-[0_34px_80px_-34px_rgba(0,0,0,0.38)]",
        // Keyboard accessibility
        "focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-2 focus-within:ring-offset-background",
        // Expanded state feels "activated"
        expanded ? "border-primary/50 shadow-[0_44px_95px_-42px_rgba(var(--cn-primary-rgb),0.30)]" : "",
        // Ambient gradient glow layer (pseudo)
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500",
        "before:bg-[radial-gradient(800px_320px_at_18%_0%,rgba(var(--cn-primary-rgb),0.22),transparent_55%),radial-gradient(760px_320px_at_90%_18%,rgba(16,185,129,0.14),transparent_58%)]",
        "group-hover:before:opacity-100",
        expanded ? "before:opacity-100" : "",
        // Shine sweep (pseudo)
        "after:pointer-events-none after:absolute after:-inset-[45%] after:rotate-12 after:opacity-0 after:transition-opacity after:duration-300",
        "after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.60),transparent)]",
        "group-hover:after:opacity-30 group-hover:after:animate-[cnRoleCardShine_1.4s_ease-in-out]",
        expanded ? "after:opacity-25" : "",
      ].join(" ")}
      aria-label={`${title} role card`}
    >
      {/* Inner wrapper gets the click-pop animation so hover transforms remain intact */}
      <div className={["relative z-10", isClickAnimating ? "animate-[cnRoleCardPop_420ms_ease-out]" : ""].join(" ")}>
        <div className="p-6">
          <button
            type="button"
            className={[
              "w-full text-left cursor-pointer",
              "outline-none",
              "transition-colors duration-300",
            ].join(" ")}
            aria-expanded={expanded}
            aria-controls={expandedId}
            onClick={() => {
              triggerClickAnim();
              setExpanded((v) => !v);
            }}
          >
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Explore Role
                </span>

                <div className="mt-1">
                  <h2 className="text-xl font-bold text-foreground leading-tight transition-colors duration-300 group-hover:text-primary line-clamp-2">
                    {title}
                  </h2>

                  {/* Flashy micro-accent underline */}
                  <div className="mt-2 h-[3px] w-14 rounded-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent opacity-60 transition-all duration-500 group-hover:w-24 group-hover:opacity-90" />

                  <p className="mt-2 text-xs text-muted-foreground font-medium">{industry}</p>
                </div>
              </div>

              <div className="scale-75 origin-top-right -mr-4 -mt-2 shrink-0 pointer-events-none transition-transform duration-300 group-hover:scale-[0.80]">
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
                      <span
                        key={t}
                        className={[
                          "px-2.5 py-1 rounded-full text-[11px] font-semibold",
                          "border border-border/70",
                          "bg-gradient-to-r from-secondary/90 via-secondary/55 to-background/70",
                          "text-foreground shadow-sm",
                          "transition-[transform,box-shadow] duration-300",
                          "group-hover:shadow-[0_10px_20px_-16px_rgba(var(--cn-primary-rgb),0.45)]",
                        ].join(" ")}
                      >
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

        <div
          className={[
            "grid",
            "transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)]",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <div
              className={[
                "px-6 pb-6 pt-0",
                "transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)]",
                expanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
              ].join(" ")}
              id={expandedId}
            >
              <div className="mt-2 rounded-xl border border-border bg-secondary/25">
                <div className="max-h-[260px] overflow-auto px-4 py-4">
                  {description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{description}</p>}

                  <div className="mt-4 grid gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                        Required skills
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {requiredSkills.length > 0 ? (
                          requiredSkills.slice(0, 24).map((s) => (
                            <span
                              key={s}
                              className={[
                                "px-3 py-1.5 rounded-full text-[11px] font-semibold",
                                "border border-border/80",
                                "bg-background/80 text-foreground",
                                "shadow-[0_10px_22px_-20px_rgba(0,0,0,0.25)]",
                                "transition-[transform,box-shadow] duration-300",
                                "hover:-translate-y-[1px] hover:shadow-[0_14px_28px_-22px_rgba(var(--cn-primary-rgb),0.55)]",
                              ].join(" ")}
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No required skills listed.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                        Your matching skills
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {matchedPersonaSkills.length > 0 ? (
                          matchedPersonaSkills.slice(0, 24).map((s) => (
                            <span
                              key={s}
                              className={[
                                "px-3 py-1.5 rounded-full text-[11px] font-semibold",
                                "border border-border/70",
                                "bg-gradient-to-r from-accent/90 via-accent/70 to-background/80 text-accent-foreground",
                                "shadow-[0_16px_32px_-26px_rgba(var(--cn-primary-rgb),0.6)]",
                                "transition-[transform,box-shadow] duration-300",
                                "hover:-translate-y-[1px] hover:shadow-[0_18px_38px_-28px_rgba(var(--cn-primary-rgb),0.75)]",
                              ].join(" ")}
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No matching persona skills found for this role.
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                        Key responsibilities
                      </div>
                      <ul className="mt-2 space-y-2 list-disc pl-5">
                        {responsibilities.slice(0, 6).map((r) => (
                          <li key={r} className="text-xs text-foreground leading-relaxed">
                            {r}
                          </li>
                        ))}
                        {responsibilities.length === 0 && (
                          <li className="text-xs text-muted-foreground italic list-none -ml-5">Not provided for this role.</li>
                        )}
                      </ul>
                    </div>

                    {(masteryAreas.length > 0 || growthAreas.length > 0) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[11px] font-bold text-primary uppercase tracking-wide">
                            Mastery ({masteryAreas.length})
                          </div>
                          <ul className="mt-2 space-y-1">
                            {masteryAreas.slice(0, 4).map((s) => (
                              <li key={s} className="text-xs text-foreground">
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                            Growth ({growthAreas.length})
                          </div>
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
                      "h-9 px-4 rounded-xl text-sm font-semibold border",
                      "transition-[transform,box-shadow,background-color,color,border-color] duration-300",
                      "active:scale-[0.99]",
                      isTarget
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_20px_45px_-32px_rgba(var(--cn-primary-rgb),0.85)]"
                        : "bg-background text-foreground border-border hover:bg-secondary hover:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.35)]",
                      savingTarget ? "opacity-70 cursor-wait" : "",
                    ].join(" ")}
                    onClick={handleSetAsTargetRole}
                    disabled={savingTarget || !thisRoleId}
                  >
                    {savingTarget ? "Saving…" : isTarget ? "Target role" : "Set as target role"}
                  </button>

                  <button
                    type="button"
                    className={[
                      "h-9 px-3 rounded-xl text-sm text-muted-foreground border border-transparent",
                      "transition-[transform,background-color,color] duration-300",
                      "hover:text-foreground hover:bg-secondary active:scale-[0.99]",
                    ].join(" ")}
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
    </div>
  );
};

export default RoleCard;
