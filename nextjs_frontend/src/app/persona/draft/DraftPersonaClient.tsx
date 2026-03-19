'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PersonaDraft = {
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

const STORAGE_KEY = 'career_navigator_latest_draft_persona_v1';

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export default function DraftPersonaClient() {
  /** Draft persona viewer for the most recently generated persona draft. */
  const router = useRouter();
  const [draft, setDraft] = React.useState<PersonaDraft | null>(null);
  const [raw, setRaw] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadFromStorage = React.useCallback(() => {
    setError(null);

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setDraft(null);
        setRaw(null);
        return;
      }

      const parsed = safeJsonParse(stored);
      if (!parsed || typeof parsed !== 'object') {
        setDraft(null);
        setRaw(stored);
        setError('Draft persona found in storage, but it is not valid JSON.');
        return;
      }

      setDraft(parsed as PersonaDraft);
      setRaw(stored);
    } catch {
      setDraft(null);
      setRaw(null);
      setError('Unable to access local storage to load the draft persona.');
    }
  }, []);

  React.useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const title = draft?.title?.trim() || 'Draft persona';
  const headline = draft?.profile?.headline?.trim() || null;

  return (
    <div className="min-h-svh w-full bg-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Persona</div>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{title}</h1>
              {headline ? <p className="mt-2 text-sm text-slate-600">{headline}</p> : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  loadFromStorage();
                  router.refresh();
                }}
              >
                Refresh
              </button>

              <Link
                href="/ingestion"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Back to ingestion
              </Link>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            This page shows the latest generated draft persona stored locally in your browser.
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {error}
          </div>
        ) : null}

        {!draft ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">No draft persona found yet.</div>
            <div className="mt-1 text-sm text-slate-600">
              Generate a draft from <Link className="underline" href="/ingestion">Ingestion</Link>. Once it completes,
              the “Draft ready” button will take you here.
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Summary</div>
              <p className="mt-2 text-sm text-slate-800">{draft.summary || '—'}</p>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Profile</div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Seniority</dt>
                    <dd className="text-right text-slate-900">{draft.profile?.seniority ?? '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Industry</dt>
                    <dd className="text-right text-slate-900">{draft.profile?.industry ?? '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Location</dt>
                    <dd className="text-right text-slate-900">{draft.profile?.location ?? '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Schema</dt>
                    <dd className="text-right text-slate-900">{draft.schemaVersion ?? '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Provenance</div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Source</dt>
                    <dd className="text-right text-slate-900">{draft.provenance?.source ?? '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Source text length</dt>
                    <dd className="text-right text-slate-900">
                      {typeof draft.provenance?.sourceTextLength === 'number' ? draft.provenance.sourceTextLength : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Strengths</div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {(draft.strengths?.length ? draft.strengths : ['—']).map((s, idx) => (
                    <li key={`${s}-${idx}`}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Skills</div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {(draft.skills?.length ? draft.skills : ['—']).map((s, idx) => (
                    <li key={`${s}-${idx}`}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Experience</div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {(draft.experienceHighlights?.length ? draft.experienceHighlights : ['—']).map((s, idx) => (
                    <li key={`${s}-${idx}`}>{s}</li>
                  ))}
                </ul>
              </div>
            </section>

            <details className="rounded-lg border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">Raw draft JSON</summary>
              <pre className="mt-4 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
                {raw ? JSON.stringify(safeJsonParse(raw) ?? raw, null, 2) : '—'}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
