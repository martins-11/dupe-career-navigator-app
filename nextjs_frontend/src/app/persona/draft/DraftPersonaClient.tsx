'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import StepProgressHeader from '@/app/components/StepProgressHeader';
import {
  apiFetch,
  finalizePersonaForBuild,
  generateDraftForBuild,
  savePersonaDraftLatest,
  updatePersona,
  type UUID,
} from '@/lib/apiClient';
import { persistPersonaId } from '@/lib/personaStorage';

const LEGACY_DRAFT_STORAGE_KEY = 'career_navigator_latest_draft_persona_v1';
const PERSONA_ID_STORAGE_KEY = 'career_navigator_persona_id';
const BUILD_ID_STORAGE_KEY = 'career_navigator_build_id';
const LOCAL_DRAFT_OVERRIDE_PREFIX = 'career_navigator_draft_override_v1_';

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
  provenance?: unknown;
};

type EditableDraftModel = {
  name: string;
  role: string;
  summary: string;
  competencies: string[];
  careerHighlights: CareerHighlightItem[];
};

function safeJsonParse<T = any>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
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

function looksLikePersonaDraftSchema(obj: any): obj is PersonaDraftSchema {
  return Boolean(
    obj &&
      typeof obj === 'object' &&
      (typeof obj.summary === 'string' ||
        (obj.profile && typeof obj.profile === 'object') ||
        Array.isArray(obj.strengths) ||
        Array.isArray(obj.experienceHighlights))
  );
}

function looksLikeLegacyDraft(obj: any): obj is LegacyDraftPersona {
  return Boolean(
    obj &&
      typeof obj === 'object' &&
      (typeof obj.full_name === 'string' ||
        typeof obj.professional_summary === 'string' ||
        Array.isArray(obj.core_competencies) ||
        Array.isArray(obj.career_highlights))
  );
}

function toEditableModel(draftJson: any): EditableDraftModel {
  // Backend PersonaDraft schema
  if (looksLikePersonaDraftSchema(draftJson)) {
    const name = String(draftJson?.title ?? '').trim();
    const role = String(draftJson?.profile?.headline ?? '').trim();
    const summary = String(draftJson?.summary ?? '').trim();
    const competencies = asStringArray(draftJson?.strengths);
    const careerHighlights = (asStringArray(draftJson?.experienceHighlights) ?? []).map((h) => ({ highlight: h }));

    return {
      name,
      role,
      summary,
      competencies,
      careerHighlights,
    };
  }

  // Legacy shape
  if (looksLikeLegacyDraft(draftJson)) {
    const name = String(draftJson?.full_name ?? '').trim();
    const role = String(draftJson?.professional_title ?? draftJson?.current_role ?? '').trim();
    const summary = String(draftJson?.professional_summary ?? '').trim();
    const competencies = asStringArray(draftJson?.core_competencies);
    const careerHighlights = coerceCareerHighlights(draftJson?.career_highlights);

    return { name, role, summary, competencies, careerHighlights };
  }

  // Unknown shape -> empty model
  return {
    name: '',
    role: '',
    summary: '',
    competencies: [],
    careerHighlights: [],
  };
}

function applyEditsToDraft(originalDraft: any, edits: EditableDraftModel): any {
  // If it originally looked like PersonaDraft schema, preserve that structure.
  if (looksLikePersonaDraftSchema(originalDraft)) {
    const next: PersonaDraftSchema = {
      ...originalDraft,
      title: edits.name || originalDraft?.title || 'Draft persona',
      summary: edits.summary ?? originalDraft?.summary ?? '',
      profile: {
        ...(originalDraft?.profile ?? {}),
        headline: edits.role ?? originalDraft?.profile?.headline ?? '',
      },
      strengths: edits.competencies,
      experienceHighlights: edits.careerHighlights.map((h) => h.highlight).filter(Boolean),
    };
    return next;
  }

  // Otherwise, use legacy shape (best-effort)
  const nextLegacy: LegacyDraftPersona = {
    ...(looksLikeLegacyDraft(originalDraft) ? originalDraft : {}),
    title: String((originalDraft as any)?.title ?? '').trim() || undefined,
    full_name: edits.name,
    professional_title: edits.role,
    professional_summary: edits.summary,
    core_competencies: edits.competencies,
    career_highlights: edits.careerHighlights.map((h) => ({ text: h.highlight, source: h.sourceExperience })),
  };
  return nextLegacy;
}

async function fetchLatestPersistedDraft(personaId: string): Promise<any | null> {
  /**
   * Fetch latest draft from backend persistence (DB when configured, memory otherwise).
   *
   * Backend response shape (from personasRepo.getDraft):
   * - { personaId, draftId?, draftJson, updatedAt }
   */
  const pid = String(personaId || '').trim();
  if (!pid) return null;

  try {
    const res = await apiFetch<any>(`/api/personas/${encodeURIComponent(pid)}/draft/latest`, {
      method: 'GET',
      cache: 'no-store',
      // If draft/persona isn't found, we'll fall back to localStorage.
      noThrow: true,
    });

    // If the proxy returned an error payload, treat as missing.
    if (res && typeof res === 'object' && (res as any).error) return null;

    const draftJson = (res as any)?.draftJson ?? null;
    if (draftJson && typeof draftJson === 'object') return draftJson;
    return null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export default function DraftPersonaClient() {
  /**
   * Draft persona UI + workflow:
   * - Loads latest saved draft (prefers local override, then backend draft latest, then legacy localStorage).
   * - Allows in-page edits, "Save Changes" (persist local override + best-effort PUT /api/personas/:id),
   *   "Regenerate Draft" (POST /api/orchestration/builds/:id/generate-draft),
   *   and "Finalize Persona" (POST /api/orchestration/builds/:id/finalize + navigate to finalized page).
   *
   * Finalize gating:
   * - If there are unsaved changes, Finalize is disabled until Save Changes completes.
   *
   * UI update:
   * - "Back to Ingestion" button should be in the left rail above Role/Designation.
   */
  const router = useRouter();
  const searchParams = useSearchParams();

  const [personaId, setPersonaId] = React.useState<string | null>(null);
  const [buildId, setBuildId] = React.useState<string | null>(null);

  const [draftJson, setDraftJson] = React.useState<any | null>(null);
  const [edits, setEdits] = React.useState<EditableDraftModel>(() => toEditableModel(null));

  const [loading, setLoading] = React.useState<boolean>(true);
  const [dirty, setDirty] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [regenerating, setRegenerating] = React.useState<boolean>(false);
  const [finalizing, setFinalizing] = React.useState<boolean>(false);

  const [error, setError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState<boolean>(false);

  const resolvePersonaId = React.useCallback((): string | null => {
    const fromQuery = String(searchParams?.get('personaId') ?? '').trim();
    if (fromQuery) return fromQuery;

    try {
      const fromStorage = String(window.localStorage.getItem(PERSONA_ID_STORAGE_KEY) ?? '').trim();
      if (fromStorage) return fromStorage;
    } catch {
      // ignore storage failures
    }

    return null;
  }, [searchParams]);

  const resolveBuildId = React.useCallback((): string | null => {
    const fromQuery = String(searchParams?.get('buildId') ?? '').trim();
    if (fromQuery) return fromQuery;

    try {
      const fromStorage = String(window.localStorage.getItem(BUILD_ID_STORAGE_KEY) ?? '').trim();
      if (fromStorage) return fromStorage;
    } catch {
      // ignore storage failures
    }

    return null;
  }, [searchParams]);

  const loadLocalOverride = React.useCallback((pid: string): any | null => {
    const key = `${LOCAL_DRAFT_OVERRIDE_PREFIX}${pid}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = safeJsonParse<any>(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const saveLocalOverride = React.useCallback((pid: string, json: any) => {
    const key = `${LOCAL_DRAFT_OVERRIDE_PREFIX}${pid}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(json));
    } catch {
      // ignore
    }
  }, []);

  const clearLocalOverride = React.useCallback((pid: string) => {
    const key = `${LOCAL_DRAFT_OVERRIDE_PREFIX}${pid}`;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, []);

  const loadLegacyLocalStorageDraft = React.useCallback((): any | null => {
    try {
      const stored = window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);
      if (!stored) return null;
      return safeJsonParse<any>(stored);
    } catch {
      return null;
    }
  }, []);

  const load = React.useCallback(async () => {
    setError(null);
    setSaveSuccess(false);
    setLoading(true);

    const pid = resolvePersonaId();
    const bid = resolveBuildId();

    setPersonaId(pid);
    setBuildId(bid);

    // 1) Local override (if user saved edits previously)
    if (pid) {
      const override = loadLocalOverride(pid);
      if (override) {
        setDraftJson(override);
        setEdits(toEditableModel(override));
        setDirty(false);
        setLoading(false);
        return;
      }
    }

    // 2) Backend persisted draft
    if (pid) {
      const latest = await fetchLatestPersistedDraft(pid);
      if (latest) {
        setDraftJson(latest);
        setEdits(toEditableModel(latest));
        setDirty(false);
        setLoading(false);
        return;
      }
    }

    // 3) Legacy localStorage fallback
    const legacy = loadLegacyLocalStorageDraft();
    if (legacy) {
      setDraftJson(legacy);
      setEdits(toEditableModel(legacy));
      setDirty(false);
      setLoading(false);
      return;
    }

    setDraftJson(null);
    setEdits(toEditableModel(null));
    setDirty(false);
    setLoading(false);
  }, [loadLegacyLocalStorageDraft, loadLocalOverride, resolveBuildId, resolvePersonaId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onEditField = <K extends keyof EditableDraftModel>(key: K, value: EditableDraftModel[K]) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaveSuccess(false);
  };

  const onEditCareerHighlight = (idx: number, patch: Partial<CareerHighlightItem>) => {
    setEdits((prev) => {
      const next = prev.careerHighlights.slice();
      const existing = next[idx] ?? { highlight: '' };
      next[idx] = { ...existing, ...patch };
      return { ...prev, careerHighlights: next };
    });
    setDirty(true);
    setSaveSuccess(false);
  };

  const onAddCompetency = () => {
    onEditField('competencies', [...(edits.competencies ?? []), '']);
  };

  const onRemoveCompetency = (idx: number) => {
    const next = (edits.competencies ?? []).filter((_, i) => i !== idx);
    onEditField('competencies', next);
  };

  const onAddHighlight = () => {
    onEditField('careerHighlights', [...(edits.careerHighlights ?? []), { highlight: '', sourceExperience: '' }]);
  };

  const onRemoveHighlight = (idx: number) => {
    const next = (edits.careerHighlights ?? []).filter((_, i) => i !== idx);
    onEditField('careerHighlights', next);
  };

  const handleSaveChanges = async () => {
    if (!personaId) {
      setError('Missing personaId. Please return to ingestion and generate a draft again.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updatedDraft = applyEditsToDraft(draftJson ?? {}, edits);

      // Keep local override for resilience/offline refresh behavior.
      saveLocalOverride(personaId, updatedDraft);

      // Canonical draft persistence: PUT /personas/:id/draft/latest (via Next.js /api proxy).
      // Response shape: { personaId, draftId?, draftJson, updatedAt }
      const saved = await savePersonaDraftLatest({
        personaId: personaId as UUID,
        draftJson: updatedDraft,
      });

      // Best-effort: update persona metadata title (avoid creating a new version by not sending personaJson).
      try {
        await updatePersona({
          personaId: personaId as UUID,
          title: `${edits.name || 'Persona'} — ${edits.role || 'Draft'}`.trim(),
        });
      } catch {
        // ignore metadata failures; the draft itself is already persisted.
      }

      const savedJson =
        (saved as any)?.draftJson && typeof (saved as any).draftJson === 'object' ? (saved as any).draftJson : updatedDraft;
      setDraftJson(savedJson);
      setDirty(false);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e: any) {
      setError(e?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateDraft = async () => {
    const bid = String(buildId ?? '').trim();
    if (!bid) {
      setError('Missing buildId. Please return to ingestion and generate a draft again.');
      return;
    }

    setRegenerating(true);
    setError(null);

    try {
      // Regenerate draft in the backend.
      await generateDraftForBuild({
        buildId: bid as UUID,
        personaId: personaId ? (personaId as UUID) : undefined,
        saveDraft: true,
        createVersion: true,
      });

      // Clear local overrides so the UI reflects the newly generated backend draft.
      if (personaId) clearLocalOverride(personaId);

      await load();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to regenerate draft.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (dirty) {
      setError('Please Save Changes before finalizing.');
      return;
    }

    const bid = String(buildId ?? '').trim();
    if (!bid) {
      setError('Missing buildId. Please return to ingestion and generate a draft again.');
      return;
    }

    setFinalizing(true);
    setError(null);

    try {
      const updatedDraft = applyEditsToDraft(draftJson ?? {}, edits);

      const resp = await finalizePersonaForBuild({
        buildId: bid as UUID,
        personaId: personaId ? (personaId as UUID) : undefined,
        finalOverride: updatedDraft,
        saveFinal: true,
        createVersion: true,
      });

      // Ensure personaId is persisted (some environments return it only on finalize).
      const respPersonaId = String(resp?.personaId ?? personaId ?? '').trim();
      if (respPersonaId) {
        persistPersonaId(respPersonaId as any);
        try {
          window.localStorage.setItem(PERSONA_ID_STORAGE_KEY, respPersonaId);
        } catch {
          // ignore
        }
      }

      // Navigation: finalized persona page.
      const qs = new URLSearchParams();
      if (respPersonaId) qs.set('personaId', respPersonaId);
      qs.set('buildId', bid);

      router.push(`/persona/finalized?${qs.toString()}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to finalize persona.');
    } finally {
      setFinalizing(false);
    }
  };

  const headingRole = edits.role.trim();
  const headingName = edits.name.trim();

  return (
    <div className="min-h-svh w-full bg-white">
      <StepProgressHeader currentStep={2} />

      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {/* Role/name heading swap: role is the small label, name is the main heading */}
              <div className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                {headingRole ? headingRole : 'Draft persona'}
              </div>

              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                <span className="text-violet-700">{headingName ? headingName : 'Persona draft'}</span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Review and edit your draft persona. Save changes before finalizing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                onClick={handleRegenerateDraft}
                disabled={loading || regenerating || saving || finalizing}
              >
                {regenerating ? 'Regenerating…' : 'Regenerate draft'}
              </button>

              <button
                type="button"
                className="rounded-md bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
                onClick={handleSaveChanges}
                disabled={!dirty || loading || saving || regenerating || finalizing}
                aria-disabled={!dirty || loading || saving || regenerating || finalizing}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>

              <button
                type="button"
                className="rounded-md border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                onClick={handleFinalize}
                disabled={dirty || loading || saving || regenerating || finalizing}
                title={dirty ? 'Save Changes before finalizing.' : undefined}
              >
                {finalizing ? 'Finalizing…' : 'Finalize'}
              </button>
            </div>
          </div>

          {saveSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Changes saved.
            </div>
          ) : null}
        </header>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">Loading draft persona…</div>
            <div className="mt-1 text-sm text-slate-600">
              Fetching the latest saved draft from the backend (when available).
            </div>
          </div>
        ) : !draftJson ? (
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
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Name</div>
                <input
                  className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  value={edits.name}
                  onChange={(e) => onEditField('name', e.target.value)}
                  placeholder="Your name"
                />
              </section>

              <div className="mt-6">
                <Link
                  href="/ingestion"
                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back to Ingestion
                </Link>
              </div>

              <section className="mt-6 rounded-xl border border-violet-100 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Role / designation</div>
                <input
                  className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  value={edits.role}
                  onChange={(e) => onEditField('role', e.target.value)}
                  placeholder="e.g., Data Science Graduate"
                />
              </section>

              <section className="mt-6 rounded-xl border border-violet-100 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Summary</div>
                <textarea
                  className="mt-3 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  rows={6}
                  value={edits.summary}
                  onChange={(e) => onEditField('summary', e.target.value)}
                  placeholder="Short professional summary"
                />
              </section>

              <section className="mt-6 rounded-xl border border-violet-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Core competencies</div>
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={onAddCompetency}
                  >
                    Add
                  </button>
                </div>

                {(edits.competencies ?? []).length ? (
                  <div className="mt-3 space-y-2">
                    {edits.competencies.map((c, idx) => (
                      <div key={`${idx}`} className="flex items-center gap-2">
                        <input
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
                          value={c}
                          onChange={(e) => {
                            const next = edits.competencies.slice();
                            next[idx] = e.target.value;
                            onEditField('competencies', next);
                          }}
                          placeholder="Competency"
                        />
                        <button
                          type="button"
                          className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => onRemoveCompetency(idx)}
                          aria-label="Remove competency"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">—</div>
                )}
              </section>
            </aside>

            {/* Main content */}
            <main className="lg:col-span-3">
              <section className="rounded-xl border border-violet-100 bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Career highlights</div>
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={onAddHighlight}
                  >
                    Add
                  </button>
                </div>

                {(edits.careerHighlights ?? []).length ? (
                  <div className="mt-4 space-y-3">
                    {edits.careerHighlights.map((h, idx) => (
                      <div key={`${idx}`} className="rounded-lg border border-violet-100 bg-violet-50/30 p-4">
                        <div className="space-y-2">
                          <input
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
                            value={h.highlight}
                            onChange={(e) => onEditCareerHighlight(idx, { highlight: e.target.value })}
                            placeholder="Highlight"
                          />

                          <div className="flex items-center gap-2">
                            <input
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
                              value={h.sourceExperience ?? ''}
                              onChange={(e) => onEditCareerHighlight(idx, { sourceExperience: e.target.value })}
                              placeholder="Source (optional)"
                            />

                            <button
                              type="button"
                              className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => onRemoveHighlight(idx)}
                              aria-label="Remove highlight"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-600">No career highlights found in the draft yet.</div>
                )}
              </section>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
