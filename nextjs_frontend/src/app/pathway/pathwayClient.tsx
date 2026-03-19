'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Compass, GitBranch, Route, Sparkles } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import StepProgressHeader from '@/app/components/StepProgressHeader';
import { loadPersonaId } from '@/lib/personaStorage';

type MultiversePathType = 'vertical' | 'lateral' | 'pivot' | 'non_linear';

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
  /** Pathway page: entry point for Direct Trajectory and Multiverse Explorer flows. */
  const router = useRouter();
  const personaId = loadPersonaId();

  const [activeTab, setActiveTab] = React.useState<'direct' | 'multiverse'>('direct');

  // Multiverse selection
  const [selectedPathType, setSelectedPathType] = React.useState<MultiversePathType | null>(null);

  const goToExplore = (opts: { mode: 'direct' | 'multiverse'; pathType?: MultiversePathType }) => {
    /**
     * IMPORTANT:
     * We intentionally do NOT collect/persist any "target role" on the Pathway page.
     * Pathway only selects the exploration flow and then routes into Explore.
     */
    const qs = new URLSearchParams();
    if (personaId) qs.set('personaId', personaId);

    qs.set('flow', opts.mode);

    if (opts.mode === 'direct') {
      qs.set('exploreMode', 'direct_trajectory');
    } else {
      qs.set('exploreMode', 'multiverse');
      if (opts.pathType) qs.set('pathType', opts.pathType);
    }

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
            Pick a trajectory style. This routes you into Explore (where search, mindmap, recommendations, and future “gap analysis” will
            live).
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
                    Jump into Explore in direct-trajectory mode. You can pick/search roles inside Explore (no target role is set on this
                    page).
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-600">
                      <div className="font-semibold text-slate-900">What happens next</div>
                      <ul className="mt-1 list-disc pl-5 text-sm">
                        <li>Explore roles and recommendations</li>
                        <li>Use search + filters or mindmap view</li>
                        <li>Direct Trajectory panel becomes available (persona-based)</li>
                      </ul>
                    </div>

                    <Button type="button" className="sm:self-end" onClick={() => goToExplore({ mode: 'direct' })}>
                      Continue to Explore <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
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
                      Choose a path type and route into Explore. Role selection happens inside Explore (no target role is set here).
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

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-600">
                        <div className="font-semibold text-slate-900">Next</div>
                        <ul className="mt-1 list-disc pl-5 text-sm">
                          <li>Explore roles and branches for the selected path type</li>
                          <li>Refine via filters (industry, skills, salary)</li>
                          <li>Future: branching trajectories + compatibility + bookmarking</li>
                        </ul>
                      </div>

                      <Button
                        type="button"
                        disabled={!selectedPathType}
                        onClick={() => goToExplore({ mode: 'multiverse', pathType: selectedPathType ?? undefined })}
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
                      This page routes to <span className="font-semibold text-slate-900">Explore</span> with lightweight query parameters (
                      <span className="font-mono text-xs">flow</span>, <span className="font-mono text-xs">exploreMode</span>, and{' '}
                      <span className="font-mono text-xs">pathType</span>).
                    </p>
                    <p>
                      Target role selection is intentionally handled inside Explore (or later steps), not here.
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
