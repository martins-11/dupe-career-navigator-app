'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchBar } from '@/app/components/explore/search-bar';
import { ActiveFilterTags, Filters } from '@/app/components/explore/filters';
import { EmptyState } from '@/app/components/explore/empty-state';
import { RoleCard, SkeletonCard } from '@/app/components/explore/role-card';
import type { Role } from '@/app/components/explore/roles-data';
import { cn } from '@/app/components/ui/utils';
import { getRoleIndustries, getRoleJobTitles, getRoleSkills, searchRoles } from '@/lib/rolesApi';

type RecommendedRole = {
  role_id: string;
  role_title: string;
  industry: string;
  match_reason?: string;
  estimated_salary_range?: string | null;
};

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function safeParseSalaryUsdRangeToLakhs(range?: string | null): { minL: number; maxL: number } {
  /**
   * Backend catalog ranges are usually like "$130k-$210k".
   * UI displays in lakhs (L). We convert USD to INR lakhs using env USD_TO_INR (default 83).
   *
   * NOTE: We deliberately avoid reading env vars here to prevent any `process` usage.
   * If conversion needs to be configured, prefer a backend-driven field in a future iteration.
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
  /**
   * Backend /api/roles/search (Day 3) now returns Bedrock-generated "market roles" with:
   * - description (2 sentences)
   * - key_responsibilities (exactly 3)
   * - experience_range (e.g., "3-5 years")
   * - salary_range
   * - required_skills (5-8)
   *
   * It also still returns compatibility fields:
   * - threeTwoReport.score (computed)
   * - threeTwoReport.masteryAreas / growthAreas
   */
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

  // Carry through 3/2 report if present.
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
            // Ensure RoleCard pills still work:
            mastery: masteryAreas.length,
            growth: growthAreas.length,
          }
        : null,
  };
}

function mapRecommendationToUiRole(rec: RecommendedRole, index: number): Role {
  const { minL, maxL } = safeParseSalaryUsdRangeToLakhs(rec.estimated_salary_range ?? null);

  // Use match_reason as a lightweight description to make the Suggested Roles section feel purposeful.
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

/**
 * Explore Roles page.
 *
 * Backend integration:
 * - Uses GET /api/roles/search for role search + filters.
 * - Uses GET /api/roles/autocomplete for SearchBar suggestions.
 * - Uses GET /api/recommendations/roles for "Suggested Roles" after persona finalization.
 */
export default function Page() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 60]);

  // Structured filter options (backend-driven)
  const [industryOptions, setIndustryOptions] = useState<string[]>([]);
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [jobTitleOptions, setJobTitleOptions] = useState<string[] | null>(null);
  const [showJobTitleFilter, setShowJobTitleFilter] = useState(false);

  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultsKey, setResultsKey] = useState(0);

  // Suggested roles
  const [suggestedRoles, setSuggestedRoles] = useState<Role[]>([]);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);

  const stickyRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  // Intersection observer for sticky detection
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
    /**
     * Load distinct filter values from the backend.
     *
     * Required endpoints:
     * - GET /api/roles/industries
     * - GET /api/roles/skills
     *
     * Optional endpoint:
     * - GET /api/roles/job-titles
     */
    setIsLoadingFilterOptions(true);
    setFilterOptionsError(null);

    try {
      const [industries, skills] = await Promise.all([getRoleIndustries(), getRoleSkills()]);

      setIndustryOptions(industries);
      setSkillsOptions(skills);

      // Optional endpoint: if it errors (404 etc), we simply hide the field.
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
    /**
     * Fetch Suggested Roles using backend-scored data (NO static placeholders).
     *
     * We intentionally derive Suggested Roles from the same scored role-search endpoint
     * that powers main results:
     * - GET /api/roles/search?q=&limit=
     *
     * Rationale:
     * - Guarantees Suggested Roles include `threeTwoReport` (score + mastery/growth areas)
     *   for the 3/2 visuals.
     * - Ensures sorting by highest compatibility score (backend + defensive client sort).
     *
     * Note:
     * - We previously used GET /api/recommendations/roles, but that response does not
     *   guarantee `threeTwoReport`. This change aligns with the Day 3 requirement:
     *   Suggested Roles + search results must be fed by dynamic scored data.
     */
    setIsLoadingSuggested(true);
    setSuggestedError(null);

    try {
      // Use a broad search (empty q) and take the top N scored results.
      // IMPORTANT: persona-driven wiring
      // - When personaId is present in localStorage (set after orchestration run-all),
      //   pass it to the backend so it loads the *finalized persona* as the source of truth
      //   for scoring + mastery/growth tags.
      const personaId =
        typeof window !== 'undefined' ? String(window.localStorage.getItem('careerNavigator.personaId') || '').trim() : '';

      const rows = await searchRoles({ limit: 6, personaId: personaId || undefined });

      const mapped = (Array.isArray(rows) ? rows : []).map(mapSearchRowToUiRole);

      // Defensive sort in case backend changes (still expected backend sort desc).
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

      setSuggestedRoles(mapped.slice(0, 4));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load Suggested Roles.';
      setSuggestedRoles([]);
      setSuggestedError(msg);
    } finally {
      setIsLoadingSuggested(false);
    }
  }, [searchRoles]);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResultsKey((k) => k + 1);

    try {
      /**
       * Backend contract:
       * - GET /api/roles/search?q=&industry=&skills=comma,separated&min_salary=&max_salary=
       *
       * Note: min_salary/max_salary are UI slider units (lakhs). Backend converts to align with USD catalog.
       */
      const personaId =
        typeof window !== 'undefined' ? String(window.localStorage.getItem('careerNavigator.personaId') || '').trim() : '';

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

      // Defensive client-side sort: highest compatibility first.
      // Backend is expected to already return sorted results, but this ensures the UX remains correct
      // if the backend response order changes.
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
  }, [query, selectedIndustry, selectedSkills, salaryRange]);

  const resetAll = useCallback(() => {
    setQuery('');
    setHasSearched(false);

    setSelectedTitle('');
    setSelectedIndustry('');
    setSelectedSkills([]);
    setSalaryRange([0, 60]);

    setRoles([]);
    setError(null);

    // Keep suggested roles visible; they come from the finalized persona and are useful in empty state.
    // Also refresh suggestions on reset (best effort) to "refresh the list" as requested.
    void fetchSuggestedRoles();
  }, [fetchSuggestedRoles]);

  function handleSearch() {
    setHasSearched(true);

    // Load structured filter options on first search
    if (industryOptions.length === 0 && skillsOptions.length === 0 && !isLoadingFilterOptions) {
      void fetchFilterOptions();
    }

    // On first entry into explore/search mode, fetch suggestions too.
    if (suggestedRoles.length === 0 && !isLoadingSuggested) {
      void fetchSuggestedRoles();
    }

    void fetchRoles();
  }

  // Re-fetch when filters change (after initial search)
  useEffect(() => {
    if (!hasSearched) return;

    const timer = window.setTimeout(() => {
      void fetchRoles();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [selectedTitle, selectedIndustry, selectedSkills, salaryRange, hasSearched, fetchRoles]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} className="h-0" />

      {/* Sticky search container */}
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
        {/* Hero Section */}
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

      {/* Suggested Roles + Results */}
      {hasSearched && (
        <section
          className="max-w-6xl mx-auto px-4 md:px-8 py-8"
          style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
        >
          {/* Suggested Roles */}
          <div className="mb-8">
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-strong)' }}>
                  Suggested Roles
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Powered by your finalized persona (recommendations).
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
                Couldn’t load Suggested Roles: {suggestedError}
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
                No suggestions yet. Finalize a persona to see recommendations here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedRoles.map((role, i) => (
                  <RoleCard key={`suggested-${role.id}`} role={role} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
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
          )}
        </section>
      )}
    </main>
  );
}
