'use client';

import * as React from 'react';
import { Bookmark, BookmarkCheck, Filter, GitBranch, Route } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ScrollArea } from '@/app/components/ui/scroll-area';

import { ApiError } from '@/lib/apiClient';
import { getTargetRoleSelection } from '@/lib/targetRoleStorage';
import {
  addMultiverseBookmark as addLocalMultiverseBookmark,
  getLastMultiversePathType,
  isMultiverseBookmarked as isLocalMultiverseBookmarked,
  listMultiverseBookmarks as listLocalMultiverseBookmarks,
  persistLastMultiversePathType,
  removeMultiverseBookmark as removeLocalMultiverseBookmark,
  type MultiversePathBookmark,
  type MultiversePathType,
} from '@/lib/multiverseBookmarksStorage';
import {
  deleteMultiverseBookmark,
  fetchMultiverseGraph,
  fetchMultiversePathDetails,
  listMultiverseBookmarks,
  upsertMultiverseBookmark,
  type MultiverseBookmarkRecord,
} from '@/lib/multiverseApi';

import RoleCard from '@/app/components/explore/role-card';
import { ExploreMindmapView } from '@/app/components/explore/ExploreMindmapView';

function normString(v: unknown): string {
  return String(v ?? '').trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

type CareerPath = {
  id: string;
  title: string;
  steps: string[];
};

type MultiverseRecommendedRole = {
  id: string;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  required_skills?: string[];
  skills_required?: string[];
  key_responsibilities?: string[];
  responsibilities?: string[];
  whyThisMatchesPathType?: string;
  confidence?: number;
  meta?: Record<string, any>;
};

function roleIdFromRec(r: any, idx: number): string {
  const raw = normString(r?.id ?? r?.role_id ?? r?.roleId ?? r?.role_title ?? r?.title);
  if (raw) return raw;
  return `multiverse-rec-${idx}`;
}

function roleTitleFromRec(r: any): string {
  return normString(r?.title ?? r?.role_title ?? r?.roleTitle);
}

function labelForPathType(t: MultiversePathType): string {
  switch (t) {
    case 'vertical':
      return 'Vertical';
    case 'lateral':
      return 'Lateral';
    case 'pivot':
      return 'Pivot';
    case 'non_linear':
      return 'Non-linear';
  }
}

function describePathType(t: MultiversePathType): string {
  switch (t) {
    case 'vertical':
      return 'Traditional progression in a similar domain.';
    case 'lateral':
      return 'Sideways move to broaden scope and unlock faster transitions.';
    case 'pivot':
      return 'Industry/domain pivot using transferable skills.';
    case 'non_linear':
      return 'Creative mix of moves and role combinations.';
  }
}

function looksLikePathType(v: string | null | undefined): v is MultiversePathType {
  return v === 'vertical' || v === 'lateral' || v === 'pivot' || v === 'non_linear';
}

function pathMatchesFilters(params: {
  path: CareerPath;
  titleQuery: string;
  selectedIndustry: string;
  selectedSkills: string[];
}): boolean {
  const { path, titleQuery, selectedIndustry, selectedSkills } = params;

  const q = titleQuery.trim().toLowerCase();
  if (q) {
    const hay = `${path.title} ${path.steps.join(' ')}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  // Best-effort keyword match until backend emits structured metadata for paths.
  const ind = selectedIndustry.trim().toLowerCase();
  if (ind) {
    const hay = `${path.title} ${path.steps.join(' ')}`.toLowerCase();
    if (!hay.includes(ind)) return false;
  }

  const wanted = selectedSkills.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (wanted.length > 0) {
    const hay = `${path.title} ${path.steps.join(' ')}`.toLowerCase();
    const ok = wanted.some((k) => hay.includes(k));
    if (!ok) return false;
  }

  return true;
}

function PathCard(props: {
  path: CareerPath;
  selected: boolean;
  pathType: MultiversePathType | null;
  isBookmarked: boolean;
  onSelect: () => void;
  onToggleBookmark: () => void;
}) {
  const { path, selected, onSelect, onToggleBookmark, isBookmarked, pathType } = props;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        'w-full text-left rounded-2xl border transition-colors',
        selected ? 'border-violet-400 bg-violet-50' : 'border-border bg-card hover:bg-secondary/40',
      ].join(' ')}
      aria-pressed={selected}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-foreground truncate">{path.title}</div>
              {pathType ? (
                <Badge variant="secondary" className="shrink-0">
                  {labelForPathType(pathType)}
                </Badge>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {path.steps.slice(0, 8).map((s, idx) => (
                <span
                  key={`${path.id}-${idx}-${s}`}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-border bg-white/70 text-foreground"
                >
                  {s}
                </span>
              ))}
              {path.steps.length > 8 ? (
                <span className="text-[11px] text-muted-foreground">+{path.steps.length - 8} more</span>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleBookmark();
            }}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this path'}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PathDetailPanel(props: {
  personaId: string | null;
  pathType: MultiversePathType | null;
  selectedPath: CareerPath | null;
  bookmarks: MultiversePathBookmark[];
  loadingDetails: boolean;
  detailsError: string | null;
  onToggleBookmark: (path: CareerPath) => void;
  onClose: () => void;
}) {
  const { selectedPath, bookmarks, onToggleBookmark, onClose, pathType, loadingDetails, detailsError } = props;

  const isBookmarked = selectedPath ? bookmarks.some((b) => b.id === selectedPath.id) : false;

  return (
    <aside className="h-full rounded-2xl border border-border bg-card text-card-foreground overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            Multiverse path details
          </div>
          <div className="mt-1 text-base font-bold text-foreground truncate">
            {selectedPath ? selectedPath.title : 'Select a path'}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={!selectedPath} className="text-muted-foreground">
          Close
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {!selectedPath ? (
          <div className="text-sm leading-relaxed text-muted-foreground">
            Pick a path on the left to see step-by-step details and bookmark it.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <GitBranch className="h-3.5 w-3.5" />
                  Multiverse
                </Badge>
                {pathType ? (
                  <Badge variant="secondary" className="gap-1">
                    <Route className="h-3.5 w-3.5" />
                    {labelForPathType(pathType)}
                  </Badge>
                ) : null}
              </div>

              <Button
                type="button"
                variant={isBookmarked ? 'secondary' : 'default'}
                onClick={() => onToggleBookmark(selectedPath)}
                className="gap-2"
              >
                {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
            </div>

            {detailsError ? (
              <div className="rounded-xl border border-border bg-amber-50 p-4">
                <div className="text-sm font-semibold text-foreground">Couldn’t load path details</div>
                <div className="mt-1 text-xs text-muted-foreground">{detailsError}</div>
              </div>
            ) : null}

            {pathType ? (
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Path type: {labelForPathType(pathType)}
                </div>
                <div className="mt-1 text-sm text-foreground">{describePathType(pathType)}</div>
              </div>
            ) : null}

            <div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground font-bold">Steps</div>

              {loadingDetails ? (
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {selectedPath.steps.map((s, idx) => (
                    <div key={`${selectedPath.id}-step-${idx}`} className="rounded-xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Step {idx + 1}
                      </div>
                      <div className="mt-1 text-sm font-bold text-foreground">{s}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground font-bold">Bookmarks</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {bookmarks.length === 0
                  ? 'No bookmarks yet.'
                  : `Saved ${bookmarks.length} path${bookmarks.length === 1 ? '' : 's'}.`}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function normalizeBackendBookmarksToLocal(records: MultiverseBookmarkRecord[]): MultiversePathBookmark[] {
  const out: MultiversePathBookmark[] = [];
  for (const r of records) {
    if (!r || r.bookmarkType !== 'path') continue;

    const id = normString(r.bookmarkKey);
    if (!id) continue;

    const payload: any = (r as any).payloadJson ?? (r as any).payload ?? null;
    const title = normString(payload?.title) || normString(payload?.label) || `Path ${id}`;
    const steps = safeStringArray(payload?.steps);

    out.push({
      id,
      title,
      steps,
      pathType: payload?.pathType,
      createdAt: normString(r.createdAt) || new Date().toISOString(),
    });
  }

  // Sort newest first when we have timestamps
  out.sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0));
  return out;
}

function normalizeRecommendedRoles(details: any): MultiverseRecommendedRole[] {
  const arr = Array.isArray(details?.recommendedRoles) ? details.recommendedRoles : [];
  const out: MultiverseRecommendedRole[] = [];

  for (let i = 0; i < arr.length; i += 1) {
    const r = arr[i];
    if (!r || typeof r !== 'object') continue;

    const title = roleTitleFromRec(r);
    if (!title) continue;

    const id = roleIdFromRec(r, i);
    const why = normString((r as any)?.whyThisMatchesPathType || (r as any)?.rationale || '');

    out.push({
      id,
      title,
      description: why || null,
      tags: [],
      required_skills: safeStringArray((r as any)?.requiredSkills ?? (r as any)?.required_skills ?? (r as any)?.skills_required ?? []),
      skills_required: safeStringArray((r as any)?.skills_required ?? (r as any)?.required_skills ?? []),
      key_responsibilities: safeStringArray((r as any)?.keyResponsibilities ?? (r as any)?.key_responsibilities ?? []),
      responsibilities: safeStringArray((r as any)?.responsibilities ?? []),
      whyThisMatchesPathType: why || undefined,
      confidence: Number.isFinite(Number((r as any)?.confidence)) ? Math.round(Number((r as any)?.confidence)) : undefined,
      meta: (r as any)?.meta ?? undefined,
    });
  }

  return out.slice(0, 5);
}

// PUBLIC_INTERFACE
export function MultiverseExplorerView(props: {
  personaId: string | null;
  pathType: MultiversePathType | null;
  selectedIndustry: string;
  selectedSkills: string[];
  salaryRange: [number, number];
  titleQuery: string;
}) {
  /**
   * Multiverse Explorer UX (updated):
   * Step 1) Select a multiverse path (left).
   * Step 2) Show Claude role cards FIRST (pathType-specific) from /api/multiverse/paths/:id.
   * Step 3) Only after the user selects a target role do we render the mindmap view.
   */
  const { personaId, pathType, selectedIndustry, selectedSkills, titleQuery, salaryRange } = props;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [paths, setPaths] = React.useState<CareerPath[]>([]);
  const [selectedPathId, setSelectedPathId] = React.useState<string | null>(null);

  const [bookmarks, setBookmarks] = React.useState<MultiversePathBookmark[]>(() => listLocalMultiverseBookmarks(personaId));

  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);

  const [recommendedRoles, setRecommendedRoles] = React.useState<MultiverseRecommendedRole[]>([]);
  const [targetRoleId, setTargetRoleId] = React.useState<string | null>(() => getTargetRoleSelection().roleId);

  const userIdForBookmarks = personaId; // In this app, personaId is the closest stable per-user key available in the UI state.

  React.useEffect(() => {
    // Keep track of target role selection changes (RoleCard persists via localStorage).
    function onStorage(evt: StorageEvent) {
      if (!evt.key) return;
      if (evt.key.includes('career_navigator_target_role_id')) {
        const next = getTargetRoleSelection();
        setTargetRoleId(next.roleId);
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  React.useEffect(() => {
    // Whenever persona changes, refresh bookmarks best-effort.
    let cancelled = false;

    async function run() {
      setBookmarks(listLocalMultiverseBookmarks(personaId));

      if (!userIdForBookmarks) return;

      try {
        const res = await listMultiverseBookmarks({
          userId: userIdForBookmarks,
          bookmarkType: 'path',
          limit: 200,
          offset: 0,
        });
        if (cancelled) return;

        const normalized = normalizeBackendBookmarksToLocal(res?.bookmarks ?? []);
        setBookmarks(normalized);

        // Also persist into localStorage as a fallback cache for the persona.
        for (const b of normalized) {
          addLocalMultiverseBookmark({ personaId, bookmark: b });
        }
      } catch {
        // Keep local bookmarks; no hard failure.
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [personaId, userIdForBookmarks]);

  React.useEffect(() => {
    /**
     * Fetch the Multiverse graph and derive selectable paths.
     *
     * IMPORTANT:
     * - Backend returns `paths: [{ id: "path_1", nodeIds: [...] }]`.
     * - Those path ids are the ONLY valid ids for GET /api/multiverse/paths/:id.
     * - Do NOT derive "paths" from role nodes, otherwise we end up calling
     *   /api/multiverse/paths/<role title> which correctly 404s.
     *
     * Loop prevention:
     * - This effect must NOT depend on `selectedPathId`, otherwise selection changes can
     *   cascade into repeated graph refetches (especially if pool ordering changes).
     */
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const minSalaryUsdK = salaryRange?.[0];
      const maxSalaryUsdK = salaryRange?.[1];

      try {
        const graph: any = await fetchMultiverseGraph({
          personaId,
          currentRoleTitle: null,
          filters: { minSalaryUsdK, maxSalaryUsdK },
          limit: 60,
        });

        const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
        const pathsFromBackend = Array.isArray(graph?.paths) ? graph.paths : [];

        // Build lookup from nodeId -> title/label for pretty steps.
        const nodeTitleById = new Map<string, string>();
        for (const n of nodes) {
          const id = normString((n as any)?.id);
          if (!id) continue;
          const title = normString((n as any)?.data?.title) || normString((n as any)?.label) || id;
          nodeTitleById.set(id, title);
        }

        let derived: CareerPath[] = pathsFromBackend
          .map((p: any) => {
            const id = normString(p?.id);
            const nodeIds = Array.isArray(p?.nodeIds) ? p.nodeIds.map((x: any) => normString(x)).filter(Boolean) : [];

            // Convert nodeIds -> readable role titles. Skip the center/current node (index 0) for steps.
            const steps = nodeIds
              .slice(1)
              .map((nid: string) => nodeTitleById.get(nid) || nid)
              .filter(Boolean);

            const titleFromBackend = normString(p?.title);
            const title = titleFromBackend || (steps.length > 0 ? steps.join(' → ') : `Path ${id}`);

            return { id, title, steps };
          })
          .filter((p: CareerPath) => p.id && p.steps.length > 0);

        if (cancelled) return;

        setPaths(derived);

        // Preserve user selection when possible; otherwise pick the first path.
        setSelectedPathId((prev) => {
          if (prev && derived.some((p) => p.id === prev)) return prev;
          return derived[0]?.id ?? null;
        });
      } catch (e) {
        if (cancelled) return;

        setPaths([]);
        setSelectedPathId(null);

        const msg =
          e instanceof ApiError ? e.message : 'Multiverse paths are unavailable right now. Please try again.';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [personaId, salaryRange?.[0], salaryRange?.[1]]);

  const filtered = React.useMemo(() => {
    return paths.filter((p) => pathMatchesFilters({ path: p, titleQuery, selectedIndustry, selectedSkills }));
  }, [paths, titleQuery, selectedIndustry, selectedSkills]);

  React.useEffect(() => {
    if (!selectedPathId) return;
    if (!filtered.some((p) => p.id === selectedPathId)) {
      setSelectedPathId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedPathId]);

  const selectedPath = React.useMemo(() => {
    if (!selectedPathId) return null;
    return filtered.find((p) => p.id === selectedPathId) ?? null;
  }, [filtered, selectedPathId]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setDetailsError(null);
      if (!selectedPathId) {
        setRecommendedRoles([]);
        return;
      }

      setLoadingDetails(true);
      try {
        const details: any = await fetchMultiversePathDetails({
          pathId: selectedPathId,
          personaId,
          currentRoleTitle: null,
          filters: { minSalaryUsdK: salaryRange?.[0], maxSalaryUsdK: salaryRange?.[1] },
          pathType: pathType ?? undefined,
        } as any);

        // Merge more authoritative steps/title if provided.
        const steps = safeStringArray(details?.steps);
        const title = normString(details?.title);

        if (!cancelled && (steps.length > 0 || title)) {
          setPaths((prev) =>
            prev.map((p) => {
              if (p.id !== selectedPathId) return p;
              return {
                ...p,
                title: title || p.title,
                steps: steps.length > 0 ? steps : p.steps,
              };
            }),
          );
        }

        if (!cancelled) {
          setRecommendedRoles(normalizeRecommendedRoles(details));
        }
      } catch (e) {
        if (cancelled) return;
        setDetailsError(e instanceof ApiError ? e.message : 'Please try again.');
        setRecommendedRoles([]);
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedPathId, personaId, salaryRange, pathType]);

  async function toggleBookmark(path: CareerPath) {
    const isBookmarked = bookmarks.some((b) => b.id === path.id);
    const payload = { id: path.id, title: path.title, steps: path.steps, pathType: pathType ?? undefined };

    // Preferred: backend persistence (requires userId).
    if (userIdForBookmarks) {
      try {
        if (isBookmarked) {
          await deleteMultiverseBookmark({
            userId: userIdForBookmarks,
            bookmarkType: 'path',
            bookmarkKey: path.id,
          });
        } else {
          await upsertMultiverseBookmark({
            userId: userIdForBookmarks,
            bookmarkType: 'path',
            bookmarkKey: path.id,
            payload,
          });
        }

        const res = await listMultiverseBookmarks({ userId: userIdForBookmarks, bookmarkType: 'path', limit: 200, offset: 0 });
        const normalized = normalizeBackendBookmarksToLocal(res?.bookmarks ?? []);
        setBookmarks(normalized);

        for (const b of normalized) {
          addLocalMultiverseBookmark({ personaId, bookmark: b });
        }
        return;
      } catch {
        // Fall back to local behavior below.
      }
    }

    // Fallback: localStorage.
    const alreadyLocal = isLocalMultiverseBookmarked({ personaId, bookmarkId: path.id });
    if (alreadyLocal) {
      const next = removeLocalMultiverseBookmark({ personaId, bookmarkId: path.id });
      setBookmarks(next);
      return;
    }

    const next = addLocalMultiverseBookmark({
      personaId,
      bookmark: { id: path.id, title: path.title, steps: path.steps, pathType: pathType ?? undefined },
    });
    setBookmarks(next);
  }

  const hasTarget = Boolean(targetRoleId);

  return (
    <div className="space-y-6">
      <Card className="border-violet-200 bg-violet-50/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet-700" />
            Multiverse Explorer
          </CardTitle>
          <CardDescription>
            Step 1: pick a path. Step 2: choose a target role (Claude recommendations). Step 3: explore the mindmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3.5 w-3.5" />
            Filters active
          </Badge>
          {pathType ? (
            <Badge variant="secondary">{labelForPathType(pathType)} path</Badge>
          ) : (
            <Badge variant="secondary">All path types</Badge>
          )}
          <Badge variant="secondary">
            {filtered.length} path{filtered.length === 1 ? '' : 's'}
          </Badge>
          {bookmarks.length > 0 ? (
            <Badge variant="secondary" className="gap-1">
              <BookmarkCheck className="h-3.5 w-3.5" />
              {bookmarks.length} bookmarked
            </Badge>
          ) : null}
          {hasTarget ? <Badge variant="secondary">Target role selected</Badge> : <Badge variant="secondary">Select target role</Badge>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div className="min-h-[520px]">
          {loading ? (
            <div className="h-[520px] rounded-2xl border border-border bg-background p-5">
              <div className="space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ) : error ? (
            <div className="h-[520px] rounded-2xl border border-border bg-secondary flex flex-col items-center justify-center px-6 text-center">
              <div className="text-sm text-foreground font-semibold">{error}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-[520px] rounded-2xl border border-border bg-background flex flex-col items-center justify-center px-6 text-center">
              <div className="text-sm text-foreground font-semibold">No paths match the active filters.</div>
              <div className="mt-2 text-xs text-muted-foreground">Try removing skills/industry keywords or clearing the search.</div>
            </div>
          ) : (
            <Card className="rounded-2xl border border-border bg-background overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Step 1 — Choose a path</div>
                <div className="text-xs text-muted-foreground">Then pick a target role below</div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 p-4">
                <div className="h-[420px] rounded-2xl border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="text-xs font-semibold text-foreground">Paths</div>
                    <div className="text-[11px] text-muted-foreground">{filtered.length} shown</div>
                  </div>
                  <ScrollArea className="h-[calc(420px-44px)]">
                    <div className="p-3 space-y-3">
                      {filtered.map((p) => (
                        <PathCard
                          key={p.id}
                          path={p}
                          selected={p.id === selectedPathId}
                          pathType={pathType}
                          isBookmarked={bookmarks.some((b) => b.id === p.id)}
                          onSelect={() => setSelectedPathId(p.id)}
                          onToggleBookmark={() => void toggleBookmark(p)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                    <div className="text-xs font-semibold text-foreground">Step 2 — Claude recommended roles</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      These are constrained to the selected <span className="font-semibold">{pathType ? labelForPathType(pathType) : 'path'}</span>{' '}
                      type. Choose one as your target role to unlock the mindmap.
                    </div>
                  </div>

                  {detailsError ? (
                    <div className="rounded-xl border border-border bg-amber-50 p-4">
                      <div className="text-sm font-semibold text-foreground">Couldn’t load recommendations</div>
                      <div className="mt-1 text-xs text-muted-foreground">{detailsError}</div>
                    </div>
                  ) : null}

                  {loadingDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-[220px] w-full rounded-2xl" />
                      <Skeleton className="h-[220px] w-full rounded-2xl" />
                      <Skeleton className="h-[220px] w-full rounded-2xl" />
                      <Skeleton className="h-[220px] w-full rounded-2xl" />
                    </div>
                  ) : recommendedRoles.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground">
                      {selectedPathId
                        ? 'No role recommendations available for this path yet. Try another path.'
                        : 'Select a path to see Claude recommendations.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {recommendedRoles.map((r, idx) => (
                        <RoleCard
                          key={r.id}
                          role={{
                            id: r.id,
                            title: r.title,
                            role_title: r.title,
                            description: r.description || r.whyThisMatchesPathType || '',
                            tags: (r.confidence != null ? [`Confidence ${r.confidence}%`] : []).filter(Boolean),
                            required_skills: r.required_skills ?? r.skills_required ?? [],
                            key_responsibilities: r.key_responsibilities ?? [],
                          }}
                          personaId={personaId ?? undefined}
                          expanded={idx === 0}
                          onExpandedChange={() => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Step 3 — Mindmap</div>
                    <div className="text-xs text-muted-foreground">
                      {hasTarget ? 'Mindmap is unlocked for your selected target role.' : 'Select a target role to unlock the mindmap.'}
                    </div>
                  </div>

                  {!hasTarget ? (
                    <Button type="button" variant="secondary" disabled>
                      Select target role to continue
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        // Allow re-selection of target role without leaving the page.
                        // (User can pick a different role card and hit "Set as target role".)
                        setTargetRoleId(getTargetRoleSelection().roleId);
                      }}
                    >
                      Refresh target role
                    </Button>
                  )}
                </div>

                {hasTarget ? (
                  <div className="mt-4">
                    <ExploreMindmapView
                      personaId={personaId ?? ''}
                      selectedIndustry={selectedIndustry}
                      selectedSkills={selectedSkills}
                      salaryRange={salaryRange}
                    />
                  </div>
                ) : (
                  <div className="mt-4 h-[200px] rounded-2xl border border-border bg-secondary/30 flex items-center justify-center px-6 text-center">
                    <div className="text-sm text-muted-foreground">
                      Choose a target role from the Claude recommendations above to render the mindmap.
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="h-[520px]">
          <PathDetailPanel
            personaId={personaId}
            pathType={pathType}
            selectedPath={selectedPath}
            bookmarks={bookmarks}
            loadingDetails={loadingDetails}
            detailsError={detailsError}
            onToggleBookmark={(p) => void toggleBookmark(p)}
            onClose={() => setSelectedPathId(null)}
          />
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function resolveInitialMultiversePathType(params: { personaId?: string | null; fromQuery: string | null }): MultiversePathType | null {
  /**
   * Resolve initial Multiverse pathType:
   * - Prefer query param (if valid).
   * - Else fallback to last persisted selection.
   */
  const fromQuery = params.fromQuery ? params.fromQuery.trim() : '';
  if (looksLikePathType(fromQuery)) return fromQuery;
  return getLastMultiversePathType(params.personaId ?? null);
}

// PUBLIC_INTERFACE
export function persistMultiversePathType(params: { personaId?: string | null; pathType: MultiversePathType | null }): void {
  /** Persist path type selection for continuity when user returns to Explore. */
  persistLastMultiversePathType(params.personaId ?? null, params.pathType);
}
