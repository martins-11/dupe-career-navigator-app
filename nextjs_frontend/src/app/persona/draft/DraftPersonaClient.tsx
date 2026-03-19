'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'career_navigator_latest_draft_persona_v1';

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

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
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

        return {
          highlight: text,
          sourceExperience: source || undefined,
        } satisfies CareerHighlightItem;
      }

      return null;
    })
    .filter(Boolean) as CareerHighlightItem[];
}

// PUBLIC_INTERFACE
export default function DraftPersonaClient() {
  /**
   * Restored legacy draft persona UI (purple/violet styling).
   *
   * Reads the latest draft persona JSON stored under:
   *   localStorage['career_navigator_latest_draft_persona_v1']
   *
   * Expected legacy shape includes:
   * - career_highlights: [{ text, source }]
   * and we render each highlight plus its source.
   */
  const router = useRouter();
  const [rawText, setRawText] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setError(null);

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setRawText(null);
        setParsed(null);
        return;
      }

      const parsedCandidate = safeJsonParse(stored);
      setRawText(stored);
      setParsed(parsedCandidate);

      if (!parsedCandidate || typeof parsedCandidate !== "object") {
        setError('Draft persona found in storage, but it is not valid JSON.');
      }
    } catch {
      setRawText(null);
      setParsed(null);
      setError('Unable to access local storage to load the draft persona.');
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const legacy = (parsed ?? null) as LegacyDraftPersona | null;

  const title =
    (legacy && typeof legacy?.title === 'string' ? legacy.title : '').trim() ||
    (legacy &&
    (typeof legacy?.professional_title === 'string' || typeof legacy?.current_role === 'string')
      ? `${String(legacy.professional_title ?? legacy.current_role ?? '').trim()}`
      : '') ||
    'Draft persona';

  const role =
    (typeof legacy?.professional_title === 'string' ? legacy.professional_title.trim() : '') ||
    (typeof legacy?.current_role === 'string' ? legacy.current_role.trim() : '') ||
    '';

  const name = typeof legacy?.full_name === 'string' ? legacy.full_name.trim() : '';
  const summary = typeof legacy?.professional_summary === 'string' ? legacy.professional_summary.trim() : '';

  const strengths = asStringArray(legacy?.core_competencies);
  const careerHighlights = coerceCareerHighlights(legacy?.career_highlights);

  return (
    <div className="min-h-svh w-full bg-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                Draft persona
              </div>

              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                <span className="text-violet-700">{title}</span>
              </h1>

              {(role || name) && (
                <div className="mt-2 text-sm text-slate-600">
                  {role ? <span className="font-semibold text-violet-700">{role}</span> : null}
                  {role && name ? <span className="mx-2 text-slate-300">|</span> : null}
                  {name ? <span>{name}</span> : null}
                </div>
              )}

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Highlights below show <span className="font-semibold text-violet-700">careerHighlights</span> with the{' '}
                <span className="font-semibold text-violet-700">experience/source</span> they were derived from.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                onClick={() => {
                  load();
                  router.refresh();
                }}
              >
                Refresh
              </button>

              <Link
                href="/ingestion"
                className="rounded-md bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800"
              >
                Back to ingestion
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {error}
          </div>
        ) : null}

        {!rawText ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">No draft persona found yet.</div>
            <div className="mt-1 text-sm text-slate-600">
              Generate a draft from{' '}
              <Link className="font-semibold text-violet-700 underline" href="/ingestion">
                Ingestion
              </Link>
              . Once it completes, you will be redirected here.
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Left rail */}
            <aside className="lg:col-span-2">
              <section className="rounded-xl border border-violet-100 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Summary</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{summary || '—'}</p>
              </section>

              <section className="mt-6 rounded-xl border border-violet-100 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Core competencies</div>
                {strengths.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {strengths.map((s) => (
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

            {/* Main content */}
            <main className="lg:col-span-3">
              <section className="rounded-xl border border-violet-100 bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Career highlights
                  </div>
                  <div className="text-xs font-semibold text-violet-700">
                    {careerHighlights.length ? `${careerHighlights.length} items` : '—'}
                  </div>
                </div>

                {careerHighlights.length ? (
                  <div className="mt-4 space-y-3">
                    {careerHighlights.map((h, idx) => (
                      <div
                        key={`${idx}-${h.highlight}`}
                        className="rounded-lg border border-violet-100 bg-violet-50/30 p-4"
                      >
                        <div className="text-sm font-semibold text-violet-800">
                          {h.highlight}
                        </div>

                        <div className="mt-2">
                          <div className="inline-flex items-start gap-2 rounded-md border border-violet-200 bg-white px-3 py-2">
                            <div className="text-xs font-bold uppercase tracking-widest text-violet-600">
                              Source
                            </div>
                            <div className="text-xs text-slate-700">
                              {h.sourceExperience ? h.sourceExperience : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-600">
                    No career highlights found in the draft yet.
                  </div>
                )}
              </section>

              {/* Keep raw JSON available (collapsed), but not the primary UI */}
              <details className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">Raw draft JSON</summary>
                <pre className="mt-4 max-h-[420px] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
                  {JSON.stringify(parsed ?? safeJsonParse(rawText) ?? rawText, null, 2)}
                </pre>
              </details>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
