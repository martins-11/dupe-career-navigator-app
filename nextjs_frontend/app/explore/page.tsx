"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchBar } from "@/app/components/explore/search-bar";
import { ActiveFilterTags, Filters } from "@/app/components/explore/filters";
import { EmptyState } from "@/app/components/explore/empty-state";
import { RoleCard, SkeletonCard } from "@/app/components/explore/role-card";
import type { Role } from "@/app/components/explore/roles-data";
import { cn } from "@/app/components/ui/utils";
import { getRoleIndustries, getRoleJobTitles, getRoleSkills, searchRoles } from "@/lib/rolesApi";

/**
 * Explore Roles page.
 *
 * Backend integration:
 * - Uses GET /api/roles/search for role search + filters.
 *
 * Missing backend features (guarded in UI):
 * - Dedicated autocomplete endpoint (approximated by search endpoint)
 * - Role details endpoint
 * - Save selected role endpoint
 */
export default function Page() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
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
      { threshold: 0 },
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
        setSelectedTitle(""); // ensure no stale value
      }

      // If backend returns empty arrays, that's still a valid state; UI will show "No options available".
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load filter options.";
      setIndustryOptions([]);
      setSkillsOptions([]);
      setJobTitleOptions(null);
      setShowJobTitleFilter(false);
      setSelectedTitle("");
      setFilterOptionsError(msg);
    } finally {
      setIsLoadingFilterOptions(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResultsKey((k) => k + 1);

    try {
      /**
       * Backend contract:
       * - GET /api/roles/search?q=&industry=&skills=comma,separated&min_salary=&max_salary=
       *
       * Note: we only send structured filters; no free-text "title" param is invented.
       */
      const data = await searchRoles({
        q: query.trim() || undefined,
        industry: selectedIndustry.trim() || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        min_salary: salaryRange[0],
        max_salary: salaryRange[1],
        limit: 50,
        // user_id can be added once the frontend has a user identity concept wired up.
      });

      setRoles(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load roles.";
      setRoles([]);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedIndustry, selectedSkills, salaryRange]);

  function handleSearch() {
    setHasSearched(true);

    // Load structured filter options on first search (keeps initial hero clean and avoids unnecessary calls).
    // If the backend is down, the filter UI will show an inline error state.
    if (industryOptions.length === 0 && skillsOptions.length === 0 && !isLoadingFilterOptions) {
      void fetchFilterOptions();
    }

    void fetchRoles();
  }

  // Re-fetch when filters change (after initial search)
  useEffect(() => {
    if (!hasSearched) return;

    // Small debounce to avoid a request on every keystroke in filters
    const timer = window.setTimeout(() => {
      void fetchRoles();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [selectedTitle, selectedIndustry, selectedSkills, salaryRange, hasSearched, fetchRoles]);

  // Job Title is now a structured dropdown (optional, backend-driven).
  // We intentionally do NOT fold it into the free-text query; that would reintroduce free-text coupling.

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg-canvas)" }}>
      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} className="h-0" />

      {/* Sticky search container */}
      <div
        ref={stickyRef}
        className={cn("transition-all duration-500 ease-out z-40", hasSearched ? "sticky top-0" : "")}
        style={{
          backgroundColor: hasSearched ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: hasSearched ? "blur(10px)" : undefined,
          WebkitBackdropFilter: hasSearched ? "blur(10px)" : undefined,
          borderBottom: hasSearched ? "1px solid #E6EEF2" : "none",
          boxShadow: hasSearched ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
          paddingTop: hasSearched ? "16px" : 0,
          paddingBottom: hasSearched ? "16px" : 0,
        }}
      >
        {/* Hero Section */}
        {!hasSearched && (
          <div
            className="flex flex-col items-center justify-center pt-24 pb-8 px-4 animate-in fade-in duration-700"
            style={{ fontFamily: "Helvetica Neue, Arial, sans-serif" }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-center text-balance mb-3 tracking-tight" style={{ color: "#17A6A6" }}>
              Explore Your Future Role
            </h1>
            <p className="text-base md:text-lg text-center max-w-xl text-pretty mb-10" style={{ color: "#4B6572" }}>
              Search and filter roles based on job titles, industries, required skills, and salary ranges.
            </p>
          </div>
        )}

        <div
          className={cn("flex flex-col gap-4 px-4 md:px-8 transition-all duration-500", hasSearched ? "max-w-6xl mx-auto" : "max-w-3xl mx-auto")}
          style={{ fontFamily: "Helvetica Neue, Arial, sans-serif" }}
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

              {/* Clear messaging about missing backend capabilities */}
              <div
                className="text-xs rounded-xl px-4 py-3"
                style={{
                  background: "rgba(23,166,166,0.06)",
                  border: "1px solid rgba(23,166,166,0.18)",
                  color: "var(--text-body)",
                }}
              >
                Note: Autocomplete is approximated via role search. Role details and “Save selected role” are not yet supported by the backend API, so selection is local-only.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-8" style={{ fontFamily: "Helvetica Neue, Arial, sans-serif" }}>
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
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-strong)" }}>
                Couldn’t load roles
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-body)" }}>
                {error}
              </p>
              <button
                onClick={() => {
                  void fetchFilterOptions();
                  void fetchRoles();
                }}
                className="text-sm font-semibold px-4 py-2 cursor-pointer"
                style={{ borderRadius: 12, background: "var(--zip-teal)", color: "#fff" }}
              >
                Retry
              </button>
              <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                If this persists, check that <code>NEXT_PUBLIC_BACKEND_URL</code> (or <code>NEXT_PUBLIC_API_BASE</code>) is set and the backend is reachable.
              </p>
            </div>
          ) : roles.length === 0 ? (
            <EmptyState />
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
