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

  // Determine which role to center:
  // - target role (saved from Explore)
  // - otherwise: ask backend for last saved target role (if available)
  // - otherwise: keep UI usable but show an error banner.
  const [centerRoleId, setCenterRoleId] = React.useState<string | null>(null);

  // Boot: load persisted view-state from backend (prefer) then local, and resolve center role.
  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsBooting(true);
      const local = toSafeState(getLocalMindmapViewState());

      // Resolve center role: view-state > local target role > backend saved target role
      const localTarget = getTargetRoleId();
      let resolvedCenter: string | null = local.centerRoleId || localTarget || null;

      try {
        const userKey = getUserKey();
        const remote = await loadMindmapViewState({ userKey });
        if (!cancelled && remote) {
          const merged = toSafeState({ ...local, ...remote });
          setState(merged);
          persistLocalMindmapViewState(merged);
          if (merged.centerRoleId) resolvedCenter = merged.centerRoleId;
        } else if (!cancelled) {
          // Keep local
          setState(local);
        }
      } catch {
        // Remote persistence unavailable; keep local
        if (!cancelled) setState(local);
      }

      if (!resolvedCenter) {
        // Try backend last saved target role.
        try {
          const userKey = getUserKey();
          const res = await apiFetch(`/personas/target-role?user_id=${encodeURIComponent(userKey)}`, { method: 'GET' });

          // Backend returns: { status: "ok", target: { user_id, role_id, time_horizon, ... } }
          const target = res && typeof res === 'object' ? (res as any).target : null;
          const roleId = target && typeof target === 'object' && target.role_id ? String(target.role_id) : null;

          if (roleId && !cancelled) resolvedCenter = roleId;
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setCenterRoleId(resolvedCenter);
        setIsBooting(false);
      }
    }

    boot();

    // React to updates from Explore in other tabs (or other parts of app)
    function onStorage(evt: StorageEvent) {
      if (!evt.key) return;
      if (evt.key.includes('career_navigator_target_role_id')) {
        const next = getTargetRoleId();
        setCenterRoleId((prev) => next || prev);
      }
    }
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Whenever the center role changes, ensure state.centerRoleId is updated (so it persists).
  React.useEffect(() => {
    if (!centerRoleId) return;
    setState((s) => ({ ...s, centerRoleId }));
  }, [centerRoleId]);

  // Fetch graph whenever filters/center change.
  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!centerRoleId) {
        setGraph(null);
        return;
      }
      setGraphLoading(true);
      setGraphError(null);
      try {
        const data = await fetchMindmapGraph({ centerRoleId, filters: state.filters });
        if (cancelled) return;
        setGraph(data);
        // If selected node no longer exists after filtering, clear it.
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
  }, [centerRoleId, state.filters.salaryMin, state.filters.salaryMax, state.filters.skillSimilarityMin, state.filters.timeHorizon]);

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
        const d = await fetchMindmapNodeDetails({ nodeId, centerRoleId });
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
  }, [state.selectedNodeId, centerRoleId]);

  // Fetch target role details (role-card-like fields) whenever centerRoleId changes.
  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!centerRoleId) {
        setTargetRole(null);
        setTargetRoleError(null);
        setTargetRoleLoading(false);
        return;
      }

      setTargetRoleLoading(true);
      setTargetRoleError(null);

      try {
        // Best-effort: use roles search to retrieve a role record that contains the role-card fields.
        // This endpoint returns an array (possibly empty). We take the first best match.
        const qs = new URLSearchParams();
        qs.set('q', centerRoleId);

        // Persona id may help backend provide enriched fields (compatibility, reports, etc.)
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
  }, [centerRoleId]);

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
          <div className="text-xs text-slate-500">
            Center role:{' '}
            <span className="font-semibold text-slate-700">{centerRoleId ? centerRoleId : 'Not set'}</span>
          </div>
        </header>

        {isBooting ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0D9488] rounded-full animate-spin mb-4" />
          </div>
        ) : !centerRoleId ? (
          <div className="p-6 rounded-2xl border border-amber-100 bg-amber-50 text-amber-900">
            <div className="font-bold">No target role selected</div>
            <div className="mt-1 text-sm text-amber-800">
              Go to <span className="font-semibold">Explore</span> and choose “Set as target role”, then return here.
              The mind map centers on your saved role.
            </div>
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
