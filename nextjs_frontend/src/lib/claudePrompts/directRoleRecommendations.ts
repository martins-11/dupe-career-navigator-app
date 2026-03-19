export type DirectRoleRecommendation = {
  id: string;
  title: string;
  /** 1–2 lines; must be specific to the persona and why this is a "direct" move. */
  rationale: string;
  /** 3–6 bullets; concrete + measurable. */
  whyDirectNow: string[];
  /** 5–10 skills; human readable. */
  requiredSkills: string[];
  /** 3–6 typical responsibilities. */
  keyResponsibilities: string[];
  /** 0–100 (integer). */
  confidence: number;
};

/**
 * Guidance/spec for Claude (or any LLM) to generate Direct Trajectory role recommendations.
 *
 * This file is intentionally "prompt-only"; wiring to an actual Claude call happens in the backend/orchestrator.
 */

// PUBLIC_INTERFACE
export function buildClaudeDirectRoleRecommendationsPrompt(params: {
  finalizedPersonaJson: unknown;
  /**
   * Optional: if the app has a stored target role already (localStorage/backend),
   * Claude can include it as "pinned" or explain if it is not direct.
   */
  savedTargetRoleTitle?: string | null;
}): string {
  /**
   * Returns a deterministic prompt instructing Claude to output *exactly* the
   * JSON shape the UI needs for the Direct Trajectory flow:
   * - recommendation-only roles (no manual user picking)
   * - roles should be "direct" moves from the persona’s current role
   * - output must be machine-parseable JSON (no markdown)
   */
  const persona = JSON.stringify(params.finalizedPersonaJson ?? {}, null, 2);
  const saved = String(params.savedTargetRoleTitle ?? "").trim();

  return [
    "You are an expert career mobility strategist.",
    "",
    "TASK",
    "Given a FINALIZED professional persona JSON, recommend direct next-step target roles.",
    "Direct roles are roles the person can realistically reach next with minimal-to-moderate upskilling (not a far pivot).",
    "",
    "IMPORTANT UX CONTEXT",
    "- The UI must be recommendation-driven only (the user does NOT type or search roles).",
    "- The UI shows a short list of direct-role recommendations derived from the finalized persona.",
    "- The user will select ONE recommended role and click 'Save target role'.",
    "- After saving, the UI generates/displays a roadmap (gap analysis, requirements, pathway/mindmap).",
    "",
    "OUTPUT FORMAT (STRICT)",
    "Return ONLY valid JSON. No markdown, no extra commentary.",
    "The JSON must match this TypeScript shape:",
    "{",
    '  "currentRoleTitle": string,',
    '  "recommendedDirectRoles": DirectRoleRecommendation[]',
    "}",
    "",
    "CONSTRAINTS",
    "- Return EXACTLY 5 recommendedDirectRoles.",
    "- Each role must be a realistic direct move from the inferred current role/title in the persona.",
    "- Keep titles industry-standard (avoid overly custom titles).",
    "- Provide a stable id string per role (slug-like is OK).",
    "- Confidence is an integer 0-100.",
    "- Rationale must mention 1) which persona strengths map, 2) what is missing, 3) why this is direct (not a pivot).",
    "- whyDirectNow bullets must be concrete (e.g., 'Already has X; only needs Y').",
    "- requiredSkills should be a curated list (not exhaustive).",
    "- keyResponsibilities should be typical for the role (not company-specific).",
    "",
    saved
      ? `SAVED TARGET ROLE CONTEXT\nThe user previously saved this target role title: "${saved}".\nIf it is a direct role, ensure it appears in the 5 and explain why. If it is not direct, do NOT include it; instead, choose better direct roles.`
      : "",
    "",
    "FINALIZED PERSONA JSON (AUTHORITATIVE)",
    persona,
  ]
    .filter(Boolean)
    .join("\n");
}
