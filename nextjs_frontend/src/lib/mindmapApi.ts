/**
 * Mindmap API client helpers.
 *
 * MindmapClient uses these functions to call Next.js API routes that proxy to / provide
 * mindmap-related data.
 */

import { apiFetch } from '@/lib/apiClient';

export type MindmapFilters = {
  salaryMin: number;
  salaryMax: number;
  skillSimilarityMin: number;
  timeHorizon: 'Any' | 'Near' | 'Mid' | 'Far';
};

export type MindmapViewState = {
  version: 1;
  panX: number;
  panY: number;
  zoom: number;
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  filters: MindmapFilters;
  centerRoleId: string | null;
};

export type MindmapGraphNode = {
  id: string;
  title: string;
  subtitle?: string;
  group?: string;
  meta?: Record<string, any>;
};

export type MindmapGraphEdge = {
  id?: string;
  source: string;
  target: string;
  label?: string;
  meta?: Record<string, any>;
};

export type MindmapGraphResponse = {
  centerNodeId: string;
  nodes: MindmapGraphNode[];
  edges: MindmapGraphEdge[];
  meta?: Record<string, any>;
};

export type MindmapNodeDetailsResponse = {
  nodeId: string;
  title?: string;
  description?: string;

  /**
   * Optional convenience fields (some backends return snake_case, others camelCase).
   * These are consumed by NodeDetailsPanel.
   */
  averageSalary?: string | number | null;
  average_salary?: string | number | null;

  transitionTimeline?: string | null;
  transition_timeline?: string | null;

  requiredSkills?: string[] | null;
  required_skills?: string[] | null;

  skillGap?: string[] | null;
  skill_gap?: string[] | null;

  /** Arbitrary backend-provided payloads. */
  details?: Record<string, any>;
  meta?: Record<string, any>;
};

// PUBLIC_INTERFACE
export async function fetchMindmapGraph(payload: {
  userId: string;
  currentRoleTitle?: string;
  filters: MindmapFilters;
}): Promise<MindmapGraphResponse> {
  /** Fetch the mindmap graph via POST /api/mindmap/graph. */
  return apiFetch<MindmapGraphResponse>('/api/mindmap/graph', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
}

// PUBLIC_INTERFACE
export async function fetchMindmapNodeDetails(payload: {
  nodeId: string;
  centerRoleId?: string;
}): Promise<MindmapNodeDetailsResponse> {
  /** Fetch node details via POST /api/mindmap/node-details. */
  return apiFetch<MindmapNodeDetailsResponse>('/api/mindmap/node-details', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
}

// PUBLIC_INTERFACE
export async function loadMindmapViewState(params: { userId: string }): Promise<any | null> {
  /** Load remote view state via GET /api/mindmap/view-state?userId=... */
  const qs = new URLSearchParams();
  qs.set('userId', params.userId);
  return apiFetch<any>(`/api/mindmap/view-state?${qs.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    noThrow: true,
  });
}

// PUBLIC_INTERFACE
export async function saveMindmapViewState(params: { userId: string; state: MindmapViewState }): Promise<any> {
  /** Save remote view state via PUT /api/mindmap/view-state. */
  return apiFetch<any>('/api/mindmap/view-state', {
    method: 'PUT',
    body: JSON.stringify(params ?? {}),
    noThrow: true,
  });
}
