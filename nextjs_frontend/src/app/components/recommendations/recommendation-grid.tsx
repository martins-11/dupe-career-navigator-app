"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/apiClient";
import RoleCard from "../explore/role-card";

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
        {roles.map((role: any, idx: number) => {
          /**
           * Recommendation payloads sometimes use role_id/role_title naming, while the Explore
           * RoleCard supports both role_title + title, role_id + id, etc.
           *
           * We lightly normalize keys here so:
           * - React keys are stable
           * - RoleCard can reliably find identifiers/titles when present
           */
          const normalizedRole = {
            ...role,
            id: role?.id ?? role?.role_id ?? String(idx),
            title: role?.title ?? role?.role_title,
          };

          return <RoleCard key={normalizedRole.id} role={normalizedRole} />;
        })}
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