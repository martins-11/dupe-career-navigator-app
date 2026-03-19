"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarClock, CheckCircle2, Compass, GitBranch, Map, Route } from "lucide-react";

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
 * NOTE:
 * The backend does not currently expose a dedicated "direct roles from current role" endpoint.
 * To implement an end-to-end Direct Trajectory UX today, we:
 *  - derive current role title from persona,
 *  - fetch role title options via existing /api/roles/autocomplete?q=currentRoleTitle
 *  - require a selection-only target role (from the same catalog),
 *  - compute gap/requirements locally (persona skills vs role required skills),
 *  - render a roadmap consisting of (a) mindmap view filtered by time horizon, and (b) a simple pathway timeline.
 */

function normString(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function roleIdFromRole(role: any): string {
  return normString(role?.id ?? role?.role_id ?? role?.roleId ?? role?.onet_id ?? role?.code);
}

function roleTitleFromRole(role: any): string {
  return normString(role?.title ?? role?.role_title ?? role?.roleTitle);
}

type RoleOption = { id: string; title: string };

function uniqueByTitle(items: RoleOption[]): RoleOption[] {
  const seen = new Set<string>();
  const out: RoleOption[] = [];
  for (const it of items) {
    const key = it.title.toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
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

async function fetchRoleOptionsForCurrentRole(currentRoleTitle: string): Promise<RoleOption[]> {
  // Uses existing Next API route (safe-fail contract handled server-side in many role routes)
  const qs = new URLSearchParams();
  qs.set("q", currentRoleTitle);
  qs.set("limit", "18");
  const res = await apiFetch<any>(`/api/roles/autocomplete?${qs.toString()}`, { method: "GET", cache: "no-store" });

  const arr = Array.isArray(res) ? res : Array.isArray(res?.suggestions) ? res.suggestions : [];
  const mapped: RoleOption[] = arr
    .map((r: any, idx: number) => {
      const title = roleTitleFromRole(r);
      if (!title) return null;
      const id = normString(r?.id ?? r?.role_id ?? r?.roleId) || `opt-${idx}`;
      return { id, title };
    })
    .filter(Boolean) as RoleOption[];

  // In practice autocomplete may return the exact current role as well; that's OK but we visually call out current role separately.
  return uniqueByTitle(mapped);
}

async function fetchTargetRoleDetailsById(roleId: string): Promise<any | null> {
  // We don't have a dedicated "get role by id" Next route in this frontend. We use search as a safe fallback.
  // Search endpoint is designed to safe-fail (returns [] on internal errors).
  const qs = new URLSearchParams();
  qs.set("q", roleId);
  qs.set("limit", "20");
  const arr = await apiFetch<any>(`/api/roles/search?${qs.toString()}`, { method: "GET", cache: "no-store" });
  const list = Array.isArray(arr) ? arr : [];
  if (list.length === 0) return null;

  // Try to match by id first; otherwise take the first result.
  const exact = list.find((x: any) => roleIdFromRole(x) === roleId) ?? list[0];
  return exact ?? null;
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
  /** Direct Trajectory end-to-end flow: direct roles → target select-only → gap analysis → requirements → roadmap (mindmap + pathway). */
  const { personaId } = props;

  const router = useRouter();
  const searchParams = useSearchParams();

  const targetRoleQuery = normString(searchParams?.get("targetRole"));
  const exploreMode = normString(searchParams?.get("exploreMode"));
  const flow = normString(searchParams?.get("flow"));

  const isDirectTrajectory = exploreMode === "direct_trajectory" || flow === "direct";
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const currentRoleTitle = React.useMemo(() => {
    // derive from persona cache (best-effort); if missing, still allow flow with placeholder.
    return getPersonaDerivedCurrentRoleTitle() || "Current role";
  }, [personaId]);

  // Step 1: fetch direct role options (selection-only).
  const [directRoleOptions, setDirectRoleOptions] = React.useState<RoleOption[]>([]);
  const [directOptionsLoading, setDirectOptionsLoading] = React.useState(false);

  // Step 2: selected target role id + details.
  const [targetRoleId, setTargetRoleId] = React.useState<string>("");
  const [targetRoleDetails, setTargetRoleDetails] = React.useState<any | null>(null);
  const [targetLoading, setTargetLoading] = React.useState(false);

  // Time horizon controls the roadmap.
  const [timeHorizon, setTimeHorizon] = React.useState<TimeHorizon>("Near");

  // Persona skills for gap analysis.
  const [personaSkills, setPersonaSkills] = React.useState<string[]>([]);

  React.useEffect(() => {
    // bootstrap local target selection (if present)
    const saved = getTargetRoleSelection();
    setTimeHorizon(saved.timeHorizon ?? "Near");
    if (saved.roleId) setTargetRoleId(saved.roleId);
  }, []);

  React.useEffect(() => {
    // accept query param targetRole from Pathway route and treat it as a title selection if it matches an option.
    // Pathway currently passes targetRole as a title string (selection-only in that page).
    if (!targetRoleQuery) return;
    // We'll set it after options load by matching title.
  }, [targetRoleQuery]);

  React.useEffect(() => {
    if (!isDirectTrajectory) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setLoadError(null);

      try {
        setDirectOptionsLoading(true);
        const options = await fetchRoleOptionsForCurrentRole(currentRoleTitle);
        if (cancelled) return;

        setDirectRoleOptions(options);

        // If query param is present, prefer it (match by title).
        if (targetRoleQuery) {
          const match = options.find((o) => o.title.toLowerCase() === targetRoleQuery.toLowerCase());
          if (match) setTargetRoleId(match.id);
          else {
            // If it's not in the direct options list, still allow selection later.
            // We do not allow manual typing; user must pick from the dropdown options.
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        setLoadError("Unable to load direct roles right now. Please try again.");
      } finally {
        if (!cancelled) {
          setDirectOptionsLoading(false);
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isDirectTrajectory, currentRoleTitle, targetRoleQuery]);

  React.useEffect(() => {
    // Load persona skills (best-effort) from local persona storage.
    // We intentionally avoid importing loadPersona() here to keep bundle surface small; role-card already does that.
    // Instead, reuse a tiny call through apiFetch if backend ever exposes persona skills; for now, try localStorage.
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

    async function loadTarget() {
      if (!isDirectTrajectory) return;
      if (!targetRoleId) {
        setTargetRoleDetails(null);
        return;
      }

      setTargetLoading(true);
      try {
        const details = await fetchTargetRoleDetailsById(targetRoleId);
        if (cancelled) return;
        setTargetRoleDetails(details);

        // Persist selection locally + best-effort to backend.
        persistTargetRoleSelection({ roleId: targetRoleId, timeHorizon });

        try {
          await apiFetch("/api/personas/target-role", {
            method: "POST",
            body: JSON.stringify({ user_id: personaId, role_id: targetRoleId, time_horizon: timeHorizon }),
          });
        } catch {
          // ignore; local selection is still valid.
        }
      } catch {
        if (cancelled) return;
        setTargetRoleDetails(null);
      } finally {
        if (!cancelled) setTargetLoading(false);
      }
    }

    loadTarget();
    return () => {
      cancelled = true;
    };
  }, [isDirectTrajectory, personaId, targetRoleId, timeHorizon]);

  const requiredSkills = React.useMemo(() => extractRequiredSkills(targetRoleDetails), [targetRoleDetails]);
  const matchedSkills = React.useMemo(
    () => intersectSet(personaSkills, requiredSkills),
    [personaSkills, requiredSkills],
  );
  const missingSkills = React.useMemo(
    () => differenceSet(requiredSkills, personaSkills),
    [requiredSkills, personaSkills],
  );

  const canProceed = Boolean(targetRoleId);

  if (!isDirectTrajectory) return null;

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
            Start from your current role, pick a target role (selection-only), then review gap analysis, requirements, and your
            roadmap.
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
              <Label htmlFor="directRoleList">Direct roles (from current role)</Label>
              <Select
                value={targetRoleId}
                onValueChange={(v) => {
                  setTargetRoleId(v);
                  // Reset details while loading a new one.
                  setTargetRoleDetails(null);
                }}
              >
                <SelectTrigger id="directRoleList" className="bg-white">
                  <SelectValue placeholder={directOptionsLoading ? "Loading roles…" : "Select a target role"} />
                </SelectTrigger>
                <SelectContent>
                  {directRoleOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No roles available
                    </SelectItem>
                  ) : (
                    directRoleOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                You must select a target role (manual typing is disabled for the Direct Trajectory flow).
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timeHorizon">Time horizon</Label>
              <Select
                value={timeHorizon}
                onValueChange={(v) => {
                  const next = (v === "Mid" || v === "Far" ? v : "Near") as TimeHorizon;
                  setTimeHorizon(next);
                  persistTargetRoleSelection({ roleId: targetRoleId || "unknown", timeHorizon: next });
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
                Used to filter and sequence your roadmap. Estimated timeline:{" "}
                <span className="font-semibold text-slate-900">{horizonWeeks(timeHorizon)} weeks</span>.
              </div>
            </div>
          </div>

          {!canProceed ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Select a target role to unlock gap analysis and roadmap.
            </div>
          ) : targetLoading ? (
            <div className="rounded-lg border border-border bg-white/70 p-3 text-xs text-muted-foreground">
              Loading role details…
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Target role details (selection-only) */}
      {canProceed ? (
        <Card className="border-border bg-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              Target role
            </CardTitle>
            <CardDescription>Confirm the selected target role before reviewing gaps and roadmap.</CardDescription>
          </CardHeader>
          <CardContent>
            {targetRoleDetails ? (
              <div className="max-w-4xl">
                <RoleCard role={{ ...targetRoleDetails, id: targetRoleId, title: roleTitleFromRole(targetRoleDetails) }} personaId={personaId} />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                Role details are unavailable right now, but you can still proceed with a best-effort roadmap.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Gap analysis */}
      {canProceed ? (
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
              Tip: Set a shorter time horizon if you want a tighter, high-impact roadmap; choose Far for a broader skill-building
              sequence.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Role requirements */}
      {canProceed ? (
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

            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // Keep user in Explore but also ensure URL contains a stable target role id and horizon.
                  const qs = new URLSearchParams(searchParams?.toString() ?? "");
                  qs.set("exploreMode", "direct_trajectory");
                  qs.set("flow", "direct");
                  qs.set("targetRoleId", targetRoleId);
                  qs.set("timeHorizon", timeHorizon);
                  router.replace(`/explore?${qs.toString()}`);
                }}
              >
                Save selection to URL <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Roadmap */}
      {canProceed ? (
        <Card className="border-border bg-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-violet-700" />
              Roadmap (mindmap + pathway)
            </CardTitle>
            <CardDescription>
              A time-horizon roadmap combining a mindmap view and a stepwise pathway. (Mindmap uses existing Explore view; pathway is a
              structured timeline.)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mindmap</div>
              <div className="mt-3">
                {/* Reuse ExploreMindmapView for now. Time horizon filtering is represented via the selected horizon badge + persisted selection.
                    A dedicated mindmap endpoint supports timeHorizon, but ExploreMindmapView currently renders recommendations pool.
                    This is still a useful "roadmap visualization" today and aligns with existing routing/state conventions. */}
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
                  { w: 0.15, title: "Align on target role outcomes", desc: "Confirm responsibilities, required skills, and success signals." },
                  { w: 0.35, title: "Close top skill gaps", desc: "Focus on 3–6 missing skills with highest impact on readiness." },
                  { w: 0.65, title: "Build portfolio proof", desc: "Ship 1–2 projects demonstrating target-role responsibilities." },
                  { w: 0.9, title: "Interview readiness + transitions", desc: "Update resume/LinkedIn, practice interviews, and network." },
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
      ) : null}
    </div>
  );
}

export default DirectTrajectoryPanel;
