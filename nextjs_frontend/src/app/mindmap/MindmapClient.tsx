'use client';

import React from 'react';

import { MindmapCanvas, type MindmapViewport } from '@/app/components/mindmap/MindmapCanvas';
import { MindmapFiltersBar } from '@/app/components/mindmap/MindmapFilters';
import { NodeDetailsPanel } from '@/app/components/mindmap/NodeDetailsPanel';
import { TargetRoleDetailsPanel } from '@/app/components/mindmap/TargetRoleDetailsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

import {
  fetchMindmapGraph,
  fetchMindmapNodeDetails,
  loadMindmapViewState,
  saveMindmapViewState,
  type MindmapFilters,
  type MindmapGraphResponse,
  type MindmapNodeDetailsResponse,
  type MindmapViewState,
} from '@/lib/mindmapApi';

import { loadPersona, loadPersonaId } from '@/lib/personaStorage';
import { getTargetRoleId } from '@/lib/targetRoleStorage';
import { getLocalMindmapViewState, persistLocalMindmapViewState } from '@/lib/mindmapViewStateStorage';
import { apiFetch } from '@/lib/apiClient';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function defaultFilters(): MindmapFilters {
  return { salaryMin: 0, salaryMax: 60, skillSimilarityMin: 0.3, timeHorizon: 'Any' };
}

function defaultState(): MindmapViewState {
  return {
    version: 1,
    panX: 0,
    panY: 0,
    zoom: 1,
    selectedNodeId: null,
    expandedNodeIds: [],
    filters: defaultFilters(),
    centerRoleId: null,
  };
}

function toSafeState(s: any): MindmapViewState {
  const base = defaultState();
  if (!s || typeof s !== 'object') return base;
  return {
    version: 1,
    panX: typeof s.panX === 'number' ? s.panX : base.panX,
    panY: typeof s.panY === 'number' ? s.panY : base.panY,
    zoom: typeof s.zoom === 'number' ? clamp(s.zoom, 0.25, 3) : base.zoom,
    selectedNodeId: typeof s.selectedNodeId === 'string' ? s.selectedNodeId : null,
    expandedNodeIds: Array.isArray(s.expandedNodeIds) ? s.expandedNodeIds.map(String) : [],
    filters: {
      salaryMin: typeof s.filters?.salaryMin === 'number' ? s.filters.salaryMin : base.filters.salaryMin,
      salaryMax: typeof s.filters?.salaryMax === 'number' ? s.filters.salaryMax : base.filters.salaryMax,
      skillSimilarityMin:
        typeof s.filters?.skillSimilarityMin === 'number' ? s.filters.skillSimilarityMin : base.filters.skillSimilarityMin,
      timeHorizon: (s.filters?.timeHorizon ?? base.filters.timeHorizon) as any,
    },
    centerRoleId: typeof s.centerRoleId === 'string' ? s.centerRoleId : null,
  };
}

/**
 * Best-effort user key:
 * - We don't have authentication; use personaId as a stable-ish identifier when present.
 * - Otherwise, generate and persist a stable anonymous id in localStorage so backend persistence
 *   never receives undefined/empty userId.
 */
function getUserKey(): string {
  const personaId = loadPersonaId();
  if (personaId) return personaId;

  // Stable anonymous key per browser.
  const storageKey = 'career_navigator_anon_user_key';
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.trim()) return existing.trim();

    const created = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    // If localStorage is unavailable, fall back to an always-non-empty value.
    return `anon_${Date.now()}`;
  }
}

// PUBLIC_INTERFACE
export default function MindmapClient() {
  /** Mind Map page with interactive exploration + persistence + filters. */
  const [isBooting, setIsBooting] = React.useState(true);

  const [state, setState] = React.useState<MindmapViewState>(() => toSafeState(getLocalMindmapViewState()));
  const [graph, setGraph] = React.useState<MindmapGraphResponse | null>(null);

  const [graphLoading, setGraphLoading] = React.useState(false);
  const [graphError, setGraphError] = React.useState<string | null>(null);

  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<MindmapNodeDetailsResponse | null>(null);

  // Target role details panel state
  const [rightTab, setRightTab] = React.useState<'target' | 'selected'>('target');
  const [targetRoleLoading, setTargetRoleLoading] = React.useState(false);
  const [targetRoleError, setTargetRoleError] = React.useState<string | null>(null);
  const [targetRole, setTargetRole] = React.useState<any | null>(null);

  // Persona (for "your matching skills" in target role details)
  const personaId = loadPersonaId();
  const persona = React.useMemo(() => (personaId ? loadPersona(personaId) : null), [personaId]);

  // Role context:
  // - mindmap center MUST be the user's current role (extracted during ingestion)
  // - target role is separately set from Explore
  const [currentRoleTitle, setCurrentRoleTitle] = React.useState<string | null>(null);
  const [targetRoleId, setTargetRoleId] = React.useState<string | null>(null);

  // Boot: load persisted view-state from backend (prefer) then local, and resolve roles.
  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsBooting(true);
      const local = toSafeState(getLocalMindmapViewState());

      try {
        const userKey = getUserKey();
        const remote = await loadMindmapViewState({ userKey });
        if (!cancelled && remote) {
          const merged = toSafeState({ ...local, ...remote });
          setState(merged);
          persistLocalMindmapViewState(merged);
        } else if (!cancelled) {
          setState(local);
        }
      } catch {
        if (!cancelled) setState(local);
      }

      // Resolve current+target roles from backend (authoritative when available).
      try {
        const userKey = getUserKey();
        const ctx = await apiFetch(`/api/profile/roles?user_id=${encodeURIComponent(userKey)}`, { method: 'GET' });

        const currentTitle =
          ctx && typeof ctx === 'object' && (ctx as any).currentRole?.currentRoleTitle
            ? String((ctx as any).currentRole.currentRoleTitle)
            : null;

        const targetId =
          ctx && typeof ctx === 'object' && (ctx as any).targetRole?.roleId
            ? String((ctx as any).targetRole.roleId)
            : null;

        if (!cancelled) {
          setCurrentRoleTitle(currentTitle);
          setTargetRoleId(targetId || getTargetRoleId());
        }
      } catch {
        if (!cancelled) {
          setCurrentRoleTitle(null);
          setTargetRoleId(getTargetRoleId());
        }
      }

      if (!cancelled) setIsBooting(false);
    }

    boot();

    // React to updates from Explore in other tabs (target role changes)
    function onStorage(evt: StorageEvent) {
      if (!evt.key) return;
      if (evt.key.includes('career_navigator_target_role_id')) {
        const next = getTargetRoleId();
        setTargetRoleId(next);
      }
    }
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Mindmap center is always "current role" node; keep a stable id for persistence.
  React.useEffect(() => {
    setState((s) => ({ ...s, centerRoleId: 'current' }));
  }, []);

  // Fetch graph whenever filters/current role change.
  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      const userKey = getUserKey();

      setGraphLoading(true);
      setGraphError(null);
      try {
        const data = await fetchMindmapGraph({
          userId: userKey,
          currentRoleTitle: currentRoleTitle || undefined,
          filters: state.filters,
        });
        if (cancelled) return;
        setGraph(data);
        if (state.selectedNodeId && !data.nodes.some((n) => n.id === state.selectedNodeId)) {
          setState((s) => ({ ...s, selectedNodeId: null }));
          setDetails(null);
        }
      } catch (e: any) {
        if (cancelled) return;
        setGraph(null);
        setGraphError('Mind map service unavailable. Please try again.');
      } finally {
        if (!cancelled) setGraphLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoleTitle, state.filters.salaryMin, state.filters.salaryMax, state.filters.skillSimilarityMin, state.filters.timeHorizon]);

  // Fetch node details on selection change.
  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      const nodeId = state.selectedNodeId;
      if (!nodeId) {
        setDetails(null);
        setDetailsError(null);
        setDetailsLoading(false);
        return;
      }
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        // Mindmap is always centered on the user's current role. After the refactor there is
        // no standalone `centerRoleId` variable; it's tracked inside view-state instead.
        const d = await fetchMindmapNodeDetails({ nodeId, centerRoleId: state.centerRoleId ?? 'current' });
        if (cancelled) return;
        setDetails(d);
      } catch {
        if (cancelled) return;
        setDetails(null);
        setDetailsError('Could not load role details.');
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [state.selectedNodeId, state.centerRoleId]);

  // Fetch target role details (role-card-like fields) whenever targetRoleId changes.
  React.useEffect(() => {
    let cancelled = false;

    function looksLikeUuid(v: string): boolean {
      // Accept standard UUID v4-ish (but don't overfit), case-insensitive.
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
    }

    async function run() {
      if (!targetRoleId) {
        setTargetRole(null);
        setTargetRoleError(null);
        setTargetRoleLoading(false);
        return;
      }

      setTargetRoleLoading(true);
      setTargetRoleError(null);

      try {
        // Important: /api/roles/search is a text search endpoint and often returns []
        // when q is a UUID role_id. In that case, use a dedicated by-id lookup.
        if (looksLikeUuid(targetRoleId)) {
          const role = await apiFetch(`/api/roles/by-id/${encodeURIComponent(targetRoleId)}`, {
            method: 'GET',
            cache: 'no-store',
          });
          if (!cancelled) setTargetRole(role ?? null);
          return;
        }

        // Fallback: treat targetRoleId as a search query (legacy behavior).
        const qs = new URLSearchParams();
        qs.set('q', targetRoleId);

        const effectivePersonaId = loadPersonaId();
        if (effectivePersonaId) qs.set('personaId', effectivePersonaId);

        const res = await apiFetch(`/api/roles/search?${qs.toString()}`, { method: 'GET' });
        const arr = Array.isArray(res) ? res : [];
        const best = arr[0] ?? null;

        if (!cancelled) setTargetRole(best);
      } catch {
        if (!cancelled) {
          setTargetRole(null);
          setTargetRoleError('Could not load target role details.');
        }
      } finally {
        if (!cancelled) setTargetRoleLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [targetRoleId]);

  // Autosave/restore view-state:
  // - persist to localStorage on any change
  // - debounce backend save
  React.useEffect(() => {
    persistLocalMindmapViewState(state);
  }, [state]);

  React.useEffect(() => {
    const userKey = getUserKey();
    const t = window.setTimeout(async () => {
      try {
        await saveMindmapViewState({ userKey, state });
      } catch {
        // backend persistence is best-effort; localStorage already has state
      }
    }, 900);

    return () => window.clearTimeout(t);
  }, [state]);

  const viewport: MindmapViewport = { panX: state.panX, panY: state.panY, zoom: state.zoom };

  function setViewport(v: MindmapViewport) {
    setState((s) => ({ ...s, panX: v.panX, panY: v.panY, zoom: clamp(v.zoom, 0.25, 3) }));
  }

  // Dim nodes not currently visible according to backend filtering is handled server-side.
  // Still, when graph is null we dim everything.
  const dimmed = React.useMemo(() => {
    if (!graph) return new Set<string>();
    // If backend returns a field that indicates hidden nodes in meta, we could dim here.
    // For now, keep all returned nodes undimmed.
    return new Set<string>();
  }, [graph]);

  return (
    <div className="px-8 py-8 bg-white min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-[#0D9488] tracking-tight">Mind Map</h1>
            <p className="text-slate-500 mt-2 text-lg">
              Explore career paths: zoom/pan the graph, click nodes for details, and filter branches dynamically.
            </p>
          </div>
          <div className="text-xs text-slate-500 text-right">
            <div>
              Current role:{' '}
              <span className="font-semibold text-slate-700">
                {currentRoleTitle ? currentRoleTitle : 'Not detected yet'}
              </span>
            </div>
            <div>
              Target role:{' '}
              <span className="font-semibold text-slate-700">{targetRoleId ? targetRoleId : 'Not set'}</span>
            </div>
          </div>
        </header>

        {isBooting ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0D9488] rounded-full animate-spin mb-4" />
          </div>
        ) : (
          <>
            <MindmapFiltersBar
              value={state.filters}
              onChange={(next) => setState((s) => ({ ...s, filters: next }))}
            />

            {graphError ? (
              <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-600" role="alert">
                {graphError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
              <div className="min-h-[560px]">
                {graphLoading && !graph ? (
                  <div className="h-[560px] rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-teal-100 border-t-[#0D9488] rounded-full animate-spin" />
                      <div className="text-sm text-slate-500">Rendering your mind map…</div>
                    </div>
                  </div>
                ) : graph ? (
                  graph.nodes && graph.nodes.length > 0 ? (
                    <MindmapCanvas
                      nodes={graph.nodes}
                      edges={graph.edges}
                      centerNodeId={graph.centerNodeId}
                      selectedNodeId={state.selectedNodeId}
                      dimmedNodeIds={dimmed}
                      viewport={viewport}
                      onViewportChange={setViewport}
                      onNodeClick={(nodeId) => {
                        setRightTab('selected');
                        setState((s) => ({ ...s, selectedNodeId: nodeId }));
                      }}
                    />
                  ) : (
                    <div className="h-[560px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-600 px-6 text-center">
                      <div className="text-lg font-semibold text-slate-800">No mind map nodes to show</div>
                      <div className="mt-2 text-sm text-slate-500 max-w-md">
                        We couldn’t build a graph from your current role yet. Upload documents to detect your current role,
                        then return here to explore paths. (Target role selection does not affect the center node.)
                      </div>
                    </div>
                  )
                ) : (
                  <div className="h-[560px] rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500">
                    No graph data.
                  </div>
                )}
              </div>

              <div className="h-[560px]">
                <div className="h-full flex flex-col">
                  <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="h-full flex flex-col">
                    <div className="mb-3">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="target">Target role details</TabsTrigger>
                        <TabsTrigger value="selected">Selected node</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="target" className="mt-0 flex-1">
                      <div className="h-full">
                        <TargetRoleDetailsPanel
                          role={targetRole}
                          persona={persona}
                          loading={targetRoleLoading}
                          error={targetRoleError}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="selected" className="mt-0 flex-1">
                      <div className="h-full">
                        <NodeDetailsPanel
                          nodeId={state.selectedNodeId}
                          details={details}
                          loading={detailsLoading}
                          error={detailsError}
                          onClose={() => setState((s) => ({ ...s, selectedNodeId: null }))}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
