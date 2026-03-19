'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  /** Legacy-style draft persona viewer: shows the last draft persona JSON stored in localStorage. */
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

      if (!parsedCandidate || typeof parsedCandidate !== 'object') {
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

  const title = (parsed && typeof parsed?.title === 'string' ? parsed.title : '').trim() || 'Draft persona';

  return (
    <div className="min-h-svh w-full bg-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Draft persona</div>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{title}</h1>
              <p className="mt-2 text-sm text-slate-600">
                This page shows the latest generated draft persona stored locally in your browser.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  load();
                  router.refresh();
                }}
              >
                Refresh
              </button>

              <Link href="/ingestion" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
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
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">No draft persona found yet.</div>
            <div className="mt-1 text-sm text-slate-600">
              Generate a draft from <Link className="underline" href="/ingestion">Ingestion</Link>. Once it completes, you will be redirected here.
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Quick view</div>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md bg-slate-50 p-3">
                  <dt className="text-slate-500">Full name</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {typeof parsed?.full_name === 'string' && parsed.full_name.trim() ? parsed.full_name.trim() : '—'}
                  </dd>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <dt className="text-slate-500">Current role</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {typeof parsed?.current_role === 'string' && parsed.current_role.trim()
                      ? parsed.current_role.trim()
                      : typeof parsed?.professional_title === 'string' && parsed.professional_title.trim()
                        ? parsed.professional_title.trim()
                        : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <details className="rounded-lg border border-slate-200 bg-white p-5" open>
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">Raw draft JSON</summary>
              <pre className="mt-4 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(parsed ?? safeJsonParse(rawText) ?? rawText, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
