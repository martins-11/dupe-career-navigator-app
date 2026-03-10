"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Component Imports
import { RecommendationGrid } from "../components/recommendations/recommendation-grid";
import { CompatibilityScore } from "../components/explore/compatibility-score";
import { Filters, ActiveFilterTags } from "../components/explore/filters";
import { SearchBar } from "../components/explore/search-bar";
import RoleCard from "../components/explore/role-card";
// Utility & Storage Imports
import { loadPersonaId, persistPersonaId } from "../../lib/personaStorage";
import { apiFetch } from "../../lib/apiClient";

export default function ExploreClient() {
  // --- UI State ---
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Search Results State ---
  // When populated, we render these instead of the persona recommendations grid.
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // --- Filter State ---
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 200]);

  // --- Options Data State ---
  const [industryOptions, setIndustryOptions] = useState<string[]>([]);
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const personaIdQuery = searchParams.get("personaId");
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
        setIndustryOptions(Array.isArray(industries) ? industries : []);
        setSkillsOptions(Array.isArray(skills) ? skills : []);
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
  const handleManualSearch = async () => {
    const q = String(selectedTitle ?? "").trim();

    // If user clears the query, return to the default persona recommendations view.
    if (q.length === 0) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const qs = new URLSearchParams();
      qs.set("q", q);
      if (selectedIndustry) qs.set("industry", selectedIndustry);
      // Backend schema supports q/industry/salary_range/limit; skills may be ignored by backend,
      // but we keep it for forward-compatibility if implemented later.
      if (selectedSkills.length > 0) qs.set("skills", selectedSkills.join(","));

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

          {/* --- RESULTS GRID --- */}
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
            searchResults.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <p className="text-slate-400 font-medium text-lg">No roles found for “{selectedTitle}”.</p>
              </div>
            ) : (
              // Keep rendering using the existing RoleCard UI via RecommendationGrid by
              // temporarily reusing it would require refactor; instead render a minimal grid here.
              <div className="space-y-6">
                <div className="text-sm text-slate-500">
                  Showing {searchResults.length} results for <span className="font-semibold text-slate-700">“{selectedTitle}”</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {searchResults.map((role: any, idx: number) => {
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
                        // Some RoleCard actions are persona-dependent; pass through when available.
                        personaId={effectivePersonaId || ""}
                        // Search results grid doesn't need the accordion behavior used in recommendations;
                        // leave it collapsed by default.
                        expanded={false}
                        onExpandedChange={() => {}}
                      />
                    );
                  })}
                </div>
                <div className="text-xs text-slate-400">
                  Tip: Clear the search to return to AI persona recommendations.
                </div>
              </div>
            )
          ) : (
            <RecommendationGrid
              personaId={effectivePersonaId || ""}
              showAnalysis={showAnalysis}
              onViewAnalysis={() => setShowAnalysis(true)}
              filters={{
                industry: selectedIndustry,
                skills: selectedSkills,
                title: selectedTitle,
              }}
            />
          )}

          {/* --- ANALYSIS SECTION --- */}
          {showAnalysis && (
            <section className="mt-16 pt-12 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 bg-[#0D9488] rounded-full" />
                <h2 className="text-2xl font-bold text-slate-800">Compatibility Deep-Dive</h2>
              </div>
              <div className="bg-slate-50 rounded-3xl p-10 flex justify-center">
                 <CompatibilityScore personaId={effectivePersonaId || ""} />
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}