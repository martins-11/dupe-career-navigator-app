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
import { apiFetch, ApiError } from '@/lib/apiClient';
import { getPersonaDerivedCurrentRoleTitle } from '@/lib/personaRoleDerivation';
import { createLogger } from '@/lib/logger';

const log = createLogger('MindmapClient');

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
    /**
     * Default zoom adjusted for the new "centered diagram with generous margins" layout.
     * We still preserve any saved zoom/pan from local/remote view-state.
     */
    zoom: 1.35,
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

function safeErrorMessage(e: unknown): string {
  if (!e) return 'Unknown error';
  if (e instanceof ApiError) return `${e.message} (HTTP ${e.status})`;
  if (e instanceof Error) return e.message;
  return String(e);
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

  const storageKey = 'career_navigator_anon_user_key';
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.trim()) return existing.trim();

    const created = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `anon_${Date.now()}`;
  }
}

function computeEmptyStateReason(params: {
  isBooting: boolean;
  graphLoading: boolean;
  graphError: string | null;
  currentRoleTitle: string | null;
  graph: MindmapGraphResponse | null;
}): { title: string; details: string } | null {
  if (params.isBooting) {
    return { title: 'Loading mind map…', details: 'Initializing view state and role context.' };
  }

  if (params.graphError) {
    return { title: 'Could not load mind map', details: params.graphError };
  }

  if (params.graphLoading) {
    return { title: 'Building your mind map…', details: 'Fetching graph data from the backend.' };
  }

  if (!params.currentRoleTitle || !params.currentRoleTitle.trim()) {
    return {
      title: 'Current role not detected',
      details:
        'The mind map is centered on your current role, which is derived from your persona. Upload documents and generate a persona first, then return here.',
    };
  }

  if (!params.graph) {
    return {
      title: 'No graph data returned',
      details: 'The backend returned no graph payload. Use the debug panel to inspect request/response.',
    };
  }

  if (!Array.isArray(params.graph.nodes) || params.graph.nodes.length === 0) {
    return {
      title: 'No mind map nodes to show',
      details:
        'The backend responded, but no nodes were produced. Try loosening filters, or verify the backend graph endpoint is returning nodes.',
    };
  }

  return null;
}

function DebugRow(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-1 border-b border-border last:border-b-0">
      <div className="text-muted-foreground">{props.label}</div>
      <div className="text-foreground break-words">{props.value}</div>
    </div>
  );
}

// PUBLIC_INTERFACE
export default function MindmapClient() {
  /** Mind Map page with interactive exploration + persistence + filters. */
  const [isBooting, setIsBooting] = React.useState(true);

  const [state, setState] = React.useState<MindmapViewState>(() => toSafeState(getLocalMindmapViewState()));
  const [graph, setGraph] = React.useState<MindmapGraphResponse | null>(null);

  const [graphLoading, setGraphLoading] = React.useState(false);
  const [graphError, setGraphError] = React.useState<string | null>(null);
  const [lastGraphReq, setLastGraphReq] = React.useState<any | null>(null);
  const [lastGraphRes, setLastGraphRes] = React.useState<any | null>(null);

  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<MindmapNodeDetailsResponse | null>(null);

  // Increment to force node-details refetch even if the selected node id doesn't change
  // (e.g., user clicks the same node again).
  const [detailsFetchNonce, setDetailsFetchNonce] = React.useState(0);

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

  // Debug UI state
  const [debugOpen, setDebugOpen] = React.useState(false);

  // Boot: load persisted view-state from backend (prefer) then local, and resolve roles.
  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsBooting(true);
      const local = toSafeState(getLocalMindmapViewState());

      try {
        const userKey = getUserKey();
        const remote = await loadMindmapViewState({ userId: userKey });
        if (!cancelled && remote) {
          const merged = toSafeState({ ...local, ...remote });
          setState(merged);
          persistLocalMindmapViewState(merged);
        } else if (!cancelled) {
          setState(local);
        }
      } catch (e) {
        log.warn('Failed to load remote view-state; using local', safeErrorMessage(e));
        if (!cancelled) setState(local);
      }

      // Resolve current+target roles:
      const personaDerivedCurrentTitle = getPersonaDerivedCurrentRoleTitle();
      if (!cancelled) setCurrentRoleTitle(personaDerivedCurrentTitle);

      // Best-effort fetch backend context (may augment/override target role; current role only if persona missing).
      try {
        const userKey = getUserKey();
        // NOTE: This endpoint may not exist in all backends; failures are non-fatal.
        const ctx = await apiFetch(`/api/profile/roles?user_id=${encodeURIComponent(userKey)}`, { method: 'GET' });

        const backendCurrentTitle =
          ctx && typeof ctx === 'object' && (ctx as any).currentRole?.currentRoleTitle
            ? String((ctx as any).currentRole.currentRoleTitle)
            : null;

        const targetId =
          ctx && typeof ctx === 'object' && (ctx as any).targetRole?.roleId ? String((ctx as any).targetRole.roleId) : null;

        if (!cancelled) {
          setCurrentRoleTitle(personaDerivedCurrentTitle || backendCurrentTitle || null);
          setTargetRoleId(targetId || getTargetRoleId());
        }
      } catch (e) {
        log.info('Backend roles context not available; falling back to local storage', safeErrorMessage(e), {
          throttleMs: 5000,
          key: 'ctx-fail',
        });
        if (!cancelled) {
          setCurrentRoleTitle(personaDerivedCurrentTitle);
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

      const reqPayload = {
        userId: userKey,
        currentRoleTitle: currentRoleTitle || undefined,
        filters: state.filters,
      };
      setLastGraphReq(reqPayload);

      setGraphLoading(true);
      setGraphError(null);

      try {
        const data = await fetchMindmapGraph(reqPayload);
        if (cancelled) return;

        setLastGraphRes({
          ok: true,
          nodes: Array.isArray(data?.nodes) ? data.nodes.length : null,
          edges: Array.isArray(data?.edges) ? data.edges.length : null,
          centerNodeId: data?.centerNodeId,
          meta: (data as any)?.meta,
        });

        setGraph(data);

        // Preserve restored pan/zoom.
        // Only sanitize the viewport if it is invalid (NaN/Infinity/out of supported bounds).
        setState((s) => {
          const zoom = Number.isFinite(s.zoom) ? clamp(s.zoom, 0.25, 3) : 2.3;
          const panX = Number.isFinite(s.panX) ? s.panX : 0;
          const panY = Number.isFinite(s.panY) ? s.panY : 0;
          return { ...s, zoom, panX, panY };
        });

        if (state.selectedNodeId && !data.nodes.some((n) => n.id === state.selectedNodeId)) {
          setState((s) => ({ ...s, selectedNodeId: null }));
          setDetails(null);
          setDetailsError(null);
        }
      } catch (e: any) {
        if (cancelled) return;

        setGraph(null);
        const msg = safeErrorMessage(e);
        setGraphError(msg);

        setLastGraphRes({
          ok: false,
          error: msg,
          status: e instanceof ApiError ? e.status : undefined,
          payload: e instanceof ApiError ? e.payload : undefined,
        });
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
        const d = await fetchMindmapNodeDetails({ nodeId, centerRoleId: state.centerRoleId ?? 'current' });
        if (cancelled) return;
        setDetails(d);
      } catch (e) {
        if (cancelled) return;
        setDetails(null);
        setDetailsError(`Could not load role details. (${safeErrorMessage(e)})`);
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [state.selectedNodeId, state.centerRoleId, detailsFetchNonce]);

  // Fetch target role details (role-card-like fields) whenever targetRoleId changes.
  React.useEffect(() => {
    let cancelled = false;

    function looksLikeUuid(v: string): boolean {
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
        if (looksLikeUuid(targetRoleId)) {
          const role = await apiFetch(`/api/roles/by-id/${encodeURIComponent(targetRoleId)}`, {
            method: 'GET',
            cache: 'no-store',
          });
          if (!cancelled) setTargetRole(role ?? null);
          return;
        }

        const qs = new URLSearchParams();
        qs.set('q', targetRoleId);

        const effectivePersonaId = loadPersonaId();
        if (effectivePersonaId) qs.set('personaId', effectivePersonaId);

        const res = await apiFetch(`/api/roles/search?${qs.toString()}`, { method: 'GET' });
        const arr = Array.isArray(res) ? res : [];
        const best = arr[0] ?? null;

        if (!cancelled) setTargetRole(best);
      } catch (e) {
        if (!cancelled) {
          setTargetRole(null);
          setTargetRoleError(`Could not load target role details. (${safeErrorMessage(e)})`);
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
        await saveMindmapViewState({ userId: userKey, state });
      } catch (e) {
        // backend persistence is best-effort; localStorage already has state
        log.info('saveMindmapViewState failed (non-fatal)', safeErrorMessage(e), {
          throttleMs: 5000,
          key: 'save-view-state-fail',
        });
      }
    }, 900);

    return () => window.clearTimeout(t);
  }, [state]);

  const viewport: MindmapViewport = { panX: state.panX, panY: state.panY, zoom: state.zoom };

  function setViewport(v: MindmapViewport) {
    setState((s) => ({ ...s, panX: v.panX, panY: v.panY, zoom: clamp(v.zoom, 0.25, 3) }));
  }

  const dimmed = React.useMemo(() => {
    if (!graph) return new Set<string>();
    return new Set<string>();
  }, [graph]);

  const emptyState = computeEmptyStateReason({ isBooting, graphLoading, graphError, currentRoleTitle, graph });

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--mindmap-bg-canvas)' }}>
      <div className="px-6 py-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header row (matches design: title left, meta right) */}
          <header className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h1 className="text-[26px] font-extrabold tracking-tight" style={{ color: 'var(--mindmap-text-title)' }}>
                Career Navigator
              </h1>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-right text-[11px] font-medium" style={{ color: 'var(--mindmap-text-meta)' }}>
                <div className="truncate max-w-[520px]">
                  Current role:{' '}
                  <span className="font-semibold" style={{ color: 'var(--mindmap-text-muted)' }}>
                    {currentRoleTitle ? currentRoleTitle : 'Not detected yet'}
                  </span>
                </div>
                <div className="truncate max-w-[520px]">
                  Target role:{' '}
                  <span className="font-semibold" style={{ color: 'var(--mindmap-text-muted)' }}>
                    {targetRoleId ? targetRoleId : 'Not set'}
                  </span>
                </div>
              </div>

              {/* Keep debug toggle (functional; subtle) */}
              <button
                type="button"
                className="px-2.5 py-1 rounded-md border text-[11px]"
                style={{ borderColor: 'rgba(0,0,0,0.10)', color: 'var(--mindmap-text-meta)' }}
                onClick={() => setDebugOpen((v) => !v)}
                aria-expanded={debugOpen}
              >
                {debugOpen ? 'Hide debug' : 'Show debug'}
              </button>
            </div>
          </header>

          {debugOpen ? (
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-xs mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-foreground">Mindmap Debug Panel</div>
                <div className="text-muted-foreground">Use this to understand why the graph is blank.</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg bg-background border border-border p-3">
                  <div className="font-semibold text-foreground mb-1">Context</div>
                  <DebugRow label="userKey" value={getUserKey()} />
                  <DebugRow label="personaId" value={personaId ?? 'null'} />
                  <DebugRow label="currentRoleTitle" value={currentRoleTitle ?? 'null'} />
                  <DebugRow label="targetRoleId" value={targetRoleId ?? 'null'} />
                </div>

                <div className="rounded-lg bg-background border border-border p-3">
                  <div className="font-semibold text-foreground mb-1">Graph fetch</div>
                  <DebugRow label="status" value={graphLoading ? 'loading' : graphError ? 'error' : graph ? 'ok' : 'idle'} />
                  <DebugRow label="error" value={graphError ?? 'null'} />
                  <DebugRow label="nodes" value={graph?.nodes ? graph.nodes.length : 'null'} />
                  <DebugRow label="edges" value={graph?.edges ? graph.edges.length : 'null'} />
                  <DebugRow label="centerNodeId" value={graph?.centerNodeId ?? 'null'} />
                </div>

                <div className="rounded-lg bg-background border border-border p-3 lg:col-span-2">
                  <div className="font-semibold text-foreground mb-2">Last request/response (summary)</div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <div className="text-muted-foreground mb-1">Request</div>
                      <pre className="rounded-md p-3 overflow-auto max-h-56 whitespace-pre-wrap" style={{ background: "var(--cn-slate)", color: "var(--cn-white)" }}>
                        {JSON.stringify(lastGraphReq, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Response</div>
                      <pre className="rounded-md p-3 overflow-auto max-h-56 whitespace-pre-wrap" style={{ background: "var(--cn-slate)", color: "var(--cn-white)" }}>
                        {JSON.stringify(lastGraphRes, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Filters remain fully functional; visually de-emphasized in the new layout */}
          <div className="mb-4">
            <MindmapFiltersBar value={state.filters} onChange={(next) => setState((s) => ({ ...s, filters: next }))} />
          </div>

          {/* Main area: centered diagram + right details */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
            <div className="min-h-[520px] relative">
              {emptyState ? (
                <div
                  className="h-[520px] rounded-2xl border flex flex-col items-center justify-center px-6 text-center"
                  style={{ borderColor: 'rgba(0,0,0,0.10)', background: '#fff', boxShadow: 'var(--mindmap-shadow-soft)' }}
                  role={graphError ? 'alert' : 'status'}
                >
                  {graphLoading ? (
                    <div
                      className="w-10 h-10 border-4 rounded-full animate-spin"
                      style={{
                        borderColor: 'rgba(var(--cn-primary-rgb), 0.20)',
                        borderTopColor: 'var(--mindmap-accent-700)',
                      }}
                    />
                  ) : null}
                  <div className="text-lg font-semibold mt-3" style={{ color: 'var(--mindmap-text-title)' }}>
                    {emptyState.title}
                  </div>
                  <div className="mt-2 text-sm max-w-md" style={{ color: 'var(--mindmap-text-muted)' }}>
                    {emptyState.details}
                  </div>
                  {!debugOpen ? (
                    <button
                      type="button"
                      className="mt-4 px-4 py-2 rounded-full text-white text-sm"
                      style={{ background: 'var(--mindmap-cta-primary)' }}
                      onClick={() => setDebugOpen(true)}
                    >
                      Open debug panel
                    </button>
                  ) : null}
                </div>
              ) : (
                <MindmapCanvas
                  nodes={graph!.nodes}
                  edges={graph!.edges}
                  centerNodeId={graph!.centerNodeId}
                  selectedNodeId={state.selectedNodeId}
                  dimmedNodeIds={dimmed}
                  viewport={viewport}
                  onViewportChange={setViewport}
                  onNodeClick={(nodeId) => {
                    setRightTab('selected');
                    setDetails(null);
                    setDetailsError(null);
                    setState((s) => ({ ...s, selectedNodeId: nodeId }));
                    setDetailsFetchNonce((n) => n + 1);
                  }}
                />
              )}

              {/* Right-side floating chevrons (decorative; mirrors design chrome) */}
              <div className="hidden lg:block absolute right-2 top-[88px] select-none" aria-hidden="true">
                <div className="w-8 h-8 grid place-items-center" style={{ color: 'var(--mindmap-control-icon)' }}>
                  ▶
                </div>
              </div>
              <div className="hidden lg:block absolute right-2 top-[220px] select-none" aria-hidden="true">
                <div className="w-8 h-8 grid place-items-center" style={{ color: 'var(--mindmap-control-icon)' }}>
                  ◀
                </div>
              </div>

              {/* Bottom lane (visual-only lane to match design; CTA reuses existing navigation intent) */}
              <div className="mt-4 rounded-2xl border px-4 py-3 flex items-center justify-between gap-4"
                   style={{ borderColor: 'rgba(0,0,0,0.10)', background: '#fff', boxShadow: 'var(--mindmap-shadow-soft)' }}>
                <div className="text-[12px] font-semibold" style={{ color: 'var(--mindmap-text-muted)' }}>
                  Analyze Deep Dive
                </div>
                <div className="flex-1 px-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-center"
                       style={{ color: 'var(--mindmap-text-muted)' }}>
                    CAREER TRANSITION PATHWAY
                  </div>
                  <div className="mt-2 w-full h-[2px] relative">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(to right, var(--mindmap-path-stroke) 0 6px, transparent 6px 12px)',
                      }}
                    />
                    <div className="absolute right-0 -top-[6px]" style={{ color: 'var(--mindmap-path-stroke)' }}>
                      ▶
                    </div>
                  </div>
                </div>
                <a
                  href="/explore"
                  className="px-4 py-2 rounded-full text-white text-sm whitespace-nowrap"
                  style={{ background: 'var(--mindmap-cta-primary)' }}
                >
                  Explore Roles
                </a>
              </div>
            </div>

            <div className="h-[520px]">
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
                      <TargetRoleDetailsPanel role={targetRole} persona={persona} loading={targetRoleLoading} error={targetRoleError} />
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
        </div>
      </div>
    </div>
  );
}
