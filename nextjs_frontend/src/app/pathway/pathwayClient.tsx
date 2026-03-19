'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Compass, GitBranch, Route, Sparkles } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import StepProgressHeader from '@/app/components/StepProgressHeader';
import { loadPersonaId } from '@/lib/personaStorage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

type MultiversePathType = 'vertical' | 'lateral' | 'pivot' | 'non_linear';

type TargetRoleOption = {
  value: string;
  label: string;
};

const TARGET_ROLE_OPTIONS: TargetRoleOption[] = [
  { value: 'Senior Product Manager', label: 'Senior Product Manager' },
  { value: 'Product Lead', label: 'Product Lead' },
  { value: 'Staff Product Manager', label: 'Staff Product Manager' },
  { value: 'Data Product Manager', label: 'Data Product Manager' },
  { value: 'Technical Product Manager', label: 'Technical Product Manager' },
  { value: 'Program Manager', label: 'Program Manager' },
  { value: 'Product Strategy Manager', label: 'Product Strategy Manager' },
];

function multiverseLabel(t: MultiversePathType): string {
  switch (t) {
    case 'vertical':
      return 'Vertical (Traditional Progression)';
    case 'lateral':
      return 'Lateral Move';
    case 'pivot':
      return 'Industry Pivot';
    case 'non_linear':
      return 'Non‑Linear Path';
  }
}

function multiverseDescription(t: MultiversePathType): string {
  switch (t) {
    case 'vertical':
      return 'A more conventional step-up sequence in a similar domain.';
    case 'lateral':
      return 'A sideways role move to broaden your scope (often faster transitions).';
    case 'pivot':
      return 'A shift into a different industry or domain using transferable skills.';
    case 'non_linear':
      return 'A creative path with mixed moves and role combinations.';
  }
}

// PUBLIC_INTERFACE
export default function PathwayClient() {
  /** Pathway page: entry point for Direct Trajectory and Multiverse Explorer flows (UI + navigation placeholders). */
  const router = useRouter();
  const personaId = loadPersonaId();

  const [activeTab, setActiveTab] = React.useState<'direct' | 'multiverse'>('direct');

  // Direct trajectory selection-only
  const [directTargetRole, setDirectTargetRole] = React.useState<string>('');

  // Multiverse selection
  const [selectedPathType, setSelectedPathType] = React.useState<MultiversePathType | null>(null);
  const [multiverseTargetRole, setMultiverseTargetRole] = React.useState<string>('');

  const goToExplore = (opts: { mode: 'direct' | 'multiverse'; targetRole?: string; pathType?: MultiversePathType }) => {
    // We use query params as a lightweight "engine placeholder" to inform the Explore page.
    // Explore currently doesn't implement these flows; this creates an integration point without breaking existing UX.
    const qs = new URLSearchParams();
    if (personaId) qs.set('personaId', personaId);

    qs.set('flow', opts.mode);
    if (opts.targetRole) qs.set('targetRole', opts.targetRole);

    if (opts.mode === 'direct') {
      // "Direct roles based on current role" will be implemented inside Explore later.
      qs.set('exploreMode', 'direct_trajectory');
    } else {
      qs.set('exploreMode', 'multiverse');
      if (opts.pathType) qs.set('pathType', opts.pathType);
    }

    // Hint Explore's search bar to the target role if provided.
    if (opts.targetRole) qs.set('q', opts.targetRole);

    router.push(`/explore?${qs.toString()}`);
  };

  const lavenderCardClass = 'border-violet-200 bg-violet-50/70';

  return (
    <div className="min-h-svh w-full bg-white">
      <StepProgressHeader currentStep={3} />

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-600">
            <GitBranch className="h-4 w-4" />
            Pathway
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Choose how you want to explore your next move</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Pick a trajectory style. Both options take you to Explore, where gap analysis, requirements, and roadmap views will
            be layered in.
          </p>
        </header>

        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v === 'multiverse' ? 'multiverse' : 'direct')}>
            <TabsList className="grid w-full max-w-[520px] grid-cols-2">
              <TabsTrigger value="direct" className="gap-2">
                <Route className="h-4 w-4" />
                Direct Trajectory
              </TabsTrigger>
              <TabsTrigger value="multiverse" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Multiverse Explorer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="mt-6">
              <Card className={lavenderCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5 text-violet-700" />
                    Direct Trajectory
                  </CardTitle>
                  <CardDescription>
                    Best when you already know your target role. Select one below (no typing) and we’ll route you to Explore with the
                    target role prefilled.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-2">
                    <Label htmlFor="directTarget">Target role</Label>
                    <Select value={directTargetRole} onValueChange={setDirectTargetRole}>
                      <SelectTrigger id="directTarget" className="bg-white">
                        <SelectValue placeholder="Select a target role" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Selection-only for now. Explore will later surface “direct roles based on your current role” and then run gap
                      analysis + requirements + personalized roadmap.
                    </p>
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-600">
                      <div className="font-semibold text-slate-900">What happens next</div>
                      <ul className="mt-1 list-disc pl-5 text-sm">
                        <li>Choose/confirm your target role</li>
                        <li>Gap analysis + role requirements</li>
                        <li>Personalized roadmap (mindmap + pathway + time horizon)</li>
                      </ul>
                    </div>

                    <Button
                      type="button"
                      className="sm:self-end"
                      disabled={!directTargetRole}
                      onClick={() => goToExplore({ mode: 'direct', targetRole: directTargetRole || undefined })}
                    >
                      Continue to Explore <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {!directTargetRole ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      Select a target role to continue.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="multiverse" className="mt-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className={[lavenderCardClass, 'lg:col-span-2'].join(' ')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-violet-700" />
                      Multiverse Explorer
                    </CardTitle>
                    <CardDescription>
                      Explore multiple possible career paths (lateral moves, pivots, traditional progressions, and non‑linear paths).
                      Select a path type (and optionally a target role) to route into Explore.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(['vertical', 'lateral', 'pivot', 'non_linear'] as MultiversePathType[]).map((t) => {
                        const selected = selectedPathType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedPathType(t)}
                            className={[
                              'rounded-xl border p-4 text-left transition-colors',
                              selected ? 'border-violet-400 bg-violet-100/70' : 'border-violet-200/80 bg-white hover:bg-violet-50',
                            ].join(' ')}
                            aria-pressed={selected}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{multiverseLabel(t)}</div>
                                <div className="mt-1 text-xs text-slate-600">{multiverseDescription(t)}</div>
                              </div>
                              {selected ? (
                                <Badge className="bg-violet-700 text-white hover:bg-violet-700">Selected</Badge>
                              ) : (
                                <Badge variant="secondary">Path</Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="multiTarget">Optional target role (selection-only)</Label>
                      <Select
                        value={multiverseTargetRole}
                        onValueChange={(v) => setMultiverseTargetRole(v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger id="multiTarget" className="bg-white">
                          <SelectValue placeholder="Select a target role (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No target role yet</SelectItem>
                          {TARGET_ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        Optional: you can decide later. After choosing a path type, Explore will show roles under the selected path,
                        then run gap analysis + roadmap generation.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-600">
                        <div className="font-semibold text-slate-900">Acceptance criteria (UI/engine placeholder)</div>
                        <ul className="mt-1 list-disc pl-5 text-sm">
                          <li>Multi‑path visualization (branching trajectories, distinct styling)</li>
                          <li>Personalized recommendations (sequence, timelines, compatibility score)</li>
                          <li>Filtering controls (type, industry, salary, time) + save/bookmark</li>
                          <li>Path detail view (skill gaps, resources, effort indicator)</li>
                        </ul>
                      </div>

                      <Button
                        type="button"
                        disabled={!selectedPathType}
                        onClick={() =>
                          goToExplore({
                            mode: 'multiverse',
                            pathType: selectedPathType ?? undefined,
                            targetRole: multiverseTargetRole || undefined,
                          })
                        }
                      >
                        Explore paths <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    {!selectedPathType ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        Select a path type to continue.
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className={lavenderCardClass}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Compass className="h-5 w-5 text-violet-700" />
                      Notes
                    </CardTitle>
                    <CardDescription>How this integrates today</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-600">
                    <p>
                      This feature routes to <span className="font-semibold text-slate-900">Explore</span> with query parameters like{' '}
                      <span className="font-mono text-xs">flow</span>, <span className="font-mono text-xs">pathType</span>, and{' '}
                      <span className="font-mono text-xs">targetRole</span>.
                    </p>
                    <p>
                      Explore currently supports search + filters + recommendations/mindmap. The multiverse visualization, compatibility
                      engine, and bookmarking controls will be layered into Explore in a future iteration.
                    </p>
                    <div className="rounded-lg border border-violet-200 bg-white/70 p-3 text-xs">
                      Persona loaded: <span className="font-mono">{personaId ? personaId : 'none'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
