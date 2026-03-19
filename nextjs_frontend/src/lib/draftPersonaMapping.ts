export type PersonaDraft = {
  schemaVersion?: string;
  title?: string;
  summary?: string;
  profile?: {
    headline?: string;
    seniority?: string | null;
    industry?: string | null;
    location?: string | null;
  };
  strengths?: string[];
  skills?: string[];
  experienceHighlights?: string[];
  provenance?: {
    source?: string;
    sourceTextLength?: number;
  };
};

type AttachedDraftPersonaInput = {
  title?: string;
  full_name?: string;
  professional_title?: string;
  current_role?: string;
  professional_summary?: string;
  career_highlights?: Array<{ text?: string; source?: string }>;
  core_competencies?: string[];
  technical_stack?: {
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    cloud_and_devops?: string[];
    tools?: string[];
  };
};

/**
 * Maps various potential persona draft shapes into the UI-friendly PersonaDraft format.
 *
 * IMPORTANT:
 * - The ingestion flow should persist the backend orchestration `personaDraft` verbatim (Bedrock/Claude output).
 * - This mapper is retained for legacy/compat helpers, but should NOT be used to replace Bedrock output with
 *   a UI placeholder shape.
 *
 * Supports:
 *  - Backend PersonaDraft schema (already in correct shape)
 *  - The attached draft persona JSON (authoritative user input in this task)
 */
export function mapToPersonaDraft(input: unknown): PersonaDraft | null {
  if (!input || typeof input !== 'object') return null;

  // If it already looks like a backend PersonaDraft, accept as-is.
  const maybeAny = input as any;
  if (
    typeof maybeAny?.title === 'string' &&
    typeof maybeAny?.summary === 'string' &&
    typeof maybeAny?.profile === 'object'
  ) {
    return maybeAny as PersonaDraft;
  }

  // Otherwise, attempt to map the attached input shape.
  const src = input as AttachedDraftPersonaInput;

  const fullName = (src.full_name ?? '').trim();
  const professionalTitle = (src.professional_title ?? src.current_role ?? '').trim();
  const mappedTitle = (src.title ?? '').trim() || (fullName && professionalTitle ? `${fullName} — ${professionalTitle}` : fullName) || 'Draft persona';

  const professionalSummary = (src.professional_summary ?? '').trim();

  const highlights =
    src.career_highlights
      ?.map((h) => (h?.text ?? '').trim())
      .filter((t) => Boolean(t)) ?? [];

  const competencies = (src.core_competencies ?? []).map((s) => String(s).trim()).filter(Boolean);

  const tech = src.technical_stack ?? {};
  const skills = [
    ...(tech.languages ?? []),
    ...(tech.frameworks ?? []),
    ...(tech.databases ?? []),
    ...(tech.cloud_and_devops ?? []),
    ...(tech.tools ?? []),
  ]
    .map((s) => String(s).trim())
    .filter(Boolean);

  const headlineParts = [professionalTitle || null, fullName || null].filter(Boolean);
  const headline = headlineParts.length ? headlineParts.join(' • ') : mappedTitle;

  const personaDraft: PersonaDraft = {
    schemaVersion: 'attached_draft_persona_v1',
    title: mappedTitle,
    summary: professionalSummary || '—',
    profile: {
      headline,
      seniority: null,
      industry: null,
      location: null,
    },
    strengths: competencies.length ? competencies.slice(0, 12) : ['—'],
    skills: skills.length ? skills.slice(0, 24) : ['—'],
    experienceHighlights: highlights.length ? highlights.slice(0, 12) : ['—'],
    provenance: {
      source: 'attached_draft_persona_json_mapper',
      sourceTextLength: professionalSummary.length,
    },
  };

  return personaDraft;
}
