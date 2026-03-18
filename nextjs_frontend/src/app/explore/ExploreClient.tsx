"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Component Imports
import { RecommendationGrid } from "../components/recommendations/recommendation-grid";
import { ExploreMindmapView } from "../components/explore/ExploreMindmapView";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";

import { Filters, ActiveFilterTags } from "../components/explore/filters";
import { SearchBar } from "../components/explore/search-bar";
import RoleCard from "../components/explore/role-card";
import { EmptyState } from "../components/explore/empty-state";
// Utility & Storage Imports
import { loadPersonaId, persistPersonaId } from "@/lib/personaStorage";
import { apiFetch } from "@/lib/apiClient";
import { getExploreViewMode, persistExploreViewMode } from "@/lib/exploreMindmapViewStateStorage";

function normString(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function parseSalaryRangeToLakhs(role: any): { min: number | null; max: number | null } {
  const raw = normString(role?.salary_range ?? role?.salary_lpa_range ?? role?.salaryRange ?? role?.salary);
  if (!raw) return { min: null, max: null };

  const nums = raw
    .replace(/,/g, "")
    .match(/\d+(\.\d+)?/g)
    ?.map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  if (!nums || nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function roleTitleFromRole(role: any): string {
  return normString(role?.title ?? role?.role_title ?? role?.roleTitle);
}

function roleMatchesFilters(params: {
  role: any;
  selectedIndustry: string;
  selectedSkills: string[];
  salaryRange: [number, number];
  titleQuery: string;
}): boolean {
  const { role, selectedIndustry, selectedSkills, salaryRange, titleQuery } = params;

  if (titleQuery) {
    const roleTitle = roleTitleFromRole(role).toLowerCase();
    if (!roleTitle.includes(titleQuery.toLowerCase())) return false;
  }

  if (selectedIndustry) {
    const industry = normString(role?.industry);
    if (!industry) return false;
    if (industry.toLowerCase() !== selectedIndustry.toLowerCase()) return false;
  }

  if (selectedSkills.length > 0) {
    const roleSkills = [
      ...safeStringArray(role?.skills_required),
      ...safeStringArray(role?.required_skills),
      ...safeStringArray(role?.skills),
    ].map((s) => s.toLowerCase());

    for (const s of selectedSkills) {
      const key = s.trim().toLowerCase();
      if (!key) continue;
      if (!roleSkills.some((rs) => rs.includes(key))) return false;
    }
  }

  const salary = parseSalaryRangeToLakhs(role);
  if (salary.min !== null && salary.max !== null) {
    const [minWanted, maxWanted] = salaryRange;
    const overlaps = salary.max >= minWanted && salary.min <= maxWanted;
    if (!overlaps) return false;
  }

  return true;
}

export default function ExploreClient() {
  // --- UI State ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Explore view mode: cards vs mindmap (persisted)
  const [viewMode, setViewMode] = useState<"cards" | "mindmap">(getExploreViewMode());

  // --- Search Results State ---
  // When populated, we render these instead of the persona recommendations grid.
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>("");

  // --- Filter State ---
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  // Keep in sync with <Filters /> slider (0–60L).
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 60]);

  // --- Options Data State ---
  const [industryOptions, setIndustryOptions] = useState<string[]>([]);
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const personaIdQuery = searchParams?.get("personaId") ?? null;
  const effectivePersonaId = personaIdQuery || loadPersonaId();

  // 1. Fetch Filter Options (Industries/Skills) on Mount
  useEffect(() => {
    async function fetchOptions() {
      setIsLoadingOptions(true);
      try {
        const [industries, skills] = await Promise.all([
          apiFetch("/api/roles/industries"),
          apiFetch("/api/roles/skills"),
        ]);

        // API may return either a raw array or an object envelope { industries: [] } / { skills: [] }.
        const industriesArr = Array.isArray(industries)
          ? industries
          : Array.isArray((industries as any)?.industries)
            ? (industries as any).industries
            : [];

        const skillsArr = Array.isArray(skills)
          ? skills
          : Array.isArray((skills as any)?.skills)
            ? (skills as any).skills
            : [];

        setIndustryOptions(industriesArr);
        setSkillsOptions(skillsArr);
      } catch (err) {
        console.error("Failed to load filter options:", err);
        setOptionsError("Metadata service unavailable.");
      } finally {
        setIsLoadingOptions(false);
      }
    }
    fetchOptions();
  }, []);

  // 2. Handle Persona Logic
  useEffect(() => {
    if (personaIdQuery) {
      persistPersonaId(personaIdQuery);
    }
    
    if (!effectivePersonaId) {
      setError("No persona found. Please complete the data ingestion first.");
    }
    setIsLoading(false);
  }, [personaIdQuery, effectivePersonaId]);

  // Triggered when user clicks "Search" or selects an autocomplete suggestion
  // IMPORTANT: Autocomplete returns titles-only strings; selecting one must still execute
  // a full search request so results render.
  const handleManualSearch = async (qOverride?: string) => {
    const q = String((qOverride ?? selectedTitle) ?? "").trim();

    // If user clears the query, return to the default persona recommendations view.
    if (q.length === 0) {
      setLastSearchQuery("");
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    setLastSearchQuery(q);
    setIsSearching(true);
    setSearchError(null);

    try {
      const qs = new URLSearchParams();
      qs.set("q", q);
      if (effectivePersonaId) qs.set("personaId", effectivePersonaId);

      // Forward filters additively (backend may ignore some; we also apply filters client-side).
      if (selectedIndustry) qs.set("industry", selectedIndustry);
      if (selectedSkills.length > 0) qs.set("skills", selectedSkills.join(","));
      qs.set("limit", "100");

      const data = await apiFetch(`/api/roles/search?${qs.toString()}`);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Role search failed:", e);
      setSearchResults([]);
      setSearchError("Role search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-8 py-12 bg-white min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0D9488] rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Mapping your career trajectory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-12 bg-white min-h-screen">
        <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-100 rounded-xl">
          <h1 className="text-xl font-bold text-red-700 mb-2">Discovery Paused</h1>
          <p className="text-red-600/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 bg-white min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="flex justify-between items-end mb-10 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-[#0D9488] tracking-tight">
              Career Navigator
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Precision-matched roles based on your professional persona.
            </p>
          </div>
          
          <div className="hidden md:block">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1 text-right">AI Engine</span>
            <div className="text-xs text-[#0D9488] font-bold bg-teal-50 px-4 py-1.5 rounded-full border border-teal-100">
              Amazon Bedrock • Claude 3.5
            </div>
          </div>
        </header>

        <main className="space-y-10">
          {/* --- SEARCH BAR WITH AUTOCOMPLETE --- */}
          <section className="flex justify-center">
            <SearchBar
              query={selectedTitle}
              onQueryChange={setSelectedTitle}
              onSearch={handleManualSearch}
              isSticky={false}
              personaId={effectivePersonaId || ""}
            />
          </section>

          {/* --- FILTERS SECTION --- */}
          <section className="space-y-6">
            <Filters
              selectedTitle={selectedTitle}
              onTitleChange={setSelectedTitle}
              selectedIndustry={selectedIndustry}
              onIndustryChange={setSelectedIndustry}
              selectedSkills={selectedSkills}
              onSkillsChange={setSelectedSkills}
              salaryRange={salaryRange}
              onSalaryChange={setSalaryRange}
              isCompact={false}
              industryOptions={industryOptions}
              skillsOptions={skillsOptions}
              isLoadingOptions={isLoadingOptions}
              optionsError={optionsError}
              showJobTitleFilter={false} // Hidden because the SearchBar above handles it
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
          </section>

          {/* --- RESULTS GRID / MINDMAP --- */}
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-teal-100 border-t-[#0D9488] rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse">Searching roles...</p>
            </div>
          ) : searchError ? (
            <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-600 max-w-2xl mx-auto">
              <p className="font-semibold">Search Error</p>
              <p className="text-sm mt-1">{searchError}</p>
            </div>
          ) : Array.isArray(searchResults) ? (
            (() => {
              const selectedIndustryNorm = normString(selectedIndustry);
              const selectedSkillsNorm = Array.isArray(selectedSkills) ? selectedSkills : [];
              const titleQuery = normString(lastSearchQuery);
              const salaryRangeNorm = salaryRange;

              const filtered = searchResults.filter((r) =>
                roleMatchesFilters({
                  role: r,
                  selectedIndustry: selectedIndustryNorm,
                  selectedSkills: selectedSkillsNorm,
                  salaryRange: salaryRangeNorm,
                  titleQuery,
                })
              );

              const hasAnyFilter =
                Boolean(titleQuery) ||
                Boolean(selectedIndustryNorm) ||
                selectedSkillsNorm.length > 0 ||
                salaryRangeNorm[0] !== 0 ||
                salaryRangeNorm[1] !== 60;

              if (filtered.length === 0) {
                return (
                  <EmptyState
                    onResetAll={() => {
                      setSelectedTitle("");
                      setLastSearchQuery("");
                      setSelectedIndustry("");
                      setSelectedSkills([]);
                      setSalaryRange([0, 60]);
                      setSearchResults(null);
                      setSearchError(null);
                    }}
                  />
                );
              }

              return (
                <div className="space-y-6">
                  <div className="text-sm text-slate-500">
                    Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}
                    {titleQuery ? (
                      <>
                        {" "}
                        for <span className="font-semibold text-slate-700">“{titleQuery}”</span>
                      </>
                    ) : null}
                    {hasAnyFilter ? (
                      <span className="text-slate-400"> (with filters applied)</span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map((role: any, idx: number) => {
                      const derivedIdRaw =
                        role?.id ??
                        role?.role_id ??
                        role?.onet_id ??
                        role?.code ??
                        role?.title ??
                        role?.role_title;

                      const derivedId = String(derivedIdRaw ?? "").trim();
                      const stableUniqueId = derivedId !== "" ? derivedId : `role-${idx}`;

                      const normalizedRole = {
                        ...role,
                        id: stableUniqueId,
                        title: role?.title ?? role?.role_title,
                      };

                      return (
                        <RoleCard
                          key={stableUniqueId}
                          role={normalizedRole}
                          personaId={effectivePersonaId || ""}
                          expanded={false}
                          onExpandedChange={() => {}}
                        />
                      );
                    })}
                  </div>

                  <div className="text-xs text-slate-400">
                    Tip: Clear the search input to return to AI persona recommendations.
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-slate-500">
                  Persona recommendations view
                </div>

                <Tabs
                  value={viewMode}
                  onValueChange={(v) => {
                    const next = (v === "mindmap" ? "mindmap" : "cards") as "cards" | "mindmap";
                    setViewMode(next);
                    persistExploreViewMode(next);
                  }}
                >
                  <TabsList className="grid grid-cols-2 w-[240px]">
                    <TabsTrigger value="cards">Cards</TabsTrigger>
                    <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {viewMode === "mindmap" ? (
                <ExploreMindmapView
                  personaId={effectivePersonaId || ""}
                  selectedIndustry={selectedIndustry}
                  selectedSkills={selectedSkills}
                  salaryRange={salaryRange}
                />
              ) : (
                <RecommendationGrid
                  personaId={effectivePersonaId || ""}
                  filters={{
                    industry: selectedIndustry,
                    skills: selectedSkills,
                    title: selectedTitle,
                    salaryRange,
                  }}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}