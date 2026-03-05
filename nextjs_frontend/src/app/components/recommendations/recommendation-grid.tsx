'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl, apiFetch, type UUID } from '@/lib/apiClient';

type RecommendationRole = {
  role_id: string;
  role_title: string;
  industry: string;
  salary_lpa_range?: string;
  experience_range?: string;
  description?: string;
  key_responsibilities?: string[];
  required_skills?: string[];
};

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function skillChipStyle(kind: 'mastery' | 'growth' | 'neutral') {
  if (kind === 'mastery') {
    return {
      background: 'rgba(13, 148, 136, 0.12)',
      border: '1px solid rgba(13, 148, 136, 0.28)',
      color: '#0d9488',
    } as const;
  }
  if (kind === 'growth') {
    return {
      background: 'rgba(217, 119, 6, 0.12)',
      border: '1px solid rgba(217, 119, 6, 0.28)',
      color: '#d97706',
    } as const;
  }
  return {
    background: '#F3F4F6',
    border: '1px solid #E5E7EB',
    color: '#374151',
  } as const;
}

function normalizeSkill(s: string): string {
  return String(s || '').trim().toLowerCase();
}

function extractPersonaSkillsWithProficiency(finalPersona: any): Array<{ name: string; proficiency: number }> {
  const p = finalPersona && typeof finalPersona === 'object' ? finalPersona : {};

  const candidates = [
    p.user_skills,
    p.userSkills,
    p.skills_with_proficiency,
    p.skillsWithProficiency,
    p.skills,
    p.skillProficiencies,
  ];

  for (const c of candidates) {
    if (!Array.isArray(c)) continue;

    const rows: Array<{ name: string; proficiency: number }> = [];
    for (const row of c) {
      if (!row) continue;

      if (typeof row === 'string') continue;

      if (typeof row === 'object') {
        const name = String((row as any).name || (row as any).skill || (row as any).skill_name || (row as any).label || '').trim();
        const prof =
          (row as any).proficiency ??
          (row as any).proficiency_percent ??
          (row as any).proficiencyPercent ??
          (row as any).percent ??
          (row as any).score;

        const n = Number(prof);
        if (!name || !Number.isFinite(n)) continue;

        rows.push({ name, proficiency: Math.max(0, Math.min(100, Math.round(n))) });
      }
    }

    if (rows.length > 0) return rows;
  }

  return [];
}

function computeMasteryGrowthSets(finalPersona: any) {
  const profs = extractPersonaSkillsWithProficiency(finalPersona);

  const mastery = new Set<string>();
  const growth = new Set<string>();

  for (const s of profs) {
    const key = normalizeSkill(s.name);
    if (!key) continue;

    // Acceptance criteria:
    // - Mastery: >= 80%
    // - Growth: 20–60%
    if (s.proficiency >= 80) mastery.add(key);
    if (s.proficiency >= 20 && s.proficiency <= 60) growth.add(key);
  }

  return { mastery, growth };
}

function RoleCardHiFi(props: {
  role: RecommendationRole;
  masterySet: Set<string>;
  growthSet: Set<string>;
}) {
  const { role, masterySet, growthSet } = props;

  const skills = Array.isArray(role.required_skills) ? role.required_skills : [];
  const responsibilities = Array.isArray(role.key_responsibilities) ? role.key_responsibilities : [];

  return (
    <article
      className="w-full"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E6EEF2',
        borderRadius: 18,
        boxShadow: '0 10px 26px rgba(23, 58, 74, 0.08)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 18px 14px 18px' }}>
        <header className="flex items-start justify-between gap-3" style={{ marginBottom: 12 }}>
          <div className="min-w-0">
            <h3
              className="truncate"
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                marginBottom: 4,
              }}
              title={role.role_title}
            >
              {role.role_title}
            </h3>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4B6572' }}>{role.industry}</div>
          </div>

          {/* Per requirement: remove circular score on these cards */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#0F766E',
              background: 'rgba(23,166,166,0.08)',
              border: '1px solid rgba(23,166,166,0.20)',
              borderRadius: 999,
              padding: '6px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            Recommended
          </div>
        </header>

        {/* Market data */}
        <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 12 }}>
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E6EEF2',
              borderRadius: 12,
              padding: '10px 10px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Salary</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
              {role.salary_lpa_range || '—'}
            </div>
          </div>
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E6EEF2',
              borderRadius: 12,
              padding: '10px 10px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 2 }}>Experience</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
              {role.experience_range || '—'}
            </div>
          </div>
        </div>

        {/* Description */}
        {role.description ? (
          <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.55, marginBottom: 12 }}>
            {role.description}
          </p>
        ) : null}

        {/* Responsibilities */}
        {responsibilities.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Key Responsibilities
            </div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {responsibilities.slice(0, 3).map((r, i) => (
                <li key={i} style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5, marginBottom: 6 }}>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Skills */}
        {skills.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Required Skills
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 10).map((s) => {
                const key = normalizeSkill(s);
                const kind: 'mastery' | 'growth' | 'neutral' = masterySet.has(key)
                  ? 'mastery'
                  : growthSet.has(key)
                    ? 'growth'
                    : 'neutral';

                return (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full px-3 py-1"
                    style={{
                      ...skillChipStyle(kind),
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                    title={kind === 'mastery' ? 'Mastery skill (≥80%)' : kind === 'growth' ? 'Growth skill (20–60%)' : 'Skill'}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

// PUBLIC_INTERFACE
export function RecommendationGrid(props: {
  personaId?: UUID | null;
  finalPersona?: any;
  onLoadedExactlyFive?: (loaded: boolean) => void;
}) {
  /**
   * Renders the post-persona recommendations section.
   *
   * Requirements:
   * - Triggered after "Finalized Persona" is reached.
   * - Calls backend Bedrock initial recommendations service.
   * - Displays exactly 5 high-fidelity role cards.
   * - No circular score on these specific cards.
   * - Skill tags are colored using the Finalized Persona as the source of truth:
   *   - Mastery (>=80%) => teal #0d9488
   *   - Growth (20–60%) => amber #d97706
   */
  const [roles, setRoles] = useState<RecommendationRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mastery, growth } = useMemo(() => computeMasteryGrowthSets(props.finalPersona), [props.finalPersona]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // Contract: backend requires personaId (persona-driven only).
        if (!props.personaId) {
          throw new Error('Missing personaId: finalize a persona to generate recommendations.');
        }

        const sp = new URLSearchParams();
        sp.set('personaId', String(props.personaId));

        const data = await apiFetch<{ roles: RecommendationRole[] }>(
          `/api/recommendations/initial?${sp.toString()}`,
          { method: 'GET' }
        );

        const next = Array.isArray(data?.roles) ? data.roles : [];
        const sliced = next.slice(0, 5);
        if (!cancelled) {
          setRoles(sliced);
          props.onLoadedExactlyFive?.(sliced.length === 5);
        }
      } catch (e: any) {
        if (cancelled) return;
        setRoles([]);
        props.onLoadedExactlyFive?.(false);
        setError(e?.message || 'Failed to load recommendations.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [props.personaId]);

  // Keep navigation reliable by using a direct relative route. (Works with Next.js App Router.)
  const exploreUrl = '/explore';

  return (
    <section style={{ marginTop: 24 }}>
      <div className="flex items-end justify-between gap-3" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>
            Recommended roles for you
          </h3>
          <p style={{ fontSize: 12.5, color: '#4B6572' }}>
            Generated from your finalized persona and current Indian market signals.
          </p>
        </div>

        {/* Explore should only appear AFTER the 5 recommendations are loaded */}
        {roles.length === 5 && !isLoading ? (
          <a
            href={exploreUrl}
            style={{
              height: 38,
              padding: '8px 14px',
              borderRadius: 999,
              backgroundColor: '#17A6A6',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              border: '1px solid rgba(23,166,166,0.35)',
              boxShadow: '0 8px 20px rgba(23,166,166,0.18)',
              whiteSpace: 'nowrap',
            }}
            aria-label="Explore roles"
          >
            Explore
          </a>
        ) : null}
      </div>

      {isLoading ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E6EEF2',
            borderRadius: 16,
            padding: 16,
            color: '#4B6572',
            fontSize: 13,
          }}
        >
          Generating your recommendations…
        </div>
      ) : error ? (
        <div
          style={{
            background: 'rgba(255,0,0,0.03)',
            border: '1px solid rgba(255,0,0,0.12)',
            borderRadius: 16,
            padding: 16,
            color: '#334155',
            fontSize: 13,
          }}
        >
          Couldn’t load recommendations: {error}
        </div>
      ) : roles.length === 0 ? (
        <div
          style={{
            background: 'rgba(23,166,166,0.06)',
            border: '1px solid rgba(23,166,166,0.18)',
            borderRadius: 16,
            padding: 16,
            color: '#334155',
            fontSize: 13,
          }}
        >
          No recommendations yet. Finalize your persona to generate them.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.slice(0, 5).map((r) => (
            <RoleCardHiFi key={r.role_id} role={r} masterySet={mastery} growthSet={growth} />
          ))}
        </div>
      )}
    </section>
  );
}
