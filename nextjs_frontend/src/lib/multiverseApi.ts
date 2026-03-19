/**
 * Multiverse Explorer API client helpers.
 *
 * These functions call the Next.js same-origin API routes under `/api/multiverse/*`,
 * which proxy to the Express backend.
 */

import { apiFetch } from '@/lib/apiClient';

export type MultiverseGraphNode = {
  id: string;
  type: 'persona' | 'current_role' | 'role' | 'path';
  label: string;
  level?: number;
  meta?: Record<string, any>;
  data?: Record<string, any>;
};

export type MultiverseGraphEdge = {
  id?: string;
  source: string;
  target: string;
  type?: string;
  label?: string | null;
  meta?: Record<string, any>;
  data?: Record<string, any>;
};

export type MultiverseGraphResponse = {
  meta?: Record<string, any>;
  nodes: MultiverseGraphNode[];
  edges: MultiverseGraphEdge[];
  detailsByNodeId?: Record<string, any>;
  detailsByPathId?: Record<string, any>;
};

export type MultiverseNodeDetailsResponse = Record<string, any> & {
  id?: string;
  nodeId?: string;
  title?: string;
};

export type MultiversePathDetailsResponse = Record<string, any> & {
  id?: string;
  pathId?: string;
  title?: string;
  steps?: string[];
};

export type MultiverseBookmarkType = 'node' | 'path';

export type MultiverseBookmarkRecord = {
  id?: string;
  userId: string;
  bookmarkType: MultiverseBookmarkType;
  bookmarkKey: string;
  payloadJson?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type MultiverseBookmarksListResponse = {
  bookmarks: MultiverseBookmarkRecord[];
};

function safeString(v: unknown): string {
  return String(v ?? '').trim();
}

function safeNumber(v: unknown): number | undefined {
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return undefined;
}

// PUBLIC_INTERFACE
export async function fetchMultiverseGraph(params: {
  personaId?: string | null;
  currentRoleTitle?: string | null;
  filters?: {
    minSalaryLpa?: number;
    maxSalaryLpa?: number;
    minSkillSimilarity?: number;
    timeHorizon?: 'Near' | 'Mid' | 'Far';
  };
  limit?: number;
}): Promise<MultiverseGraphResponse> {
  /** Fetch multiverse graph via GET /api/multiverse/graph with querystring params. */
  const qs = new URLSearchParams();

  const personaId = safeString(params.personaId);
  if (personaId) qs.set('personaId', personaId);

  const currentRoleTitle = safeString(params.currentRoleTitle);
  if (currentRoleTitle) qs.set('currentRoleTitle', currentRoleTitle);

  if (params.filters?.minSalaryLpa != null) qs.set('minSalaryLpa', String(params.filters.minSalaryLpa));
  if (params.filters?.maxSalaryLpa != null) qs.set('maxSalaryLpa', String(params.filters.maxSalaryLpa));
  if (params.filters?.minSkillSimilarity != null) qs.set('minSkillSimilarity', String(params.filters.minSkillSimilarity));
  if (params.filters?.timeHorizon) qs.set('timeHorizon', params.filters.timeHorizon);
  if (params.limit != null) qs.set('limit', String(params.limit));

  const path = qs.toString() ? `/api/multiverse/graph?${qs.toString()}` : '/api/multiverse/graph';
  return apiFetch<MultiverseGraphResponse>(path, { method: 'GET', cache: 'no-store' });
}

// PUBLIC_INTERFACE
export async function fetchMultiverseNodeDetails(params: {
  nodeId: string;
  personaId?: string | null;
  currentRoleTitle?: string | null;
}): Promise<MultiverseNodeDetailsResponse> {
  /** Fetch node details via GET /api/multiverse/nodes/:id. */
  const nodeId = safeString(params.nodeId);
  const qs = new URLSearchParams();

  const personaId = safeString(params.personaId);
  if (personaId) qs.set('personaId', personaId);

  const currentRoleTitle = safeString(params.currentRoleTitle);
  if (currentRoleTitle) qs.set('currentRoleTitle', currentRoleTitle);

  const path = qs.toString()
    ? `/api/multiverse/nodes/${encodeURIComponent(nodeId)}?${qs.toString()}`
    : `/api/multiverse/nodes/${encodeURIComponent(nodeId)}`;

  return apiFetch<MultiverseNodeDetailsResponse>(path, { method: 'GET', cache: 'no-store' });
}

// PUBLIC_INTERFACE
export async function fetchMultiversePathDetails(params: {
  pathId: string;
  personaId?: string | null;
  currentRoleTitle?: string | null;
  filters?: {
    minSalaryLpa?: number;
    maxSalaryLpa?: number;
    minSkillSimilarity?: number;
    timeHorizon?: 'Near' | 'Mid' | 'Far';
  };
}): Promise<MultiversePathDetailsResponse> {
  /** Fetch path details via GET /api/multiverse/paths/:id. */
  const pathId = safeString(params.pathId);
  const qs = new URLSearchParams();

  const personaId = safeString(params.personaId);
  if (personaId) qs.set('personaId', personaId);

  const currentRoleTitle = safeString(params.currentRoleTitle);
  if (currentRoleTitle) qs.set('currentRoleTitle', currentRoleTitle);

  const f = params.filters || {};
  if (f.minSalaryLpa != null) qs.set('minSalaryLpa', String(f.minSalaryLpa));
  if (f.maxSalaryLpa != null) qs.set('maxSalaryLpa', String(f.maxSalaryLpa));
  if (f.minSkillSimilarity != null) qs.set('minSkillSimilarity', String(f.minSkillSimilarity));
  if (f.timeHorizon) qs.set('timeHorizon', f.timeHorizon);

  // Allow backend to enforce Claude recommendations by pathType (lateral|vertical|pivot|non_linear).
  const pt = safeString((params as any)?.pathType);
  if (pt) qs.set('pathType', pt);

  // Backend route is singular: `/api/multiverse/path/:id` (not `/paths/:id`).
  // Keep the browser call same-origin; Next.js App Router proxy will forward to the backend.
  const path = qs.toString()
    ? `/api/multiverse/path/${encodeURIComponent(pathId)}?${qs.toString()}`
    : `/api/multiverse/path/${encodeURIComponent(pathId)}`;

  return apiFetch<MultiversePathDetailsResponse>(path, { method: 'GET', cache: 'no-store' });
}

// PUBLIC_INTERFACE
export async function listMultiverseBookmarks(params: {
  userId: string;
  bookmarkType?: MultiverseBookmarkType;
  limit?: number;
  offset?: number;
}): Promise<MultiverseBookmarksListResponse> {
  /** List bookmarks via GET /api/multiverse/bookmarks?userId=... */
  const qs = new URLSearchParams();
  qs.set('userId', safeString(params.userId));
  if (params.bookmarkType) qs.set('bookmarkType', params.bookmarkType);
  const limit = safeNumber(params.limit);
  if (limit != null) qs.set('limit', String(limit));
  const offset = safeNumber(params.offset);
  if (offset != null) qs.set('offset', String(offset));

  return apiFetch<MultiverseBookmarksListResponse>(`/api/multiverse/bookmarks?${qs.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

// PUBLIC_INTERFACE
export async function upsertMultiverseBookmark(params: {
  userId: string;
  bookmarkType: MultiverseBookmarkType;
  bookmarkKey: string;
  payload?: any;
}): Promise<{ status: 'ok'; bookmark: MultiverseBookmarkRecord }> {
  /** Upsert bookmark via PUT /api/multiverse/bookmarks. */
  return apiFetch(`/api/multiverse/bookmarks`, {
    method: 'PUT',
    body: JSON.stringify({
      userId: safeString(params.userId),
      bookmarkType: params.bookmarkType,
      bookmarkKey: safeString(params.bookmarkKey),
      payload: params.payload ?? null,
    }),
  });
}

// PUBLIC_INTERFACE
export async function deleteMultiverseBookmark(params: {
  userId: string;
  bookmarkType: MultiverseBookmarkType;
  bookmarkKey: string;
}): Promise<{ status: 'ok'; deleted?: number } & Record<string, any>> {
  /** Delete bookmark via DELETE /api/multiverse/bookmarks. */
  return apiFetch(`/api/multiverse/bookmarks`, {
    method: 'DELETE',
    body: JSON.stringify({
      userId: safeString(params.userId),
      bookmarkType: params.bookmarkType,
      bookmarkKey: safeString(params.bookmarkKey),
    }),
  });
}
