'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import StepProgressHeader from '@/app/components/StepProgressHeader';
import { apiFetch, type UUID } from '@/lib/apiClient';
import { loadPersona } from '@/lib/personaStorage';

const PERSONA_ID_STORAGE_KEY = 'career_navigator_persona_id';
const BUILD_ID_STORAGE_KEY = 'career_navigator_build_id';

type CareerHighlightItem = {
  highlight: string;
  sourceExperience?: string;
};

type LegacyDraftPersona = {
  title?: string;
  full_name?: string;
  professional_title?: string;
  current_role?: string;
  professional_summary?: string;
  core_competencies?: string[];
  career_highlights?: Array<{ text?: string; source?: string }>;
};

type PersonaDraftSchema = {
  title?: string;
  summary?: string;
  profile?: { headline?: string };
  strengths?: string[];
  skills?: string[];
  experienceHighlights?: string[];
};

function isNonEmptyObject(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && Object.keys(value as any).length > 0);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function coerceCareerHighlights(input: unknown): CareerHighlightItem[] {
  if (!Array.isArray(input)) return [];

  return (input as any[])
    .map((item) => {
      if (typeof item === 'string') {
        const highlight = item.trim();
        return highlight ? { highlight } : null;
      }
      if (item && typeof item === 'object') {
        const text = typeof (item as any).text === 'string' ? (item as any).text.trim() : '';
        const source = typeof (item as any).source === 'string' ? (item as any).source.trim() : '';
        if (!text) return null;
        return { highlight: text, sourceExperience: source || undefined } satisfies CareerHighlightItem;
      }
      return null;
    })
    .filter(Boolean) as CareerHighlightItem[];
}

function extractFinalPersonaFromOrchestrationRecord(orch: any): any | null {
  if (!orch || typeof orch !== 'object') return null;

  const candidates: any[] = [
    orch?.artifacts?.finalPersona?.final,
    orch?.artifacts?.finalPersona,
    orch?.artifacts?.final,
    orch?.results?.finalize?.final,
    orch?.finalPersona,
    orch?.final,
    orch?.personaFinal,
  ];

  for (const c of candidates) {
    if (isNonEmptyObject(c)) return c;
  }
  return null;
}

// PUBLIC_INTERFACE
export default function FinalizedPersonaClient() {
  /** Finalized persona page (read-only) with backend-first loading via orchestration build artifacts. */
  const router = useRouter();
  const searchParams = useSearchParams();

  const [personaId, setPersonaId] = React.useState<string | null>(null);
  const [buildId, setBuildId] = React.useState<string | null>(null);

  const [finalJson, setFinalJson] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [reloadNonce, setReloadNonce] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const pidFromQuery = String(searchParams?.get('personaId') ?? '').trim();
      const bidFromQuery = String(searchParams?.get('buildId') ?? '').trim();

      let pid = pidFromQuery;
      let bid = bidFromQuery;

      try {
        if (!pid) pid = String(window.localStorage.getItem(PERSONA_ID_STORAGE_KEY) ?? '').trim();
        if (!bid) bid = String(window.localStorage.getItem(BUILD_ID_STORAGE_KEY) ?? '').trim();
      } catch {
        // ignore
      }

      if (!cancelled) {
        setPersonaId(pid || null);
        setBuildId(bid || null);
      }

      // 1) Canonical retrieval: latest finalized persona artifact.
      // Backend shape: { personaId, finalId?, finalJson, updatedAt }
      if (pid) {
        try {
          const res = await apiFetch<any>(`/api/personas/${encodeURIComponent(pid)}/final/latest`, {
            method: 'GET',
            cache: 'no-store',
            noThrow: true,
          });

          if (res && typeof res === 'object' && !(res as any).error) {
            const finalJsonCandidate = (res as any)?.finalJson ?? null;
            if (!cancelled && finalJsonCandidate && typeof finalJsonCandidate === 'object') {
              setFinalJson(finalJsonCandidate);
              setLoading(false);
              return;
            }
          }
        } catch {
          // fall through
        }
      }

      // 2) Backend fallback: orchestration build record should include final persona artifacts.
      if (bid) {
        try {
          const orch = await apiFetch<any>(`/api/orchestration/builds/${encodeURIComponent(bid)}`, {
            method: 'GET',
            cache: 'no-store',
          });

          const extracted = extractFinalPersonaFromOrchestrationRecord(orch);
          if (!cancelled && extracted) {
            setFinalJson(extracted);
            setLoading(false);
            return;
          }
        } catch {
          // fall through
        }
      }

      // 3) Local fallback: localStorage persona blob.
      if (pid) {
        try {
          const stored = loadPersona(pid as UUID);
          if (!cancelled && stored && typeof stored === 'object') {
            setFinalJson(stored);
            setLoading(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setFinalJson(null);
        setError(
          'We could not load your finalized persona. Please start again from Document Ingestion (upload your documents) and regenerate the persona.'
        );
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams, reloadNonce]);

  const legacy = (finalJson ?? null) as LegacyDraftPersona | null;
  const schema = (finalJson ?? null) as PersonaDraftSchema | null;

  const name =
    (legacy && typeof legacy?.full_name === 'string' ? legacy.full_name.trim() : '') ||
    (schema && typeof schema?.title === 'string' ? schema.title.trim() : '') ||
    '';

  const role =
    (legacy && typeof legacy?.professional_title === 'string' ? legacy.professional_title.trim() : '') ||
    (legacy && typeof legacy?.current_role === 'string' ? legacy.current_role.trim() : '') ||
    (schema && typeof schema?.profile?.headline === 'string' ? schema.profile.headline.trim() : '') ||
    '';

  const summary =
    (legacy && typeof legacy?.professional_summary === 'string' ? legacy.professional_summary.trim() : '') ||
    (schema && typeof schema?.summary === 'string' ? schema.summary.trim() : '') ||
    '';

  const competencies =
    (legacy && Array.isArray(legacy?.core_competencies) ? asStringArray(legacy.core_competencies) : []) ||
    (schema && Array.isArray(schema?.strengths) ? asStringArray(schema.strengths) : []);

  const highlights: CareerHighlightItem[] =
    (legacy && Array.isArray(legacy?.career_highlights) ? coerceCareerHighlights(legacy.career_highlights) : []) ||
    (schema && Array.isArray(schema?.experienceHighlights)
      ? asStringArray(schema.experienceHighlights).map((h) => ({ highlight: h }))
      : []);

  return (
    <div className="min-h-svh w-full bg-white">
      <StepProgressHeader currentStep={3} />

      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                {role ? role : 'Finalized persona'}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                <span className="text-violet-700">{name ? name : 'Persona'}</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">This is your finalized persona snapshot.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/persona/draft${(() => {
                  const qs = new URLSearchParams();
                  if (personaId) qs.set('personaId', personaId);
                  if (buildId) qs.set('buildId', buildId);
                  const s = qs.toString();
                  return s ? `?${s}` : '';
                })()}`}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to draft
              </Link>

              <button
                type="button"
                className="rounded-md bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800"
                onClick={() => router.push('/pathway')}
              >
                Continue
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">Loading finalized persona…</div>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <div>{error}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
                onClick={() => setReloadNonce((n) => n + 1)}
              >
                Retry load
              </button>
              <Link
                href="/ingestion"
                className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
              >
                Go to ingestion
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
            <aside className="lg:col-span-2">
              <section className="rounded-xl border border-violet-100 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Summary</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{summary || '—'}</p>
              </section>

              <section className="mt-6 rounded-xl border border-violet-100 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Core competencies</div>
                {competencies.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {competencies.map((s) => (
                      <li key={s}>
                        <span className="text-violet-700">{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">—</div>
                )}
              </section>
            </aside>

            <main className="lg:col-span-3">
              <section className="rounded-xl border border-violet-100 bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Career highlights</div>
                  <div className="text-xs font-semibold text-violet-700">{highlights.length ? `${highlights.length} items` : '—'}</div>
                </div>

                {highlights.length ? (
                  <div className="mt-4 space-y-3">
                    {highlights.map((h, idx) => (
                      <div key={`${idx}-${h.highlight}`} className="rounded-lg border border-violet-100 bg-violet-50/30 p-4">
                        <div className="text-sm font-semibold text-violet-800">{h.highlight}</div>

                        {h.sourceExperience ? (
                          <div className="mt-2">
                            <div className="inline-flex items-start gap-2 rounded-md border border-violet-200 bg-white px-3 py-2">
                              <div className="text-xs font-bold uppercase tracking-widest text-violet-600">Source</div>
                              <div className="text-xs text-slate-700">{h.sourceExperience}</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-600">No career highlights found.</div>
                )}
              </section>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
