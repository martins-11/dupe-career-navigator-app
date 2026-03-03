"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchBar } from "@/app/components/explore/search-bar";
import { ActiveFilterTags, Filters } from "@/app/components/explore/filters";
import { EmptyState } from "@/app/components/explore/empty-state";
import { RoleCard, SkeletonCard } from "@/app/components/explore/role-card";
import { ROLES } from "@/app/components/explore/roles-data";
import type { Role } from "@/app/components/explore/roles-data";
import { cn } from "@/app/components/ui/utils";

/**
 * Explore Roles page.
 *
 * ZIP-authoritative UI replica:
 * - Hero section before first search
 * - Sticky search+filters container after first search with intersection observer
 * - Autocomplete search with keyboard navigation
 * - Filters (title/industry/skills + salary range slider)
 * - Loading skeletons, empty state
 * - Role cards with hover expansion, selection overlay, staggered enter animation
 */
export default function Page() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 60]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
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

  const filterRoles = useCallback(() => {
    let results = [...ROLES];
    const q = query.toLowerCase().trim();

    if (q) {
      results = results.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.industry.toLowerCase().includes(q) ||
          r.skills.some((s) => s.toLowerCase().includes(q)) ||
          r.description.toLowerCase().includes(q),
      );
    }
    if (selectedTitle) {
      results = results.filter((r) => r.title === selectedTitle);
    }
    if (selectedIndustry) {
      results = results.filter((r) => r.industry === selectedIndustry);
    }
    if (selectedSkills.length > 0) {
      results = results.filter((r) => selectedSkills.some((skill) => r.skills.includes(skill)));
    }
    if (salaryRange[0] !== 0 || salaryRange[1] !== 60) {
      results = results.filter((r) => r.salaryMax >= salaryRange[0] && r.salaryMin <= salaryRange[1]);
    }
    return results;
  }, [query, selectedTitle, selectedIndustry, selectedSkills, salaryRange]);

  function handleSearch() {
    setHasSearched(true);
    setIsLoading(true);
    setResultsKey((k) => k + 1);
    window.setTimeout(() => {
      setFilteredRoles(filterRoles());
      setIsLoading(false);
    }, 600);
  }

  // Auto-filter when dropdown filters change (after initial search)
  useEffect(() => {
    if (!hasSearched) return;
    setIsLoading(true);
    setResultsKey((k) => k + 1);
    const timer = window.setTimeout(() => {
      setFilteredRoles(filterRoles());
      setIsLoading(false);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [selectedTitle, selectedIndustry, selectedSkills, salaryRange, hasSearched, filterRoles]);

  return (
    <main className="min-h-screen bg-background">
      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} className="h-0" />

      {/* Sticky search container */}
      <div
        ref={stickyRef}
        className={cn(
          "transition-all duration-500 ease-out z-40",
          hasSearched ? "sticky top-0" : "",
          hasSearched ? "bg-card/95 backdrop-blur-md shadow-sm border-b py-4" : "",
        )}
      >
        {/* Hero Section */}
        {!hasSearched && (
          <div className="flex flex-col items-center justify-center pt-24 pb-8 px-4 animate-in fade-in duration-700">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center text-balance mb-3 tracking-tight">
              Explore Your Future Role
            </h1>
            <p className="text-base md:text-lg text-muted-foreground text-center max-w-xl text-pretty mb-10">
              Search and filter roles based on job titles, industries, required skills, and salary ranges.
            </p>
          </div>
        )}

        <div
          className={cn(
            "flex flex-col gap-4 px-4 md:px-8 transition-all duration-500",
            hasSearched ? "max-w-6xl mx-auto" : "max-w-3xl mx-auto",
          )}
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

      {/* Results */}
      {hasSearched && (
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredRoles.length === 0 ? (
            <EmptyState />
          ) : (
            <div key={resultsKey} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredRoles.map((role, i) => (
                <RoleCard key={role.id} role={role} index={i} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
