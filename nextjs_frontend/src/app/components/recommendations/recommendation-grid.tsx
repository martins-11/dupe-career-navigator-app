"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/apiClient";
import { CompatibilityScore } from "../explore/compatibility-score";

interface RecommendationGridProps {
  personaId: string;
  showAnalysis: boolean;
  onViewAnalysis: () => void;
  filters?: {
    industry?: string;
    skills?: string[];
    title?: string;
  };
}

export function RecommendationGrid({
  personaId,
  showAnalysis,
  onViewAnalysis,
  filters = {},
}: RecommendationGridProps) {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      if (!personaId) return;

      setLoading(true);
      setError(null);

      try {
        /**
         * Explore "suggestions" should be persona-driven Bedrock recommendations.
         *
         * Primary endpoint:
         * - GET /api/recommendations/initial?personaId=...
         *   Returns { roles: [...] } (exactly 5) with richer fields + scoring.
         *
         * Fallback endpoint (older Phase 1 logic-based recommendations):
         * - GET /api/recommendations/roles?personaId=...
         *
         * IMPORTANT:
         * - We intentionally do NOT call /api/roles/search here because that is a catalog search,
         *   and was the reason the UI showed demo/scaffolded results instead of AI suggestions.
         */
        const queryParams = new URLSearchParams({ personaId });

        // Attempt strict Bedrock "initial" recommendations first.
        let data: any;
        try {
          data = await apiFetch(`/api/recommendations/initial?${queryParams.toString()}`);
        } catch (initialErr: any) {
          // If initial recommendations fail (e.g., persona final not ready), fall back.
          console.warn("Initial Bedrock recommendations failed; falling back to /roles:", initialErr);
          data = await apiFetch(`/api/recommendations/roles?${queryParams.toString()}`);
        }

        if (!cancelled) {
          // Accept either { roles: [...] } or just [...].
          const rolesArray = Array.isArray(data) ? data : data?.roles || [];
          setRoles(Array.isArray(rolesArray) ? rolesArray : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error("Recommendations fetch failed:", e);
          setError("AI Service temporarily unavailable. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [personaId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-teal-100 border-t-[#0D9488] rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Consulting Bedrock for matches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-600 max-w-2xl mx-auto">
        <p className="font-semibold">Discovery Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!roles || roles.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <p className="text-slate-400 font-medium text-lg">No roles found matching your persona profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {roles.map((role: any, idx: number) => (
          <RoleCardDynamic key={role.role_id || idx} role={role} />
        ))}
      </div>

      {!showAnalysis && (
        <div className="flex justify-center pb-10">
          <button
            className="px-10 py-4 bg-[#0D9488] text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-teal-900/10"
            onClick={onViewAnalysis}
          >
            Analyze Career Compatibility
          </button>
        </div>
      )}
    </div>
  );
}

function RoleCardDynamic({ role }: { role: any }) {
  // Use the data from the Bedrock Service
  const title = role.role_title || "Untitled Role";
  const salary = role.salary_range || "Competitive";
  const report = role.threeTwoReport || {};
  
  // The score from your updated Fuzzy Match logic
  const score = role.compatibilityScore ?? report.compatibilityScore ?? 0; 
  const masteryCount = report.masteryAreas?.length || 0;
  const growthCount = report.growthAreas?.length || 0;

  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:border-[#0D9488]/40 hover:shadow-[0_20px_40px_-15px_rgba(13,148,136,0.1)] flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1.5 flex-1">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#0D9488] font-black">AI Suggestion</span>
          <h2 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-[#0D9488] transition-colors line-clamp-2">
            {title}
          </h2>
          <p className="text-xs text-slate-400 font-medium">{role.industry || "General Technology"}</p>
        </div>
        
        <div className="scale-75 origin-top-right -mr-4 -mt-2">
          {/* Ensure CompatibilityScore matches your actual component props */}
          <CompatibilityScore 
             score={score} 
          />
        </div>
      </div>

      <p className="text-slate-500 text-sm leading-relaxed line-clamp-4 mb-8 flex-grow">
        {role.description}
      </p>

      <div className="flex items-center justify-between pt-5 border-t border-slate-50 mt-auto">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. Range</span>
          <span className="text-sm font-bold text-slate-700">{salary}</span>
        </div>
        
        <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-[#0D9488] group-hover:text-white transition-all duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}