"use client";

import { useEffect, useState } from "react";
import { RecommendationGrid } from "../components/recommendations/recommendation-grid";
import { CompatibilityScore } from "../components/explore/compatibility-score";
import { loadPersonaId, getPersona } from "../../lib/personaStorage";

// PUBLIC_INTERFACE
/**
 * ExploreClient fetches and displays dynamic Bedrock role recommendations.
 * 3/2 analysis UI is hidden until user clicks "Save/View Analysis".
 * Only API-backed, personaFinal-driven roles are displayed. No static/fallback data.
 */
export default function ExploreClient() {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [persona, setPersona] = useState<any>(null);

  // Load persona on mount (DB-driven, strict JSON required)
  useEffect(() => {
    async function loadPersona() {
      const personaId = loadPersonaId();
      if (personaId) {
        const data = getPersona(personaId);
        setPersona(data);
      } else {
        setPersona(null);
      }
    }
    loadPersona();
  }, []);

  if (!persona) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-3xl font-semibold mb-4">Explore Career Roles</h1>
        <div>Loading persona...</div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <h1 className="text-3xl font-semibold mb-4">Explore Career Roles</h1>
      {/* RecommendationGrid will hide advanced analysis UI unless user clicks */}
      <RecommendationGrid
        personaId={persona.id}
        finalPersona={persona}
        showAnalysis={showAnalysis}
        onViewAnalysis={() => setShowAnalysis(true)}
      />
      {showAnalysis && (
        <div className="mt-8">
          {/* Advanced analysis (3/2 engine/scoring) displayed after click */}
          <CompatibilityScore persona={persona} />
        </div>
      )}
    </div>
  );
}
