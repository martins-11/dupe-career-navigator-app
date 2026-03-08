'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '@/app/components/explore/search-bar';
import { ActiveFilterTags, Filters } from '@/app/components/explore/filters';
import { EmptyState } from '@/app/components/explore/empty-state';
import { RoleCard, SkeletonCard } from '@/app/components/explore/role-card';
import type { Role } from '@/app/components/explore/roles-data';
import { cn } from '@/app/components/ui/utils';
import { getRoleIndustries, getRoleJobTitles, getRoleSkills, searchRoles } from '@/lib/rolesApi';
import { getCurrentPersonaId, persistPersonaId } from '@/lib/personaStorage';
import { createLogger } from '@/lib/logger';

type RecommendedRole = {
  role_id: string;
  role_title: string;
  industry: string;
  match_reason?: string;
  estimated_salary_range?: string | null;
};

type InitialRecommendationRole = {
  role_id: string;
  role_title: string;
  industry: string;
  salary_lpa_range?: string;
  experience_range?: string;
  description?: string;
  key_responsibilities?: string[];
  required_skills?: string[];
};

async function fetchInitialRecommendations(personaId: string): Promise<InitialRecommendationRole[]> {
  // Uses Next.js rewrite: /api/* -> backend
  const sp = new URLSearchParams();
  sp.set('personaId', personaId);

  async function fetchFrom(url: string): Promise<any> {
    const res = await fetch(url, { method: 'GET' });

    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const msg = (payload && (payload.message || payload.error)) || `Request failed with status ${res.status}`;
      throw new Error(msg);
    }

    return payload;
  }

  let payload: any = null;
  try {
    payload = await fetchFrom(`/api/recommendations/initial?${sp.toString()}`);
  } catch {
    payload = await fetchFrom(`/api/recommendations/roles?${sp.toString()}`);
  }

  const roles = Array.isArray(payload?.roles) ? payload.roles : [];
  return roles.map((raw: any) => {
    if (raw?.role_id || raw?.role_title) return raw as InitialRecommendationRole;

    const tags = Array.isArray(raw?.tags) ? raw.tags : [];
    return {
      role_id: String(raw?.id || ''),
      role_title: String(raw?.title || 'Recommended Role'),
      industry: String(raw?.industry || tags[0] || 'General'),
      salary_lpa_range: raw?.salary_lpa_range ?? undefined,
      experience_range: raw?.experience_range ?? undefined,
      description: raw?.description ?? undefined,
      key_responsibilities: Array.isArray(raw?.key_responsibilities) ? raw.key_responsibilities : undefined,
      required_skills: Array.isArray(raw?.required_skills) ? raw.required_skills : tags,
    } satisfies InitialRecommendationRole;
  });
}

function safeParseSalaryUsdRangeToLakhs(range?: string | null): { minL: number; maxL: number } {
  /**
   * Backend catalog ranges are usually like "$130k-$210k".
   * UI displays in lakhs (L). We convert USD to INR lakhs using a fixed heuristic (83).
   *
   * NOTE: Avoid reading env vars here; this is client code and should stay deterministic.
   */
  const usdToInr = 83;

  const s = String(range || '').toLowerCase();
  const tokens = s.match(/(\d+(\.\d+)?)(\s*[kmb])?/g) || [];
  const valuesUsd = tokens
    .map((t) => {
      const m = String(t)
        .trim()
        .match(/^(\d+(\.\d+)?)(\s*[kmb])?$/);
      if (!m) return null;
      const num = Number(m[1]);
      if (!Number.isFinite(num)) return null;
      const suffix = (m[3] || '').trim();
      const mult = suffix === 'k' ? 1000 : suffix === 'm' ? 1000000 : suffix === 'b' ? 1000000000 : 1;
      return Math.round(num * mult);
    })
    .filter((v): v is number => Number.isFinite(v as number));

  // Convert USD dollars -> INR lakhs: (usd * usdToInr) / 100000
  const toLakhs = (usd: number) => Math.max(1, Math.round((usd * usdToInr) / 100000));

  if (valuesUsd.length === 0) return { minL: 10, maxL: 30 };
  if (valuesUsd.length === 1) {
    const l = toLakhs(valuesUsd[0]);
    return { minL: Math.max(1, Math.round(l * 0.85)), maxL: Math.max(1, Math.round(l * 1.15)) };
  }

  const min = Math.min(...valuesUsd);
  const max = Math.max(...valuesUsd);
  return { minL: toLakhs(min), maxL: toLakhs(max) };
}

function mapSearchRowToUiRole(row: any, index: number): Role {
  const title = String(row?.role_title ?? row?.title ?? '').trim() || 'Untitled Role';
  const industry = String(row?.industry ?? '').trim() || '—';

  const requiredSkillsRaw = Array.isArray(row?.required_skills)
    ? row.required_skills
    : Array.isArray(row?.skills_required)
      ? row.skills_required
      : [];

  const skills = requiredSkillsRaw.map((s: any) => String(s)).map((s: string) => s.trim()).filter(Boolean);

  const { minL, maxL } = safeParseSalaryUsdRangeToLakhs(row?.salary_range ?? null);

  const description =
    String(row?.description ?? '').trim() ||
    'Explore this role to understand typical responsibilities, required skills, and how it aligns with your profile.';

  const responsibilities = Array.isArray(row?.key_responsibilities)
    ? row.key_responsibilities.map((x: any) => String(x)).map((s: string) => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  const experience = String(row?.experience_range ?? '').trim() || '—';

  const reportRaw = row?.threeTwoReport ?? row?.three_two_report ?? null;
  const masteryAreas = Array.isArray(reportRaw?.masteryAreas) ? reportRaw.masteryAreas : [];
  const growthAreas = Array.isArray(reportRaw?.growthAreas) ? reportRaw.growthAreas : [];

  return {
    id: String(row?.role_id ?? `role-${index}`),
    title,
    industry,
    salaryMin: minL,
    salaryMax: maxL,
    experience,
    skills: skills.slice(0, 5),
    expandedSkills: skills.slice(5, 12),
    description,
    responsibilities,
    careerLevel: 'Recommended',
    threeTwoReport:
      reportRaw && typeof reportRaw === 'object'
        ? {
            ...reportRaw,
            mastery: masteryAreas.length,
            growth: growthAreas.length,
          }
        : null,
  };
}

function mapRecommendationToUiRole(rec: RecommendedRole, index: number): Role {
  const { minL, maxL } = safeParseSalaryUsdRangeToLakhs(rec.estimated_salary_range ?? null);

  const description = rec.match_reason
    ? `${rec.match_reason} You can explore this role and refine filters to find closer matches.`
    : 'Recommended based on your Final Persona.';

  return {
    id: String(rec.role_id ?? `rec-${index}`),
    title: String(rec.role_title || '').trim() || 'Untitled Role',
    industry: String(rec.industry || '').trim() || '—',
    salaryMin: minL,
    salaryMax: maxL,
    experience: '—',
    skills: [],
    expandedSkills: [],
    description,
    responsibilities: [],
    careerLevel: 'Suggested',
  };
}

function mapInitialRecommendationToUiRole(rec: InitialRecommendationRole, index: number): Role {
  // Backend returns salary_lpa_range already in LPA (India). We keep existing UI helper which expects USD;
  // if we can't parse, we fall back to a reasonable placeholder range.
  const { minL, maxL } = safeParseSalaryUsdRangeToLakhs(rec.salary_lpa_range ?? null);

  const description =
    String(rec.description || '').trim() ||
    'Recommended based on your Final Persona. Explore this role to understand fit, skills, and responsibilities.';

  const responsibilities = Array.isArray(rec.key_responsibilities)
    ? rec.key_responsibilities.map((x) => String(x)).map((s) => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  const skills = Array.isArray(rec.required_skills)
    ? rec.required_skills.map((x) => String(x)).map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    id: String(rec.role_id ?? `init-${index}`),
    title: String(rec.role_title || '').trim() || 'Untitled Role',
    industry: String(rec.industry || '').trim() || '—',
    salaryMin: minL,
    salaryMax: maxL,
    experience: String(rec.experience_range || '').trim() || '—',
    skills: skills.slice(0, 5),
    expandedSkills: skills.slice(5, 12),
    description,
    responsibilities,
    // IMPORTANT: these are persona-based recommendations (not generic suggestions).
    careerLevel: 'Recommended',
    threeTwoReport: null,
  };
}

// PUBLIC_INTERFACE
export default function ExploreClient() {
  /** Client implementation for /explore (uses useSearchParams and other client-only hooks). */
  const log = useMemo(() => createLogger('explore'), []);
  const searchParams = useSearchParams();

  const personaIdFromUrl = useMemo(() => {
    const raw = searchParams?.get('personaId');
    const v = typeof raw === 'string' ? raw.trim() : '';
    return v.length > 0 ? v : null;
  }, [searchParams]);

  const canonicalPersonaId = useMemo(() => {
    return personaIdFromUrl || getCurrentPersonaId();
  }, [personaIdFromUrl]);

  useEffect(() => {
    if (personaIdFromUrl) persistPersonaId(personaIdFromUrl);
  }, [personaIdFromUrl]);

  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 60]);

  const [industryOptions, setIndustryOptions] = useState<string[]>([]);
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [jobTitleOptions, setJobTitleOptions] = useState<string[] | null>(null);
  const [showJobTitleFilter, setShowJobTitleFilter] = useState(false);

  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultsKey, setResultsKey] = useState(0);

  const [suggestedRoles, setSuggestedRoles] = useState<Role[]>([]);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
  const [suggestedSource, setSuggestedSource] = useState<'initial' | 'fallback' | 'none'>('none');

  const stickyRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting && hasSearched);
      },
      { threshold: 0 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasSearched]);

  const fetchFilterOptions = useCallback(async () => {
    setIsLoadingFilterOptions(true);
    setFilterOptionsError(null);

    try {
      const [industries, skills] = await Promise.all([getRoleIndustries(), getRoleSkills()]);

      setIndustryOptions(Array.isArray(industries) ? industries : []);
      setSkillsOptions(Array.isArray(skills) ? skills : []);

      try {
        const titles = await getRoleJobTitles();
        setJobTitleOptions(titles);
        setShowJobTitleFilter(true);
      } catch {
        setJobTitleOptions(null);
        setShowJobTitleFilter(false);
        setSelectedTitle('');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load filter options.';
      setIndustryOptions([]);
      setSkillsOptions([]);
      setJobTitleOptions(null);
      setShowJobTitleFilter(false);
      setSelectedTitle('');
      setFilterOptionsError(msg);
    } finally {
      setIsLoadingFilterOptions(false);
    }
  }, []);

  const fetchSuggestedRoles = useCallback(async () => {
    setIsLoadingSuggested(true);
    setSuggestedError(null);

    try {
      const personaId = canonicalPersonaId || '';

      log.info(
        'fetchSuggestedRoles personaId',
        {
          personaId: personaId || null,
          source: personaIdFromUrl ? 'url' : canonicalPersonaId ? 'localStorage' : 'none',
        },
        { throttleMs: 10000, key: 'suggestedRolesPersonaId' }
      );

      let suggested: Role[] = [];
      let nextSource: 'initial' | 'fallback' | 'none' = 'none';

      // Primary: persona-based initial recommendations.
      // This endpoint is intended to be live (Bedrock/O*NET). If it errors, we should not pretend
      // we loaded "recommended roles"; we fall back to catalog suggestions.
      if (personaId) {
        try {
          const recs = await fetchInitialRecommendations(personaId);
          suggested = (Array.isArray(recs) ? recs : []).map(mapInitialRecommendationToUiRole);
          if (suggested.length > 0) nextSource = 'initial';
        } catch {
          suggested = [];
        }
      }

      // Fallback: use roles search (optionally persona-scored if backend supports personaId)
      if (suggested.length === 0) {
        const rows = await searchRoles({ q: '', limit: 6, personaId: personaId || undefined });
        const mapped = (Array.isArray(rows) ? rows : []).map(mapSearchRowToUiRole);

        mapped.sort((a, b) => {
          const aScore =
            typeof (a as any)?.threeTwoReport?.compatibilityScore === 'number'
              ? (a as any).threeTwoReport.compatibilityScore
              : typeof (a as any)?.threeTwoReport?.score === 'number'
                ? (a as any).threeTwoReport.score
                : -Infinity;

          const bScore =
            typeof (b as any)?.threeTwoReport?.compatibilityScore === 'number'
              ? (b as any).threeTwoReport.compatibilityScore
              : typeof (b as any)?.threeTwoReport?.score === 'number'
                ? (b as any).threeTwoReport.score
                : -Infinity;

          return bScore - aScore;
        });

        suggested = mapped.slice(0, 4);
        nextSource = suggested.length > 0 ? 'fallback' : 'none';
      }

      setSuggestedSource(nextSource);
      setSuggestedRoles(suggested.slice(0, 4));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load role suggestions.';
      setSuggestedSource('none');
      setSuggestedRoles([]);
      setSuggestedError(msg);
    } finally {
      setIsLoadingSuggested(false);
    }
  }, [canonicalPersonaId, personaIdFromUrl]);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResultsKey((k) => k + 1);

    try {
      const personaId = canonicalPersonaId || '';

      log.info(
        'fetchRoles personaId',
        {
          personaId: personaId || null,
          source: personaIdFromUrl ? 'url' : canonicalPersonaId ? 'localStorage' : 'none',
        },
        { throttleMs: 10000, key: 'rolesPersonaId' }
      );

      const data = await searchRoles({
        q: query.trim() || undefined,
        industry: selectedIndustry.trim() || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        min_salary: salaryRange[0],
        max_salary: salaryRange[1],
        limit: 50,
        personaId: personaId || undefined,
      });

      const mapped = (Array.isArray(data) ? data : []).map(mapSearchRowToUiRole);

      mapped.sort((a, b) => {
        const aScore =
          typeof (a as any)?.threeTwoReport?.compatibilityScore === 'number'
            ? (a as any).threeTwoReport.compatibilityScore
            : typeof (a as any)?.threeTwoReport?.score === 'number'
              ? (a as any).threeTwoReport.score
              : -Infinity;

        const bScore =
          typeof (b as any)?.threeTwoReport?.compatibilityScore === 'number'
            ? (b as any).threeTwoReport.compatibilityScore
            : typeof (b as any)?.threeTwoReport?.score === 'number'
              ? (b as any).threeTwoReport.score
              : -Infinity;

        return bScore - aScore;
      });

      setRoles(mapped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load roles.';
      setRoles([]);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [canonicalPersonaId, personaIdFromUrl, query, selectedIndustry, selectedSkills, salaryRange]);

  const resetAll = useCallback(() => {
    setQuery('');
    setHasSearched(false);

    setSelectedTitle('');
    setSelectedIndustry('');
    setSelectedSkills([]);
    setSalaryRange([0, 60]);

    setRoles([]);
    setError(null);

    void fetchSuggestedRoles();
  }, [fetchSuggestedRoles]);

  function handleSearch() {
    setHasSearched(true);

    if (industryOptions.length === 0 && skillsOptions.length === 0 && !isLoadingFilterOptions) {
      void fetchFilterOptions();
    }

    if (suggestedRoles.length === 0 && !isLoadingSuggested) {
      void fetchSuggestedRoles();
    }

    void fetchRoles();
  }

  useEffect(() => {
    void fetchSuggestedRoles();

    if (!isLoadingFilterOptions && industryOptions.length === 0 && skillsOptions.length === 0) {
      void fetchFilterOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canonicalPersonaId) return;
    void fetchSuggestedRoles();
  }, [canonicalPersonaId, fetchSuggestedRoles]);

  useEffect(() => {
    if (!hasSearched) return;

    const timer = window.setTimeout(() => {
      void fetchRoles();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [selectedTitle, selectedIndustry, selectedSkills, salaryRange, hasSearched, fetchRoles]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div ref={sentinelRef} className="h-0" />

      <div
        ref={stickyRef}
        className={cn('transition-all duration-500 ease-out z-40', hasSearched ? 'sticky top-0' : '')}
        style={{
          backgroundColor: hasSearched ? 'rgba(255,255,255,0.92)' : 'transparent',
          backdropFilter: hasSearched ? 'blur(10px)' : undefined,
          WebkitBackdropFilter: hasSearched ? 'blur(10px)' : undefined,
          borderBottom: hasSearched ? '1px solid #E6EEF2' : 'none',
          boxShadow: hasSearched ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
          paddingTop: hasSearched ? '16px' : 0,
          paddingBottom: hasSearched ? '16px' : 0,
        }}
      >
        {!hasSearched && (
          <div
            className="flex flex-col items-center justify-center pt-24 pb-8 px-4 animate-in fade-in duration-700"
            style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
          >
            <h1
              className="text-4xl md:text-5xl font-bold text-center text-balance mb-3 tracking-tight"
              style={{ color: '#17A6A6' }}
            >
              Explore Your Future Role
            </h1>
            <p className="text-base md:text-lg text-center max-w-xl text-pretty mb-10" style={{ color: '#4B6572' }}>
              Search and filter roles based on job titles, industries, required skills, and salary ranges.
            </p>
          </div>
        )}

        <div
          className={cn(
            'flex flex-col gap-4 px-4 md:px-8 transition-all duration-500',
            hasSearched ? 'max-w-6xl mx-auto' : 'max-w-3xl mx-auto'
          )}
          style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
        >
          <SearchBar query={query} onQueryChange={setQuery} onSearch={handleSearch} isSticky={hasSearched && isSticky} />

          {hasSearched && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col gap-3">
              <Filters
                selectedTitle={selectedTitle}
                onTitleChange={setSelectedTitle}
                selectedIndustry={selectedIndustry}
                onIndustryChange={setSelectedIndustry}
                selectedSkills={selectedSkills}
                onSkillsChange={setSelectedSkills}
                salaryRange={salaryRange}
                onSalaryChange={setSalaryRange}
                isCompact={isSticky}
                industryOptions={industryOptions}
                skillsOptions={skillsOptions}
                jobTitleOptions={jobTitleOptions}
                isLoadingOptions={isLoadingFilterOptions}
                optionsError={filterOptionsError}
                showJobTitleFilter={showJobTitleFilter}
              />
              <ActiveFilterTags
                selectedTitle={selectedTitle}
                onTitleChange={setSelectedTitle}
                selectedIndustry={selectedIndustry}
                onIndustryChange={setSelectedIndustry}
                selectedSkills={selectedSkills}
                onSkillsChange={setSelectedSkills}
                salaryRange={salaryRange}
                onSalaryChange={setSalaryRange}
              />
            </div>
          )}
        </div>
      </div>

      <section
        className={cn('max-w-6xl mx-auto px-4 md:px-8 py-8', hasSearched ? '' : 'pt-10')}
        style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
      >
        <div className="mb-8">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-strong)' }}>
                {canonicalPersonaId && suggestedSource === 'initial' ? 'Recommended Roles for you' : 'Suggested Roles'}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {canonicalPersonaId && suggestedSource === 'initial'
                  ? 'Based on your finalized persona (initial recommendations).'
                  : 'Suggestions to help you get started (persona-aware when available).'}
              </p>
            </div>

            <button
              onClick={() => void fetchSuggestedRoles()}
              className="text-xs font-semibold px-3 py-2 cursor-pointer"
              style={{
                borderRadius: 10,
                background: 'rgba(23,166,166,0.06)',
                border: '1px solid rgba(23,166,166,0.18)',
                color: 'var(--text-body)',
              }}
            >
              Refresh
            </button>
          </div>

          {isLoadingSuggested ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <SkeletonCard key={`sugg-skel-${i}`} />
              ))}
            </div>
          ) : suggestedError ? (
            <div
              className="text-xs rounded-xl px-4 py-3"
              style={{
                background: 'rgba(255, 0, 0, 0.03)',
                border: '1px solid rgba(255, 0, 0, 0.12)',
                color: 'var(--text-body)',
              }}
            >
              Couldn’t load {canonicalPersonaId ? 'recommended roles' : 'suggested roles'}: {suggestedError}
            </div>
          ) : suggestedRoles.length === 0 ? (
            <div
              className="text-xs rounded-xl px-4 py-3"
              style={{
                background: 'rgba(23,166,166,0.06)',
                border: '1px solid rgba(23,166,166,0.18)',
                color: 'var(--text-body)',
              }}
            >
              {canonicalPersonaId
                ? 'No recommendations available yet. Try refreshing, or revisit persona finalization.'
                : 'No suggestions yet. Finalize a persona to see recommendations here.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestedRoles.map((role, i) => (
                <RoleCard key={`suggested-${role.id}`} role={role} index={i} />
              ))}
            </div>
          )}
        </div>

        {hasSearched ? (
          isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>
                Couldn’t load roles
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-body)' }}>
                {error}
              </p>
              <button
                onClick={() => {
                  void fetchFilterOptions();
                  void fetchRoles();
                }}
                className="text-sm font-semibold px-4 py-2 cursor-pointer"
                style={{ borderRadius: 12, background: 'var(--zip-teal)', color: '#fff' }}
              >
                Retry
              </button>
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                If this persists, check that <code>NEXT_PUBLIC_BACKEND_URL</code> (or <code>NEXT_PUBLIC_API_BASE</code>)
                is set and the backend is reachable.
              </p>
            </div>
          ) : roles.length === 0 ? (
            <EmptyState onResetAll={resetAll} />
          ) : (
            <div key={resultsKey} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role, i) => (
                <RoleCard key={role.id} role={role} index={i} />
              ))}
            </div>
          )
        ) : null}
      </section>
    </main>
  );
}
