'use client';

import React from 'react';
import { getPersonaDerivedCurrentRoleTitle } from '@/lib/personaRoleDerivation';
import { getExploreRecommendationsPool } from '@/lib/recommendationsPoolClient';
import {
  ExploreMindmapCanvas,
  type ExploreMindmapEdge,
  type ExploreMindmapNode,
  type ExploreMindmapViewport,
} from '@/app/components/explore/ExploreMindmapCanvas';
import { ExploreMindmapDetailsPanel } from '@/app/components/explore/ExploreMindmapDetailsPanel';
import {
  getExploreMindmapViewState,
  persistExploreMindmapViewState,
  type ExploreMindmapViewState,
} from '@/lib/exploreMindmapViewStateStorage';

function normString(v: unknown): string {
  return String(v ?? '').trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function roleIdFromRole(role: any): string {
  return normString(role?.id ?? role?.role_id ?? role?.roleId ?? role?.onet_id ?? role?.code ?? role?.title ?? role?.role_title);
}

function roleTitleFromRole(role: any): string {
  return normString(role?.title ?? role?.role_title ?? role?.roleTitle);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseSalaryRangeToLakhs(role: any): { min: number | null; max: number | null } {
  // Best-effort parsing; if it fails we return nulls and the filter becomes non-blocking.
  const raw = normString(role?.salary_range ?? role?.salaryRange ?? role?.salary);
  if (!raw) return { min: null, max: null };

  const nums = raw
    .replace(/,/g, '')
    .match(/\d+(\.\d+)?/g)
    ?.map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  if (!nums || nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max };
}

function roleMatchesFilters(params: {
  role: any;
  selectedIndustry: string;
  selectedSkills: string[];
  salaryRange: [number, number];
}): boolean {
  const { role, selectedIndustry, selectedSkills, salaryRange } = params;

  if (selectedIndustry) {
    const industry = normString(role?.industry);
    if (!industry) return false;
    if (industry.toLowerCase() !== selectedIndustry.toLowerCase()) return false;
  }

  if (selectedSkills.length > 0) {
    const roleSkills = [
      ...safeStringArray(role?.skills_required),
      ...safeStringArray(role?.required_skills),
      ...safeStringArray(role?.skills),
    ]
      .map((s) => s.toLowerCase())
      .filter(Boolean);

    // OR semantics: if multiple skills are selected, match roles that have ANY selected skill.
    const wanted = selectedSkills.map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (wanted.length > 0) {
      const matchesAny = wanted.some((key) => roleSkills.some((rs) => rs.includes(key)));
      if (!matchesAny) return false;
    }
  }

  // Salary filter (if role provides parsable salary data)
  const salary = parseSalaryRangeToLakhs(role);
  if (salary.min !== null && salary.max !== null) {
    const [minWanted, maxWanted] = salaryRange;
    const overlaps = salary.max >= minWanted && salary.min <= maxWanted;
    if (!overlaps) return false;
  }

  return true;
}

async function fetchRecommendations(personaId: string) {
  /**
   * IMPORTANT:
   * This must reuse the same pool as the Cards view so switching tabs does not refetch.
   * The underlying pool client handles:
   * - in-flight de-dupe (StrictMode safe)
   * - memory/session cache
   * - single browser request via /api/recommendations/pool
   */
  const allowPadding = process.env.NEXT_PUBLIC_RECOMMENDATIONS_ALLOW_PADDING === 'true';
  const { roles } = await getExploreRecommendationsPool({ personaId, allowPadding });
  return Array.isArray(roles) ? roles : [];
}

function toViewport(state: ExploreMindmapViewState): ExploreMindmapViewport {
  return { panX: state.panX, panY: state.panY, zoom: clamp(state.zoom, 0.25, 3) };
}

function toState(viewport: ExploreMindmapViewport, selectedNodeId: string | null): ExploreMindmapViewState {
  return {
    version: 1,
    panX: viewport.panX,
    panY: viewport.panY,
    zoom: viewport.zoom,
    selectedNodeId,
  };
}

// PUBLIC_INTERFACE
export function ExploreMindmapView(props: {
  personaId: string;
  selectedIndustry: string;
  selectedSkills: string[];
  salaryRange: [number, number];
}) {
  /** Explore mind map alternative view: current role centered with recommended roles branching. */
  const { personaId, selectedIndustry, selectedSkills, salaryRange } = props;

  const [roles, setRoles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [viewport, setViewport] = React.useState<ExploreMindmapViewport>({ panX: 0, panY: 0, zoom: 1 });

  // Boot: restore persisted viewport + selection.
  React.useEffect(() => {
    const saved = getExploreMindmapViewState(personaId);
    setViewport(toViewport(saved));
    setSelectedNodeId(saved.selectedNodeId);
  }, [personaId]);

  // Persist on change (debounced).
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      persistExploreMindmapViewState(personaId, toState(viewport, selectedNodeId));
    }, 250);
    return () => window.clearTimeout(t);
  }, [personaId, viewport, selectedNodeId]);

  // Fetch recommendations.
  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRecommendations(personaId);
        if (cancelled) return;
        setRoles(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (cancelled) return;
        setRoles([]);
        setError('AI recommendations unavailable. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [personaId]);

  const currentRoleTitle = React.useMemo(() => getPersonaDerivedCurrentRoleTitle() || 'Current role', [personaId]);

  const filteredRoles = React.useMemo(() => {
    return roles.filter((r) => roleMatchesFilters({ role: r, selectedIndustry, selectedSkills, salaryRange }));
  }, [roles, selectedIndustry, selectedSkills, salaryRange]);

  const { nodes, edges, roleByNodeId } = React.useMemo(() => {
    const currentNode: ExploreMindmapNode = {
      id: 'current',
      title: currentRoleTitle,
      kind: 'current',
    };

    const byId = new Map<string, any>();
    const roleNodes: ExploreMindmapNode[] = filteredRoles.map((r, idx) => {
      const rawId = roleIdFromRole(r);
      const id = rawId || `rec-${idx}`;
      byId.set(id, r);
      return {
        id,
        title: roleTitleFromRole(r) || id,
        kind: 'recommended',
        meta: r,
      };
    });

    const edges: ExploreMindmapEdge[] = roleNodes.map((n) => ({ source: currentNode.id, target: n.id }));

    return {
      nodes: [currentNode, ...roleNodes],
      edges,
      roleByNodeId: byId,
    };
  }, [filteredRoles, currentRoleTitle]);

  // If filters change and the selected node disappears, clear selection so the details panel doesn't look "stuck".
  React.useEffect(() => {
    if (!selectedNodeId) return;
    const idSet = new Set(nodes.map((n) => n.id));
    if (!idSet.has(selectedNodeId)) setSelectedNodeId(null);
  }, [nodes, selectedNodeId]);

  const selectedRole = selectedNodeId && selectedNodeId !== 'current' ? roleByNodeId.get(selectedNodeId) ?? null : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      <div className="min-h-[520px]">
        {loading ? (
          <div className="h-[520px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center px-6 text-center">
            <div className="w-10 h-10 border-4 border-teal-100 border-t-[#0D9488] rounded-full animate-spin" />
            <div className="mt-3 text-sm text-slate-500 font-medium">Building your mind map…</div>
          </div>
        ) : error ? (
          <div className="h-[520px] rounded-2xl border border-red-100 bg-red-50 flex flex-col items-center justify-center px-6 text-center">
            <div className="text-sm text-red-700 font-semibold">{error}</div>
          </div>
        ) : nodes.length <= 1 ? (
          <div className="h-[520px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center px-6 text-center">
            <div className="text-sm text-slate-600 font-semibold">No recommended roles match the active filters.</div>
            <div className="mt-2 text-xs text-slate-500">Try removing some filters to see more nodes.</div>
          </div>
        ) : (
          <ExploreMindmapCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            viewport={viewport}
            onViewportChange={setViewport}
            onNodeClick={(id) => setSelectedNodeId(id)}
          />
        )}
      </div>

      <div className="h-[520px]">
        <ExploreMindmapDetailsPanel
          selectedRole={selectedRole}
          personaId={personaId}
          loading={loading}
          error={error}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
    </div>
  );
}
