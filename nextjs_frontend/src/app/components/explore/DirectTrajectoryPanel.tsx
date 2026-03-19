"use client";

import * as React from "react";
import { CalendarClock, CheckCircle2, Compass, GitBranch, Map, Route } from "lucide-react";

import RoleCard from "@/app/components/explore/role-card";
import { ExploreMindmapView } from "@/app/components/explore/ExploreMindmapView";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Separator } from "@/app/components/ui/separator";
import { Badge } from "@/app/components/ui/badge";

import { getPersonaDerivedCurrentRoleTitle } from "@/lib/personaRoleDerivation";
import { apiFetch } from "@/lib/apiClient";
import { getTargetRoleSelection, persistTargetRoleSelection, type TimeHorizon } from "@/lib/targetRoleStorage";
/**
 * Direct Trajectory (recommendation-driven)
 * - NO manual target-role typing/picking via catalog dropdown
 * - show recommendation-only "direct roles" derived from the FINALIZED persona
 * - user selects one recommended role and saves it
 * - after save: show gap analysis + requirements + roadmap
 *
 * Implementation note:
 * - This now calls a dedicated backend endpoint that invokes Bedrock/Claude.
 */

function normString(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function roleIdFromRole(role: any): string {
  return normString(role?.id ?? role?.role_id ?? role?.roleId ?? role?.onet_id ?? role?.code ?? role?.role_title ?? role?.title);
}

function roleTitleFromRole(role: any): string {
  return normString(role?.title ?? role?.role_title ?? role?.roleTitle);
}

function horizonWeeks(h: TimeHorizon): number {
  if (h === "Mid") return 26;
  if (h === "Far") return 52;
  return 12;
}

function horizonLabel(h: TimeHorizon): string {
  if (h === "Mid") return "Mid (3–6 months)";
  if (h === "Far") return "Far (6–12 months)";
  return "Near (0–3 months)";
}

function intersectSet(a: string[], b: string[]): string[] {
  const bset = new Set(b.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of a) {
    const key = s.trim().toLowerCase();
    if (!key) continue;
    if (!bset.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.trim());
  }
  return out;
}

function differenceSet(required: string[], have: string[]): string[] {
  const haveSet = new Set(have.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of required) {
    const key = s.trim().toLowerCase();
    if (!key) continue;
    if (haveSet.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.trim());
  }
  return out;
}

function extractPersonaSkills(persona: any): string[] {
  // Keep defensive: schema may evolve.
  const fromTop = safeStringArray(persona?.skills);
  const fromProfile = safeStringArray(persona?.profile?.skills);
  const fromTaxonomy = safeStringArray(persona?.taxonomy?.skills);
  const fromExperience = safeStringArray(persona?.experience?.skills);

  const combined = [...fromTop, ...fromProfile, ...fromTaxonomy, ...fromExperience].map((s) => s.trim()).filter(Boolean);

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

function extractRequiredSkills(role: any): string[] {
  return safeStringArray(role?.skills_required ?? role?.required_skills ?? role?.requiredSkills ?? role?.skills ?? []);
}

// PUBLIC_INTERFACE
export function DirectTrajectoryPanel(props: { personaId: string }) {
  /** Direct Trajectory flow: recommended direct roles → save target role → roadmap. */
  const { personaId } = props;

  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const currentRoleTitle = React.useMemo(() => {
    // Derived from locally persisted persona (best-effort).
    return getPersonaDerivedCurrentRoleTitle() || "Current role";
  }, [personaId]);

  // A) Recommendation-only direct roles
  const [directRoleRecs, setDirectRoleRecs] = React.useState<any[]>([]);
  const [recsLoading, setRecsLoading] = React.useState(false);

  // B) User selection (NOT yet saved)
  const [selectedRecRoleId, setSelectedRecRoleId] = React.useState<string>("");

  // C) Saved target role (drives roadmap)
  const [savedTargetRoleId, setSavedTargetRoleId] = React.useState<string>("");

  // Time horizon controls roadmap visuals/sequence.
  const [timeHorizon, setTimeHorizon] = React.useState<TimeHorizon>("Near");

  // Persona skills for gap analysis (best-effort from localStorage).
  const [personaSkills, setPersonaSkills] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Bootstrap: bring forward any previously saved selection.
    const saved = getTargetRoleSelection();
    setTimeHorizon(saved.timeHorizon ?? "Near");
    if (saved.roleId) {
      setSavedTargetRoleId(saved.roleId);
      setSelectedRecRoleId(saved.roleId);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`career_navigator_persona_${personaId}`);
      if (!raw) {
        setPersonaSkills([]);
        return;
      }
      const persona = JSON.parse(raw);
      setPersonaSkills(extractPersonaSkills(persona));
    } catch {
      setPersonaSkills([]);
    }
  }, [personaId]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setLoadError(null);

      try {
        setRecsLoading(true);

        /**
         * Call dedicated backend Claude recommendations (Bedrock) for Direct Trajectory.
         * This replaces the placeholder behavior that reused the generic Explore pool.
         */
        const savedSelection = getTargetRoleSelection();
        const savedTargetRoleTitle = (savedSelection?.roleTitle ?? "").trim() || null;

        const data: any = await apiFetch("/api/recommendations/direct-trajectory", {
          method: "POST",
          body: JSON.stringify({
            personaId,
            savedTargetRoleTitle,
          }),
        });

        if (cancelled) return;

        const roles = Array.isArray(data?.recommendedDirectRoles) ? data.recommendedDirectRoles : [];

        // Map into a shape RoleCard + downstream gap analysis can understand.
        // We keep the Claude-specific fields, but also provide the skill keys used elsewhere in Explore.
        const normalized = roles
          .map((r: any, idx: number) => {
            const id = normString(r?.id) || `direct-${idx}`;
            const title = normString(r?.title) || `Role ${idx + 1}`;
            const requiredSkills = safeStringArray(r?.requiredSkills);
            const keyResponsibilities = safeStringArray(r?.keyResponsibilities);

            return {
              ...r,
              id,
              title,
              role_id: id, // for backend persistence compatibility
              role_title: title,
              required_skills: requiredSkills,
              skills_required: requiredSkills,
              key_responsibilities: keyResponsibilities,
              match_metadata: {
                ...(typeof data?.meta === "object" && data?.meta ? data.meta : {}),
                source: "bedrock_direct_trajectory",
              },
            };
          })
          .filter(Boolean);

        setDirectRoleRecs(normalized);

        // If nothing selected yet, preselect the top recommendation for convenience (still not saved).
        if (!selectedRecRoleId && normalized.length > 0) {
          setSelectedRecRoleId(normalized[0].id);
        }
      } catch (e: any) {
        if (cancelled) return;
        setLoadError("Unable to load direct-role recommendations right now. Please try again.");
      } finally {
        if (!cancelled) {
          setRecsLoading(false);
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // intentionally omit selectedRecRoleId; we don't want to refetch recs on local selection change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId]);

  const selectedRole = React.useMemo(() => {
    if (!selectedRecRoleId) return null;
    return directRoleRecs.find((r) => roleIdFromRole(r) === selectedRecRoleId) ?? null;
  }, [directRoleRecs, selectedRecRoleId]);

  const savedRole = React.useMemo(() => {
    if (!savedTargetRoleId) return null;
    return directRoleRecs.find((r) => roleIdFromRole(r) === savedTargetRoleId) ?? selectedRole ?? null;
  }, [directRoleRecs, savedTargetRoleId, selectedRole]);

  const requiredSkills = React.useMemo(() => extractRequiredSkills(savedRole), [savedRole]);
  const matchedSkills = React.useMemo(() => intersectSet(personaSkills, requiredSkills), [personaSkills, requiredSkills]);
  const missingSkills = React.useMemo(() => differenceSet(requiredSkills, personaSkills), [requiredSkills, personaSkills]);

  const hasSavedTarget = Boolean(savedTargetRoleId);

  if (isLoading) {
    return (
      <div className="py-10">
        <div className="h-[220px] rounded-2xl border border-border bg-background flex flex-col items-center justify-center px-6 text-center">
          <div className="w-10 h-10 border-4 border-secondary border-t-primary rounded-full animate-spin" />
          <div className="mt-3 text-sm text-muted-foreground font-medium">Loading Direct Trajectory…</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-10">
        <div className="rounded-2xl border border-border bg-secondary p-6">
          <div className="text-sm font-semibold text-foreground">Direct Trajectory unavailable</div>
          <div className="mt-1 text-sm text-muted-foreground">{loadError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-violet-200 bg-violet-50/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-violet-700" />
            Direct Trajectory
          </CardTitle>
          <CardDescription>
            We’ve recommended direct next-step roles from your finalized persona. Choose one, save it as your target role, then review
            gaps and your roadmap.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <div className="text-xs font-semibold uppercase tracking-widest text-violet-600">Current role</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{currentRoleTitle}</div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <GitBranch className="h-3.5 w-3.5" />
                Flow: Direct
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {horizonLabel(timeHorizon)}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="directRecs">Recommended direct roles</Label>
              <Select
                value={selectedRecRoleId}
                onValueChange={(v) => {
                  setSelectedRecRoleId(v);
                }}
              >
                <SelectTrigger id="directRecs" className="bg-white">
                  <SelectValue placeholder={recsLoading ? "Loading recommendations…" : "Select a recommended role"} />
                </SelectTrigger>
                <SelectContent>
                  {directRoleRecs.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No recommendations available
                    </SelectItem>
                  ) : (
                    directRoleRecs.map((r) => (
                      <SelectItem key={roleIdFromRole(r)} value={roleIdFromRole(r)}>
                        {roleTitleFromRole(r)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Direct Trajectory is recommendation-driven: manual searching/typing target roles is disabled.
              </p>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  disabled={!selectedRecRoleId}
                  onClick={async () => {
                    if (!selectedRecRoleId) return;

                    // 1) Persist locally
                    persistTargetRoleSelection({ roleId: selectedRecRoleId, timeHorizon });
                    setSavedTargetRoleId(selectedRecRoleId);

                    // 2) Best-effort backend persistence
                    try {
                      await apiFetch("/api/personas/target-role", {
                        method: "POST",
                        body: JSON.stringify({ user_id: personaId, role_id: selectedRecRoleId, time_horizon: timeHorizon }),
                      });
                    } catch {
                      // ignore; local selection remains authoritative for frontend UX
                    }
                  }}
                >
                  Save target role
                </Button>

                {hasSavedTarget ? (
                  <span className="text-xs text-muted-foreground">
                    Saved: <span className="font-semibold text-foreground">{roleTitleFromRole(savedRole)}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Save a target role to generate your roadmap.</span>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timeHorizon">Time horizon</Label>
              <Select
                value={timeHorizon}
                onValueChange={(v) => {
                  const next = (v === "Mid" || v === "Far" ? v : "Near") as TimeHorizon;
                  setTimeHorizon(next);

                  // If a target role is already saved, keep it paired with the new horizon.
                  const roleIdToPersist = savedTargetRoleId || selectedRecRoleId;
                  if (roleIdToPersist) {
                    persistTargetRoleSelection({ roleId: roleIdToPersist, timeHorizon: next });
                  }
                }}
              >
                <SelectTrigger id="timeHorizon" className="bg-white">
                  <SelectValue placeholder="Select time horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Near">Near (0–3 months)</SelectItem>
                  <SelectItem value="Mid">Mid (3–6 months)</SelectItem>
                  <SelectItem value="Far">Far (6–12 months)</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-xs text-slate-500">
                Used to timebox your roadmap: <span className="font-semibold text-slate-900">{horizonWeeks(timeHorizon)} weeks</span>.
              </div>
            </div>
          </div>

          {selectedRole ? (
            <div className="rounded-xl border border-border bg-white/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Selected recommendation</div>
              <RoleCard role={selectedRole} personaId={personaId} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Roadmap gate: only show after saving */}
      {hasSavedTarget ? (
        <>
          <Card className="border-border bg-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Target role (saved)
              </CardTitle>
              <CardDescription>This is the role your Direct Trajectory roadmap will optimize for.</CardDescription>
            </CardHeader>
            <CardContent>
              {savedRole ? (
                <div className="max-w-4xl">
                  <RoleCard role={savedRole} personaId={personaId} />
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  Target role details are unavailable right now, but your roadmap can still render.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Gap analysis
              </CardTitle>
              <CardDescription>What you already have vs what you need for the target role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-secondary/25 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Matched skills</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {matchedSkills.length > 0 ? (
                      matchedSkills.slice(0, 24).map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-border/70 bg-gradient-to-r from-accent/90 via-accent/70 to-background/80 text-accent-foreground"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground italic">No matched skills detected.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-secondary/25 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Missing skills</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missingSkills.length > 0 ? (
                      missingSkills.slice(0, 24).map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-border/70 bg-background/80 text-foreground"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground italic">No missing skills detected.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Tip: Choose Near for a tight, high-impact plan; Far for a broader skill-building sequence.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                Role requirements
              </CardTitle>
              <CardDescription>Skills and responsibilities expected for the selected target role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-secondary/25 p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Required skills</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {requiredSkills.length > 0 ? (
                    requiredSkills.slice(0, 28).map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-border/70 bg-background/80 text-foreground"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No requirements provided for this role.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-violet-700" />
                Roadmap (mindmap + pathway)
              </CardTitle>
              <CardDescription>A time-horizon roadmap combining a mindmap view and a stepwise pathway timeline.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mindmap</div>
                <div className="mt-3">
                  <ExploreMindmapView personaId={personaId} selectedIndustry="" selectedSkills={[]} salaryRange={[0, 60]} />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pathway</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Horizon: <span className="font-semibold text-foreground">{horizonLabel(timeHorizon)}</span> •{" "}
                      <span className="font-semibold text-foreground">{horizonWeeks(timeHorizon)} weeks</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Timeboxed
                  </Badge>
                </div>

                <Separator className="my-4" />

                <ol className="grid gap-3 md:grid-cols-2">
                  {[
                    { w: 0.15, title: "Clarify success outcomes", desc: "Lock in responsibilities, required skills, and success signals." },
                    { w: 0.35, title: "Close top skill gaps", desc: "Focus on 3–6 missing skills with highest impact on readiness." },
                    { w: 0.65, title: "Build proof of work", desc: "Ship 1–2 projects demonstrating target-role responsibilities." },
                    { w: 0.9, title: "Interview + transition plan", desc: "Update resume/LinkedIn, practice interviews, and network." },
                  ].map((step, idx) => {
                    const weeks = Math.max(1, Math.round(horizonWeeks(timeHorizon) * step.w));
                    return (
                      <li key={step.title} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                              Step {idx + 1} • ~{weeks}w
                            </div>
                            <div className="mt-1 text-sm font-bold text-foreground">{step.title}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{step.desc}</div>
                          </div>
                          <Badge variant="secondary">{timeHorizon}</Badge>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Save a target role to generate your Direct Trajectory roadmap.
        </div>
      )}
    </div>
  );
}

export default DirectTrajectoryPanel;
