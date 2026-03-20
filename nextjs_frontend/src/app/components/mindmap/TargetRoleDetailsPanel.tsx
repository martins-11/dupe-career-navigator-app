'use client';

import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';

function normString(v: unknown): string {
  return String(v ?? '').trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function toBulletedSentences(items: string[]): string[] {
  return items
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((s) => {
      const noPrefix = s.replace(/^[-•*]\s+/, '').trim();
      if (!noPrefix) return '';
      return /[.!?]$/.test(noPrefix) ? noPrefix : `${noPrefix}.`;
    })
    .filter(Boolean);
}

function clampPercent(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Best-effort extractor for persona skills stored in localStorage.
 * The persona schema may evolve; keep this defensive.
 */
function extractPersonaSkills(persona: any): string[] {
  const fromTop = safeStringArray(persona?.skills);
  const fromProfile = safeStringArray(persona?.profile?.skills);
  const fromTaxonomy = safeStringArray(persona?.taxonomy?.skills);
  const fromExperience = safeStringArray(persona?.experience?.skills);

  const combined = [...fromTop, ...fromProfile, ...fromTaxonomy, ...fromExperience]
    .map((s) => s.trim())
    .filter(Boolean);

  // de-dupe while preserving order
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const s of combined) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(s);
  }
  return uniq;
}

function normalizeSkillKey(v: string): string {
  return v.trim().toLowerCase();
}

function intersectSkills(params: { personaSkills: string[]; requiredSkills: string[] }): string[] {
  const requiredSet = new Set(params.requiredSkills.map(normalizeSkillKey).filter(Boolean));
  const matched: string[] = [];
  const seen = new Set<string>();

  for (const s of params.personaSkills) {
    const key = normalizeSkillKey(s);
    if (!key) continue;
    if (!requiredSet.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    matched.push(s.trim());
  }

  return matched;
}

export type TargetRoleDetailsPanelProps = {
  role: any | null;
  persona: any | null;
  loading: boolean;
  error: string | null;
  onClose?: () => void;
};

// PUBLIC_INTERFACE
export function TargetRoleDetailsPanel(props: TargetRoleDetailsPanelProps) {
  /** Dedicated panel showing the selected Target Role with the same fields as Explore RoleCard. */
  const { role, persona, loading, error, onClose } = props;

  const title = normString(role?.title ?? role?.role_title) || 'Target role';
  const industry = normString(role?.industry) || '—';

  const salaryRange = normString(
    role?.salary_range ??
      role?.salary_lpa_range ??
      role?.salaryRange ??
      role?.salaryLpaRange ??
      role?.estimated_salary_range ??
      role?.estimatedSalaryRange ??
      ''
  );

  const experienceRange = normString(role?.experience_range ?? role?.experienceRange ?? '');

  const headerMetaLine =
    [industry !== '—' ? industry : '', salaryRange, experienceRange].map((s) => String(s || '').trim()).filter(Boolean).join(' • ') ||
    '—';

  const description = normString(role?.description);

  const report = role?.threeTwoReport && typeof role.threeTwoReport === 'object' ? role.threeTwoReport : {};
  const masteryAreas = safeStringArray(report?.masteryAreas);
  const growthAreas = safeStringArray(report?.growthAreas);

  const score = clampPercent(
    role?.finalCompatibilityScore ?? role?.compatibilityScore ?? report?.compatibilityScore ?? report?.score ?? 0
  );

  const tags = safeStringArray(role?.tags);
  const requiredSkills = safeStringArray(role?.skills_required ?? role?.required_skills ?? []);
  const responsibilities = toBulletedSentences(
    safeStringArray(role?.responsibilities ?? role?.key_responsibilities ?? role?.keyResponsibilities ?? [])
  );

  const personaSkills = React.useMemo(() => extractPersonaSkills(persona), [persona]);
  const matchedPersonaSkills = React.useMemo(
    () => intersectSkills({ personaSkills, requiredSkills }),
    [personaSkills, requiredSkills]
  );

  return (
    <aside className="h-full rounded-2xl border border-border bg-background overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Target role</div>
          <div className="mt-1 text-base font-bold text-foreground truncate">{loading ? 'Loading…' : title}</div>
          <div className="mt-1 text-xs text-muted-foreground font-medium truncate">{headerMetaLine}</div>
        </div>

        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            Close
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {loading ? (
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
        ) : !role ? (
          <div className="text-sm text-slate-500 leading-relaxed">
            No target role is selected yet. Set one from <span className="font-semibold">Explore</span> to see details
            here.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Score + tags */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 10).map((t) => (
                      <span key={t} className="px-2 py-1 bg-secondary rounded-full text-[11px] text-foreground border border-border">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No tags provided.</div>
                )}
              </div>

              <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Compatibility</div>
                <div className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">{score}%</div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">Description</div>
              <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                {description ? description : <span className="italic text-slate-400">No description provided.</span>}
              </div>
            </div>

            {/* Required skills */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">Required skills</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredSkills.length > 0 ? (
                  requiredSkills.slice(0, 40).map((s) => (
                    <Badge key={s} variant="secondary" className="bg-white border border-slate-200 text-slate-700">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No required skills listed.</div>
                )}
              </div>
            </div>

            {/* Persona matching skills */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">Your matching skills</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {matchedPersonaSkills.length > 0 ? (
                  matchedPersonaSkills.slice(0, 40).map((s) => (
                    <Badge key={s} className="bg-accent text-accent-foreground border border-border">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No matching persona skills found for this role.</div>
                )}
              </div>
            </div>

            {/* Responsibilities */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">Key responsibilities</div>
              <ul className="mt-2 space-y-2 list-disc pl-5">
                {responsibilities.slice(0, 12).map((r) => (
                  <li key={r} className="text-sm text-slate-700 leading-relaxed">
                    {r}
                  </li>
                ))}
                {responsibilities.length === 0 ? (
                  <li className="text-sm text-slate-400 italic list-none -ml-5">Not provided for this role.</li>
                ) : null}
              </ul>
            </div>

            {/* 3-2 report */}
            {(masteryAreas.length > 0 || growthAreas.length > 0) ? (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                    <div className="text-[11px] font-bold text-primary uppercase tracking-wide">
                      Mastery ({masteryAreas.length})
                    </div>
                    <ul className="mt-2 space-y-1">
                      {masteryAreas.slice(0, 8).map((s) => (
                        <li key={s} className="text-sm text-slate-700">
                          {s}
                        </li>
                      ))}
                      {masteryAreas.length === 0 ? (
                        <li className="text-sm text-slate-500 italic list-none">No mastery areas provided.</li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                    <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                      Growth ({growthAreas.length})
                    </div>
                    <ul className="mt-2 space-y-1">
                      {growthAreas.slice(0, 8).map((s) => (
                        <li key={s} className="text-sm text-slate-700">
                          {s}
                        </li>
                      ))}
                      {growthAreas.length === 0 ? (
                        <li className="text-sm text-slate-500 italic list-none">No growth areas provided.</li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
