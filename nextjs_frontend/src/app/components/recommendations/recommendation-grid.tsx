"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * RecommendationGrid fetches and displays 5 Bedrock-recommended roles.
 * Only shows data from API based on personaFinal. All static fallback is removed.
 * The "Save/View Analysis" button reveals advanced comparison UI (via parent).
 */

// The parent passes personaId (UUID), finalPersona (strict JSON), and handler for showing analysis
export function RecommendationGrid({
  personaId,
  finalPersona,
  showAnalysis,
  onViewAnalysis,
}: {
  personaId: string;
  finalPersona: any;
  showAnalysis: boolean;
  onViewAnalysis: () => void;
}) {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track Bedrock-loaded roles only (never fallback)
  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      setLoading(true);
      setError(null);
      setRoles([]);
      try {
        if (!personaId) throw new Error("Missing personaId. Finalize persona to view recommendations.");
        // Always hit Bedrock-powered endpoint using personaFinal
        const res = await fetch(`/api/recommendations/initial?personaId=${personaId}`);
        if (!res.ok) {
          const payload = await res.json();
          throw new Error(payload?.message || payload?.error || "Failed to fetch recommendations");
        }
        const payload = await res.json();
        // Accept only the first 5 roles
        setRoles(Array.isArray(payload?.roles) ? payload.roles.slice(0, 5) : []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load recommendations.");
        setRoles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRoles();
    return () => {
      cancelled = true;
    };
  }, [personaId]);

  if (loading) return <div>Loading recommended roles...</div>;
  if (error) return <div style={{ color: "#b91c1c" }}>Couldn&apos;t load recommendations: {error}</div>;
  if (!roles.length)
    return (
      <div>
        No recommendations available. (Ensure persona is finalized and try again.)
      </div>
    );

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {roles.map((role: any, idx: number) => (
          <RoleCardDynamic key={role.id || role.role_id || idx} role={role} />
        ))}
      </div>
      {!showAnalysis && (
        <div className="flex my-8 justify-center">
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none"
            onClick={onViewAnalysis}
            data-testid="view-analysis-btn"
          >
            Save/View Analysis
          </button>
        </div>
      )}
    </div>
  );
}

// Minimal dynamic role card for API-provided Bedrock recommendations
function RoleCardDynamic({ role }: { role: any }) {
  return (
    <div className="border rounded-md p-4 shadow-md flex flex-col min-h-[180px]">
      <h2 className="text-xl font-medium mb-2">{role.title || role.role_title}</h2>
      <p className="text-gray-700 mb-3">
        {role.description != null && role.description !== ""
          ? role.description
          : <span className="italic text-gray-400">No description provided</span>}
      </p>
      {role.tags && Array.isArray(role.tags) && role.tags.length > 0 ? (
        <div className="flex flex-wrap mt-2">
          {role.tags.map((tag: string) => (
            <span
              key={tag}
              className="mr-2 mb-1 px-2 py-1 bg-gray-200 rounded text-xs text-gray-800"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
