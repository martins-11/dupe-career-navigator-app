'use client';

import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { apiFetch } from '@/lib/apiClient';

function normString(v: unknown): string {
  return String(v ?? '').trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
}

type RoleLike = any;

function roleIdFromRole(role: RoleLike): string {
  return normString(role?.id ?? role?.role_id ?? role?.roleId);
}

function roleTitleFromRole(role: RoleLike): string {
  return normString(role?.title ?? role?.role_title ?? role?.roleTitle);
}

// PUBLIC_INTERFACE
export function ExploreMindmapDetailsPanel(props: {
  selectedRole: RoleLike | null;
  personaId: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  /** Right panel showing drill-down details for the selected Explore mind map node. */
  const { selectedRole, loading, error, onClose } = props;

  const [enriched, setEnriched] = React.useState<RoleLike | null>(null);
  const [enrichLoading, setEnrichLoading] = React.useState(false);
  const [enrichError, setEnrichError] = React.useState<string | null>(null);

  const roleId = selectedRole ? roleIdFromRole(selectedRole) : '';
  const roleTitle = selectedRole ? roleTitleFromRole(selectedRole) : '';

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setEnriched(null);
      setEnrichError(null);

      if (!selectedRole) return;

      // Best-effort: if we can resolve a UUID, fetch /api/roles/by-id/:id for full details.
      const id = roleIdFromRole(selectedRole);
      const title = roleTitleFromRole(selectedRole);

      if (!id && !title) return;

      setEnrichLoading(true);
      try {
        if (id && looksLikeUuid(id)) {
          const r = await apiFetch(`/api/roles/by-id/${encodeURIComponent(id)}`, { method: 'GET', cache: 'no-store' });
          if (!cancelled) setEnriched(r ?? null);
          return;
        }

        // Non-UUID ids: search by title.
        const qs = new URLSearchParams();
        if (title) qs.set('q', title);
        qs.set('limit', '1');

        const res = await apiFetch(`/api/roles/search?${qs.toString()}`, { method: 'GET', cache: 'no-store' });
        const arr = Array.isArray(res) ? res : [];
        if (!cancelled) setEnriched(arr[0] ?? null);
      } catch (e: any) {
        if (!cancelled) setEnrichError('Could not load additional details for this role.');
      } finally {
        if (!cancelled) setEnrichLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [roleId, roleTitle, selectedRole]);

  const effective = enriched ?? selectedRole;

  const title = effective ? roleTitleFromRole(effective) : '';
  const industry = normString(effective?.industry) || '—';
  const description = normString(effective?.description) || '';
  const requiredSkills = safeStringArray(effective?.skills_required ?? effective?.required_skills ?? effective?.requiredSkills ?? []);
  const tags = safeStringArray(effective?.tags);

  const score =
    typeof effective?.finalCompatibilityScore === 'number'
      ? Math.round(effective.finalCompatibilityScore)
      : typeof effective?.compatibilityScore === 'number'
        ? Math.round(effective.compatibilityScore)
        : null;

  return (
    <aside className="h-full rounded-2xl border border-border bg-card text-card-foreground overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Role details</div>
          <div className="mt-1 text-base font-bold text-foreground truncate">
            {title || (loading ? 'Loading…' : 'Select a node')}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={!selectedRole} className="text-muted-foreground">
          Close
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {!selectedRole ? (
          <div className="text-sm leading-relaxed text-muted-foreground">
            Select a recommended role node to view its details.
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Separator />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl border border-red-100 bg-red-50 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Industry</div>
                <div className="mt-1 text-sm font-bold text-foreground">{industry}</div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Compatibility</div>
                <div className="mt-1 text-sm font-bold text-foreground">{score === null ? '—' : `${score}%`}</div>
              </div>
            </div>

            {description ? (
              <div>
                <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground font-bold">Summary</div>
                <div className="mt-2 text-sm text-foreground leading-relaxed">{description}</div>
              </div>
            ) : null}

            <div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground font-bold">Required skills</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredSkills.length > 0 ? (
                  requiredSkills.slice(0, 40).map((s: string) => (
                    <Badge key={s} variant="secondary" className="bg-white/80 border border-border text-foreground">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No skills provided.</div>
                )}
              </div>
            </div>

            {tags.length > 0 ? (
              <>
                <Separator />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground font-bold">Tags</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.slice(0, 40).map((t) => (
                      <Badge key={t} className="bg-white/65 text-foreground border border-border">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {enrichLoading ? (
              <div className="text-xs text-muted-foreground">Loading more details…</div>
            ) : enrichError ? (
              <div className="text-xs text-muted-foreground">{enrichError}</div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
