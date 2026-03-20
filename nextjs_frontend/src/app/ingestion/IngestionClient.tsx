'use client';
import App from '@/app/App';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCircle2, Linkedin, Loader2, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StepProgressHeader from '@/app/components/StepProgressHeader';
import { apiFetch, listDocuments, uploadDocumentsWithProgress } from '@/lib/apiClient';
import { createLogger } from '@/lib/logger';
import { createRetryableAsync, type RetryState } from '@/lib/retryableAsync';
import {
  deleteIngestionFile,
  listIngestionFiles,
  putIngestionFile,
  type UploadCategory,
  type StoredIngestionFile,
} from '@/lib/ingestionFileStore';

const LATEST_DRAFT_PERSONA_STORAGE_KEY = 'career_navigator_latest_draft_persona_v1';
const BUILD_ID_STORAGE_KEY = 'career_navigator_build_id';

type UploadStatus = 'ready' | 'uploading' | 'uploaded' | 'error';

type UploadedPreview = {
  id: string;
  category: UploadCategory;
  file: File;
  addedAt: number;
  status: UploadStatus;
  progressPct: number; // 0..100
  error?: string | null;
};

const CANVAS_BG = '#F6F7F8';
const BORDER_SUBTLE = '#E5E7EB';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const TEXT_MUTED = '#8B93A3';

const LAVENDER_STRIP = '#EADCF8';
const ACCENT_TEAL = '#14B8A6';
const ACCENT_PURPLE = '#8B5CF6';
const ACCENT_GREEN = '#22C55E';
const LINKEDIN_BLUE = '#0A66C2';
const GRADIENT_ACCENT = 'linear-gradient(90deg, #8B5CF6 0%, #14B8A6 100%)';

const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx', 'txt']);
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB per file (client-side guardrail)
const SUPPORTED_FORMATS_LABEL = 'PDF, DOCX, TXT';

const log = createLogger('IngestionClient');

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function getFileExtLabel(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase();
  if (!ext || ext === name.toUpperCase()) return 'FILE';
  return ext;
}

function getFileExt(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase().trim();
  return ext || '';
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function categoryLabel(category: UploadCategory): string {
  switch (category) {
    case 'resume':
      return 'Resume';
    case 'job_description':
      return 'Job Description';
    case 'performance_review':
      return 'Performance Review';
  }
}

function categoryTitle(category: UploadCategory): string {
  switch (category) {
    case 'resume':
      return 'Upload Your Resume';
    case 'job_description':
      return 'Upload Your Job Description';
    case 'performance_review':
      return 'Upload Your Performance Review';
  }
}

function categoryAccent(category: UploadCategory): string {
  switch (category) {
    case 'resume':
      return ACCENT_PURPLE;
    case 'job_description':
      return ACCENT_GREEN;
    case 'performance_review':
      return ACCENT_TEAL;
  }
}

function acceptString(): string {
  return '.pdf,.docx,.txt';
}

function validateFile(file: File): { ok: true } | { ok: false; reason: string } {
  const ext = getFileExt(file.name);

  // Type validation: prefer extension because some browsers omit mime types on drag/drop.
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      reason: `Unsupported file type for “${file.name}”. Supported formats: ${SUPPORTED_FORMATS_LABEL}.`,
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: `“${file.name}” is too large (${formatBytes(file.size)}). Max size is ${formatBytes(MAX_FILE_BYTES)}.`,
    };
  }

  return { ok: true };
}

type UploadCardProps = {
  category: UploadCategory;
  onFilesSelected: (category: UploadCategory, files: File[]) => void | Promise<void>;
  disabled?: boolean;
};

function UploadCard({ category, onFilesSelected, disabled }: UploadCardProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const onBrowse = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onSelectNative: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const files = Array.from(list);
    e.target.value = '';
    void onFilesSelected(category, files);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const list = e.dataTransfer.files;
    if (!list || list.length === 0) return;
    void onFilesSelected(category, Array.from(list));
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (!isDragOver) setIsDragOver(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const accent = categoryAccent(category);

  return (
    <motion.div
      initial={false}
      whileHover={disabled ? undefined : { y: -2 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className="group relative w-full rounded-[12px] border bg-white p-4"
      style={{
        borderColor: isDragOver ? accent : BORDER_SUBTLE,
        boxShadow: isDragOver ? '0 12px 32px rgba(17,24,39,0.10)' : '0 8px 24px rgba(0,0,0,0.06)',
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={`${categoryTitle(category)} (click to browse or drag and drop)`}
      onClick={onBrowse}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') onBrowse();
      }}
    >
      {/* Subtle gradient wash */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[12px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: `radial-gradient(1000px 180px at 30% -10%, ${accent}26, transparent 65%), radial-gradient(1000px 220px at 80% 120%, ${ACCENT_TEAL}20, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative flex min-h-[120px] flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[12px] font-semibold tracking-tight" style={{ color: '#374151' }}>
            {categoryTitle(category)}
          </div>
          <div className="h-[2px] w-[70px] rounded-full" style={{ background: accent }} aria-hidden="true" />
        </div>

        <div className="mt-6 flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBrowse();
            }}
            className="inline-flex h-[30px] items-center justify-center rounded-full px-6 text-[12px] font-semibold text-white shadow-sm transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(20,184,166,0.30)] focus-visible:ring-offset-2"
            style={{
              background: GRADIENT_ACCENT,
              boxShadow: '0 10px 22px rgba(139,92,246,0.20)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.7 : 1,
            }}
            disabled={disabled}
            onMouseEnter={(e) => {
              if (disabled) return;
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px)';
            }}
          >
            <Upload className="mr-2 h-[14px] w-[14px]" aria-hidden="true" />
            Upload
          </button>
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={acceptString()}
          multiple
          onChange={onSelectNative}
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
          disabled={disabled}
        />
      </div>
    </motion.div>
  );
}

function LinkedInConnect() {
  const [connected, setConnected] = useState(false);

  return (
    <div className="mt-8 flex flex-col items-center">
      <div className="text-center text-[12px]" style={{ color: TEXT_SECONDARY }}>
        * recommend connecting your LinkedIn profile to improve persona accuracy
      </div>

      <button
        type="button"
        onClick={() => setConnected((v) => !v)}
        className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold"
        style={{ color: connected ? ACCENT_TEAL : LINKEDIN_BLUE }}
        aria-pressed={connected}
        aria-label={connected ? 'Connected to LinkedIn (click to toggle)' : 'Connect to LinkedIn (click to toggle)'}
      >
        {connected ? (
          <>
            <CheckCircle2 className="h-[16px] w-[16px]" style={{ color: ACCENT_TEAL }} aria-hidden="true" />
            Connected to LinkedIn
          </>
        ) : (
          <>
            <Linkedin className="h-[16px] w-[16px]" style={{ color: LINKEDIN_BLUE }} aria-hidden="true" />
            Connect to LinkedIn
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => setConnected((v) => !v)}
        className="mt-3 inline-flex h-[32px] items-center justify-center rounded-full px-8 text-[12px] font-semibold text-white shadow-sm transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(20,184,166,0.30)] focus-visible:ring-offset-2"
        style={{
          background: connected ? 'linear-gradient(90deg, #14B8A6 0%, #22C55E 100%)' : GRADIENT_ACCENT,
          boxShadow: '0 12px 26px rgba(17,24,39,0.10)',
        }}
      >
        {connected ? (
          <>
            <Check className="mr-2 h-[14px] w-[14px]" aria-hidden="true" />
            Connected
          </>
        ) : (
          'Connect'
        )}
      </button>
    </div>
  );
}

type UiStep = 'idle' | 'uploading' | 'running-orchestration' | 'done';

type IngestionResult = {
  buildId: string | null;
  personaId: string | null;
  documentIds: string[];
};

function fileToStored(record: UploadedPreview): StoredIngestionFile {
  return {
    id: record.id,
    category: record.category,
    name: record.file.name,
    size: record.file.size,
    type: record.file.type ?? '',
    lastModified: record.file.lastModified ?? Date.now(),
    addedAt: record.addedAt,
    blob: record.file,
  };
}

function storedToPreview(record: StoredIngestionFile): UploadedPreview {
  const file = new File([record.blob], record.name, {
    type: record.type ?? '',
    lastModified: record.lastModified ?? Date.now(),
  });

  return {
    id: record.id,
    category: record.category,
    file,
    addedAt: record.addedAt,
    status: 'ready',
    progressPct: 0,
    error: null,
  };
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function progressByFileSizes(params: { files: File[]; loaded: number; total: number }): number[] {
  const sizes = params.files.map((f) => Math.max(0, Number(f.size) || 0));
  const sum = sizes.reduce((a, b) => a + b, 0);

  // If the browser can't compute a meaningful mapping, just return 0s.
  if (sum <= 0) return sizes.map(() => 0);

  // We map request bytes to file sizes proportionally. This is an approximation because multipart adds overhead.
  const loaded = Math.max(0, params.loaded);
  const total = Math.max(1, params.total);

  // Normalize loaded to 0..sum based on request progress 0..total.
  const virtualLoaded = Math.min(sum, (loaded / total) * sum);

  let acc = 0;
  return sizes.map((s) => {
    const start = acc;
    const end = acc + s;
    acc = end;
    if (s <= 0) return 100;
    const within = Math.max(0, Math.min(s, virtualLoaded - start));
    return clampPct((within / s) * 100);
  });
}

// PUBLIC_INTERFACE
export default function IngestionClient() {
  /**
   * Ingestion UI (acceptance-criteria aligned):
   * - Multi-file upload via 3 category cards (drag/drop + browse)
   * - Supported formats messaging: PDF/DOCX/TXT
   * - Client-side size/type validation with user-visible error
   * - Per-file progress during upload (approx via multipart progress mapping)
   * - Persistence after refresh (IndexedDB stores blobs)
   * - Failed upload logging via createLogger
   *
   * Workflow:
   * - Upload docs (POST /api/uploads/documents) which persists docs + extracted text (best-effort)
   * - Run orchestration:
   *     POST /api/orchestration/run-all  -> proxies to backend POST /orchestration/run-all
   * - Navigate to /persona/draft only after orchestration succeeds.
   */
  const router = useRouter();
  const [uploaded, setUploaded] = useState<UploadedPreview[]>([]);
  const [uiStep, setUiStep] = useState<UiStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const [op, setOp] = useState<RetryState<IngestionResult>>({
    loading: false,
    error: null,
    data: null,
    attempt: 0,
  });

  const cards = useMemo<UploadCategory[]>(() => ['resume', 'job_description', 'performance_review'], []);

  // Load persisted selections on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const records = await listIngestionFiles();
        const previews = records
          .slice()
          .sort((a, b) => b.addedAt - a.addedAt)
          .map(storedToPreview);

        if (!cancelled) setUploaded(previews);
      } catch (e: any) {
        // Non-fatal; the page still works without persistence.
        log.warn('Failed to load persisted ingestion files', { message: e?.message || String(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onFilesSelected = async (category: UploadCategory, files: File[]) => {
    if (!files.length) return;

    setError(null);

    const now = Date.now();
    const valid: UploadedPreview[] = [];
    const rejected: { file: File; reason: string }[] = [];

    for (const file of files) {
      const verdict = validateFile(file);
      if (!verdict.ok) {
        rejected.push({ file, reason: verdict.reason });
      } else {
        valid.push({
          id: makeId(),
          category,
          file,
          addedAt: now,
          status: 'ready',
          progressPct: 0,
          error: null,
        });
      }
    }

    if (rejected.length > 0) {
      const first = rejected[0];
      const msg = first.reason;
      setError(msg);
      log.warn('Rejected file(s) on ingestion', {
        rejected: rejected.map((r) => ({ name: r.file.name, size: r.file.size, type: r.file.type, reason: r.reason })),
      });
    }

    if (valid.length === 0) return;

    // Optimistically update UI.
    setUploaded((prev) => [...valid, ...prev]);

    // Persist to IndexedDB (best-effort).
    try {
      await Promise.all(valid.map((v) => putIngestionFile(fileToStored(v))));
    } catch (e: any) {
      log.warn('Failed to persist ingestion file(s) to IndexedDB', { message: e?.message || String(e) });
      // Keep UI state even if persistence fails.
    }
  };

  const removePreview = async (id: string) => {
    setUploaded((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteIngestionFile(id);
    } catch (e: any) {
      log.warn('Failed to delete persisted ingestion file', { id, message: e?.message || String(e) });
    }
  };

  const hasResumeUpload = uploaded.some((u) => u.category === 'resume');
  const isBusy = uiStep !== 'idle' && uiStep !== 'done';
  const disableInputs = isBusy;

  const stepLabel = (() => {
    switch (uiStep) {
      case 'idle':
        return null;
      case 'uploading':
        return 'Uploading documents…';
      case 'running-orchestration':
        return 'Generating draft persona…';
      case 'done':
        return 'Draft ready.';
    }
  })();

  const ingestionRunner = useMemo(
    () =>
      createRetryableAsync(async (): Promise<IngestionResult> => {
        // Resume is the only required input to proceed.
        if (!hasResumeUpload) {
          throw new Error('Please upload at least your Resume to generate a draft persona.');
        }

        // Snapshot upload order at click time so progress mapping remains stable and retry-safe.
        const ordered = uploaded.slice().sort((a, b) => b.addedAt - a.addedAt);
        const files = ordered.map((u) => u.file);
        const categories = ordered.map((u) => u.category);

        // Mark all as uploading in UI.
        setUploaded((prev) =>
          prev.map((p) => ({
            ...p,
            status: 'uploading',
            progressPct: 0,
            error: null,
          })),
        );

        // 1) Upload docs (single request) with per-file category tagging.
        // Job Description + Performance Review are OPTIONAL.
        // NOTE: do NOT set requireCategories=true; that would force all 3 categories server-side.
        setUiStep('uploading');

        await uploadDocumentsWithProgress({
          files,
          categories,
          requireCategories: false,
          onProgress: ({ loaded, total }) => {
            const perFile = progressByFileSizes({ files, loaded, total });

            setUploaded((prev) => {
              // Map progress to the same order we used to send.
              const byId = new Map(prev.map((p) => [p.id, p] as const));
              const updatedInOrder = ordered.map((p, idx) => ({
                ...(byId.get(p.id) ?? p),
                status: 'uploading' as UploadStatus,
                progressPct: perFile[idx] ?? 0,
                error: null,
              }));

              // Preserve any entries that might have been added since click (unlikely but safe).
              const touchedIds = new Set(updatedInOrder.map((u) => u.id));
              const untouched = prev.filter((p) => !touchedIds.has(p.id));

              return [...updatedInOrder, ...untouched];
            });
          },
        });

        setUploaded((prev) =>
          prev.map((p) => ({
            ...p,
            status: 'uploaded',
            progressPct: 100,
            error: null,
          })),
        );

        // 2) Select the newly-uploaded documents deterministically.
        // The upload API response intentionally does not include document IDs (stable contract),
        // so we fetch /api/documents and match by filename, newest-first.
        const docs = await listDocuments({ limit: 100, offset: 0 });
        const docsByNewest = docs.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

        const usedDocIds = new Set<string>();
        const selectedDocIds: string[] = [];
        for (const f of files) {
          const hit = docsByNewest.find((d) => d.originalFilename === f.name && !usedDocIds.has(d.id));
          if (hit) {
            usedDocIds.add(hit.id);
            selectedDocIds.push(hit.id);
          }
        }

        const documentIds =
          selectedDocIds.length > 0 ? selectedDocIds : docsByNewest.slice(0, files.length).map((d) => d.id);

        if (documentIds.length === 0) {
          throw new Error('Upload succeeded but no documents were available for orchestration. Please retry.');
        }

        // 3) Spec-aligned single-call orchestration (backend creates the build internally):
        // POST /orchestration/run-all (proxied via /api/orchestration/run-all)
        setUiStep('running-orchestration');

        const orchestrationRes = await apiFetch<any>('/api/orchestration/run-all', {
          method: 'POST',
          body: JSON.stringify({
            mode: 'persona_build',
            documentIds,
            useLatestCategoryDocs: false,
            autoCreatePersona: true,
            generate: {
              saveDraft: true,
              createVersion: true,
            },
          }),
        });

        const buildId = String(orchestrationRes?.build?.id ?? '').trim() || null;

        const personaIdCandidate =
          orchestrationRes?.results?.generate?.personaId ??
          orchestrationRes?.results?.finalize?.personaId ??
          orchestrationRes?.orchestration?.personaId ??
          orchestrationRes?.build?.personaId ??
          orchestrationRes?.personaId ??
          null;

        const personaId = String(personaIdCandidate ?? '').trim() || null;

        // Persist buildId + personaId so downstream pages can regenerate/finalize deterministically.
        try {
          if (buildId) window.localStorage.setItem(BUILD_ID_STORAGE_KEY, buildId);
          if (personaId) window.localStorage.setItem(PERSONA_ID_STORAGE_KEY, personaId);
        } catch {
          // ignore storage failures
        }

        // Persist the latest draft so the user can view it immediately on /persona/draft.
        try {
          const candidate =
            orchestrationRes?.orchestration?.personaDraft ??
            orchestrationRes?.orchestration?.artifacts?.draftPersona ??
            orchestrationRes?.orchestration?.artifacts?.draftPersona?.persona ??
            orchestrationRes?.results?.generate?.persona ??
            orchestrationRes?.persona ??
            null;

          if (candidate && typeof candidate === 'object') {
            window.localStorage.setItem(LATEST_DRAFT_PERSONA_STORAGE_KEY, JSON.stringify(candidate));
          }
        } catch {
          // Non-fatal: draft viewing page will show an empty state if storage fails.
        }

        setUiStep('done');

        return { buildId, personaId, documentIds };
      }),
    [hasResumeUpload, uploaded],
  );

  const onGenerateDraft = async () => {
    if (isBusy) return;

    setError(null);
    const res = await ingestionRunner.run(setOp);
    if (!res) {
      // Error already set by runner; reflect in page-level error too.
      const msg = op.error || 'Failed to generate draft persona.';
      setError(msg);
      setUiStep('idle');

      // Mark all items as errored for visibility.
      setUploaded((prev) => prev.map((p) => ({ ...p, status: 'error', error: msg })));
      return;
    }

    // Navigate with buildId/personaId if available.
    const qs = new URLSearchParams();
    if (res.personaId) qs.set('personaId', res.personaId);
    if (res.buildId) qs.set('buildId', res.buildId);

    router.push(qs.toString() ? `/persona/draft?${qs.toString()}` : '/persona/draft');
  };

  return (
    <div className="min-h-svh w-full" style={{ background: CANVAS_BG }}>
      {/* Step progress header (shared across ingestion/draft/finalized) */}
      <StepProgressHeader currentStep={1} />

      {/* Lavender strip (headline removed per screenshot request) */}
      <div className="w-full" style={{ background: LAVENDER_STRIP }}>
        <div className="mx-auto w-full max-w-[1160px] px-6 py-3">
          <div className="text-left text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }} aria-hidden="true">
            &nbsp;
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1160px] px-6 pb-16 pt-10">
        <section className="mx-auto w-full max-w-[980px] text-center">
          <h1 className="text-[36px] font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>
            Build your <span style={{ color: ACCENT_TEAL }}>persona</span>
          </h1>

          <p className="mx-auto mt-3 max-w-[680px] text-[14px]" style={{ color: TEXT_SECONDARY }}>
            Upload your professional documents to generate your AI-powered career profile.
          </p>

          <div className="mx-auto mt-2 max-w-[680px] text-[12px]" style={{ color: TEXT_MUTED }}>
            Supported formats: {SUPPORTED_FORMATS_LABEL}. Max size: {formatBytes(MAX_FILE_BYTES)} per file.
          </div>
        </section>

        <section className="mt-10 flex flex-col items-center">
          <div className="grid w-full max-w-[980px] grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((category) => (
              <UploadCard key={category} category={category} onFilesSelected={onFilesSelected} disabled={disableInputs} />
            ))}
          </div>

          <LinkedInConnect />

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                cursor: hasResumeUpload && !isBusy ? 'pointer' : 'not-allowed',
                opacity: hasResumeUpload && !isBusy ? 1 : 0.55,
              }}
              disabled={!hasResumeUpload || isBusy}
              onMouseEnter={(e) => {
                if (hasResumeUpload && !isBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover)';
              }}
              onMouseLeave={(e) => {
                if (hasResumeUpload && !isBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary)';
              }}
              onClick={onGenerateDraft}
            >
              {isBusy ? <Loader2 className="h-[16px] w-[16px] animate-spin" aria-hidden="true" /> : null}
              {uiStep === 'uploading'
                ? 'Uploading…'
                : uiStep === 'running-orchestration'
                  ? 'Generating draft…'
                  : 'Generate Draft Persona'}
            </button>

            {error ? (
              <button
                type="button"
                className="rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'white',
                  color: 'var(--primary)',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: '1px solid rgba(99,102,241,0.22)',
                  cursor: !isBusy ? 'pointer' : 'not-allowed',
                  opacity: !isBusy ? 1 : 0.55,
                }}
                disabled={isBusy}
                onClick={onGenerateDraft}
              >
                Retry
              </button>
            ) : null}
          </div>

          <AnimatePresence initial={false}>
            {stepLabel ? (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-[12px]"
                style={{ borderColor: BORDER_SUBTLE, color: TEXT_SECONDARY }}
                aria-live="polite"
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: ACCENT_TEAL }} aria-hidden="true" />
                {stepLabel}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                className="mx-auto mt-4 max-w-[720px] rounded-[12px] border bg-white px-4 py-3 text-left text-[12.5px]"
                style={{ borderColor: 'rgba(239,68,68,0.28)', color: '#991B1B' }}
                role="alert"
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>

        <section className="mx-auto mt-10 w-full max-w-[980px]">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13.5px] font-semibold" style={{ color: TEXT_PRIMARY }}>
              Uploaded files
            </div>
            <div className="text-[11.5px]" style={{ color: TEXT_MUTED }}>
              {isBusy ? 'Locked while generating' : 'Ready to upload'}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {uploaded.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                className="rounded-[12px] border bg-white p-4 text-center text-[12.5px]"
                style={{ borderColor: BORDER_SUBTLE, color: TEXT_SECONDARY }}
              >
                No files uploaded yet. Use any card above to add a file.
              </motion.div>
            ) : (
              <motion.ul layout className="space-y-3">
                <AnimatePresence initial={false}>
                  {uploaded.map((item) => {
                    const badge =
                      item.status === 'uploading'
                        ? `${item.progressPct}%`
                        : item.status === 'uploaded'
                          ? 'Uploaded'
                          : item.status === 'error'
                            ? 'Error'
                            : 'Ready';

                    const badgeStyles =
                      item.status === 'error'
                        ? { background: 'rgba(239,68,68,0.12)', color: '#B91C1C' }
                        : item.status === 'uploaded'
                          ? { background: 'rgba(34,197,94,0.14)', color: '#15803D' }
                          : { background: 'rgba(20,184,166,0.12)', color: ACCENT_TEAL };

                    return (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
                        className="rounded-[12px] border bg-white p-3"
                        style={{ borderColor: BORDER_SUBTLE, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] border bg-white"
                              style={{ borderColor: 'rgba(139,92,246,0.20)' }}
                              aria-hidden="true"
                            >
                              <Upload className="h-[16px] w-[16px]" style={{ color: ACCENT_PURPLE }} />
                            </div>

                            <div className="min-w-0">
                              <div className="min-w-0 truncate text-[13px] font-medium" style={{ color: TEXT_PRIMARY }}>
                                {item.file.name}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px]" style={{ color: TEXT_MUTED }}>
                                <span
                                  className="rounded-full px-2 py-0.5"
                                  style={{
                                    background: 'rgba(139,92,246,0.10)',
                                    color: ACCENT_PURPLE,
                                  }}
                                >
                                  {categoryLabel(item.category)}
                                </span>
                                <span>{getFileExtLabel(item.file.name)}</span>
                                <span>•</span>
                                <span>{formatBytes(item.file.size)}</span>
                              </div>

                              {item.status === 'uploading' ? (
                                <div className="mt-2 h-[6px] w-full max-w-[360px] rounded-full" style={{ background: 'rgba(17,24,39,0.06)' }}>
                                  <div
                                    className="h-[6px] rounded-full"
                                    style={{
                                      width: `${clampPct(item.progressPct)}%`,
                                      background: GRADIENT_ACCENT,
                                      transition: 'width 120ms linear',
                                    }}
                                    aria-hidden="true"
                                  />
                                </div>
                              ) : null}

                              {item.status === 'error' && item.error ? (
                                <div className="mt-2 text-[11.5px]" style={{ color: '#B91C1C' }}>
                                  {item.error}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-2">
                            <span className="rounded-full px-3 py-1 text-[11.5px] font-semibold" style={badgeStyles}>
                              {badge}
                            </span>

                            <button
                              type="button"
                              onClick={() => void removePreview(item.id)}
                              disabled={disableInputs}
                              className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(20,184,166,0.30)] focus-visible:ring-offset-2"
                              style={{
                                color: TEXT_SECONDARY,
                                cursor: disableInputs ? 'not-allowed' : 'pointer',
                                opacity: disableInputs ? 0.6 : 1,
                              }}
                              aria-label={`Remove ${item.file.name}`}
                              title="Remove"
                              onMouseEnter={(e) => {
                                if (disableInputs) return;
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(17,24,39,0.06)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                              }}
                            >
                              <X className="h-[16px] w-[16px]" />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
