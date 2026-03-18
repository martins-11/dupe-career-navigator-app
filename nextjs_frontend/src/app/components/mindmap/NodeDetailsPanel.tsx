'use client';

import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { MindmapNodeDetailsResponse } from '@/lib/mindmapApi';

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? '').trim()).filter(Boolean);
}

// PUBLIC_INTERFACE
export function NodeDetailsPanel(props: {
  nodeId: string | null;
  details: MindmapNodeDetailsResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  /** Right panel showing selected node detail drill-down content. */
  const { nodeId, details, loading, error, onClose } = props;

  return (
    <aside className="h-full rounded-2xl border border-border bg-background overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Role details</div>
          <div className="mt-1 text-base font-bold text-foreground truncate">
            {details?.title ?? (nodeId ? 'Loading…' : 'Select a node')}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={!nodeId} className="text-muted-foreground">
          Close
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {!nodeId ? (
          <div className="text-sm leading-relaxed" style={{ color: 'var(--mindmap-text-muted)' }}>
            Select a node to view its details.
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
          <div className="p-4 rounded-xl border border-border bg-secondary text-sm text-foreground" role="alert">
            {error}
          </div>
        ) : details ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Average salary</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {details.averageSalary ?? details.average_salary ?? '—'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Transition timeline</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {details.transitionTimeline ?? details.transition_timeline ?? '—'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-slate-600 font-bold">Required skills</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {safeStringArray(details.requiredSkills ?? details.required_skills).length > 0 ? (
                  safeStringArray(details.requiredSkills ?? details.required_skills).slice(0, 40).map((s) => (
                    <Badge key={s} variant="secondary" className="bg-white border border-slate-200 text-slate-700">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No skills provided.</div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-slate-600 font-bold">Skill gap (vs current)</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {safeStringArray(details.skillGap ?? details.skill_gap).length > 0 ? (
                  safeStringArray(details.skillGap ?? details.skill_gap).slice(0, 40).map((s) => (
                    <Badge key={s} className="bg-accent text-accent-foreground border border-border">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No gaps identified (or data unavailable).</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No data.</div>
        )}
      </div>
    </aside>
  );
}
