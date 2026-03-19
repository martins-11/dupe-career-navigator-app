'use client';

import * as React from 'react';
import { Bookmark, BookmarkCheck, Filter, GitBranch, Route } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ScrollArea } from '@/app/components/ui/scroll-area';

import { apiFetch } from '@/lib/apiClient';
import {
  addMultiverseBookmark,
  getLastMultiversePathType,
  isMultiverseBookmarked,
  listMultiverseBookmarks,
  persistLastMultiversePathType,
  removeMultiverseBookmark,
  type MultiversePathBookmark,
  type MultiversePathType,
} from '@/lib/multiverseBookmarksStorage';

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

  // Backend placeholder paths do not include industry metadata yet.
  // Best-effort: treat selectedIndustry as a keyword match across title/steps.
  const ind = selectedIndustry.trim().toLowerCase();
  if (ind) {
    const hay = `${path.title} ${path.steps.join(' ')}`.toLowerCase();
    if (!hay.includes(ind)) return false;
  }

  // Best-effort: treat selectedSkills as keywords too (until backend emits skill tags per path).
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
    <button
      type="button"
      onClick={onSelect}
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
    </button>
  );
}

function PathDetailPanel(props: {
  personaId: string | null;
  pathType: MultiversePathType | null;
  selectedPath: CareerPath | null;
  bookmarks: MultiversePathBookmark[];
  onToggleBookmark: (path: CareerPath) => void;
  onClose: () => void;
}) {
  const { selectedPath, bookmarks, onToggleBookmark, onClose, pathType } = props;

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
              <div className="mt-2 space-y-2">
                {selectedPath.steps.map((s, idx) => (
                  <div key={`${selectedPath.id}-step-${idx}`} className="rounded-xl border border-border bg-background p-3">
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Step {idx + 1}</div>
                    <div className="mt-1 text-sm font-bold text-foreground">{s}</div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground font-bold">Bookmarks</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {bookmarks.length === 0 ? 'No bookmarks yet.' : `Saved ${bookmarks.length} path${bookmarks.length === 1 ? '' : 's'}.`}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
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
   * Multiverse Explorer:
   * - Loads multiverse paths from backend placeholder endpoint.
   * - Applies lightweight client-side filtering until backend supports richer path metadata.
   * - Supports drill-down and bookmarking.
   */
  const { personaId, pathType, selectedIndustry, selectedSkills, titleQuery } = props;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [paths, setPaths] = React.useState<CareerPath[]>([]);
  const [selectedPathId, setSelectedPathId] = React.useState<string | null>(null);

  const [bookmarks, setBookmarks] = React.useState<MultiversePathBookmark[]>(() => listMultiverseBookmarks(personaId));

  React.useEffect(() => {
    setBookmarks(listMultiverseBookmarks(personaId));
  }, [personaId]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res: any = await apiFetch('/api/paths/multiverse', { method: 'GET', cache: 'no-store' });
        const arr = Array.isArray(res?.paths) ? res.paths : Array.isArray(res) ? res : [];
        const normalized: CareerPath[] = arr
          .map((p: any, idx: number) => {
            const id = normString(p?.id) || `path-${idx}`;
            const title = normString(p?.title) || `Path ${idx + 1}`;
            const steps = safeStringArray(p?.steps);
            return { id, title, steps };
          })
          .filter((p: CareerPath) => p.steps.length > 0);

        if (cancelled) return;
        setPaths(normalized);

        // Keep selection stable if possible.
        if (selectedPathId && normalized.some((p) => p.id === selectedPathId)) return;
        setSelectedPathId(normalized[0]?.id ?? null);
      } catch (e) {
        if (cancelled) return;
        setPaths([]);
        setSelectedPathId(null);
        setError('Multiverse paths are unavailable right now. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function toggleBookmark(path: CareerPath) {
    const already = isMultiverseBookmarked({ personaId, bookmarkId: path.id });
    if (already) {
      const next = removeMultiverseBookmark({ personaId, bookmarkId: path.id });
      setBookmarks(next);
      return;
    }

    const next = addMultiverseBookmark({
      personaId,
      bookmark: { id: path.id, title: path.title, steps: path.steps, pathType: pathType ?? undefined },
    });
    setBookmarks(next);
  }

  return (
    <div className="space-y-6">
      <Card className="border-violet-200 bg-violet-50/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet-700" />
            Multiverse Explorer
          </CardTitle>
          <CardDescription>Explore branching career paths, drill into steps, and bookmark the ones you want to keep.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3.5 w-3.5" />
            Filters active
          </Badge>
          {pathType ? <Badge variant="secondary">{labelForPathType(pathType)} path</Badge> : <Badge variant="secondary">All path types</Badge>}
          <Badge variant="secondary">{filtered.length} path{filtered.length === 1 ? '' : 's'}</Badge>
          {bookmarks.length > 0 ? (
            <Badge variant="secondary" className="gap-1">
              <BookmarkCheck className="h-3.5 w-3.5" />
              {bookmarks.length} bookmarked
            </Badge>
          ) : null}
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
            <Card className="h-[520px] rounded-2xl border border-border bg-background overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Paths</div>
                <div className="text-xs text-muted-foreground">Click a path to view details</div>
              </div>

              <ScrollArea className="h-[calc(520px-56px)]">
                <div className="p-4 space-y-3">
                  {filtered.map((p) => (
                    <PathCard
                      key={p.id}
                      path={p}
                      selected={p.id === selectedPathId}
                      pathType={pathType}
                      isBookmarked={bookmarks.some((b) => b.id === p.id)}
                      onSelect={() => setSelectedPathId(p.id)}
                      onToggleBookmark={() => toggleBookmark(p)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>

        <div className="h-[520px]">
          <PathDetailPanel
            personaId={personaId}
            pathType={pathType}
            selectedPath={selectedPath}
            bookmarks={bookmarks}
            onToggleBookmark={toggleBookmark}
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
