'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCircle2, Linkedin, Loader2, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch, uploadDocuments } from '@/lib/apiClient';

type UploadCategory = 'resume' | 'job_description' | 'performance_review';

type UploadedPreview = {
  id: string;
  category: UploadCategory;
  file: File;
  addedAt: number;
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

type UploadCardProps = {
  category: UploadCategory;
  onFilesSelected: (category: UploadCategory, files: File[]) => void;
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
    onFilesSelected(category, files);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const list = e.dataTransfer.files;
    if (!list || list.length === 0) return;
    onFilesSelected(category, Array.from(list));
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

type UiStep = 'idle' | 'starting-build' | 'uploading' | 'running-orchestration' | 'done';

// PUBLIC_INTERFACE
export default function IngestionClient() {
  /**
   * Ingestion UI:
   * - Lets the user upload 3 categories of docs
   * - On "Generate Draft Persona":
   *    1) Create a build (POST /api/builds) to get a buildId for progress tracking
   *    2) Upload docs (POST /api/uploads/documents) which persists docs + extracted text (best-effort)
   *    3) Run orchestration end-to-end in one call:
   *         POST /api/orchestration/run-all  -> proxies to backend POST /orchestration/run-all
   * - Navigate to /persona only after orchestration succeeds.
   */
  const router = useRouter();
  const [uploaded, setUploaded] = useState<UploadedPreview[]>([]);
  const [uiStep, setUiStep] = useState<UiStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const cards = useMemo<UploadCategory[]>(() => ['resume', 'job_description', 'performance_review'], []);

  const onFilesSelected = (category: UploadCategory, files: File[]) => {
    if (!files.length) return;

    const now = Date.now();
    const next: UploadedPreview[] = files.map((file) => ({
      id: makeId(),
      category,
      file,
      addedAt: now,
    }));

    setUploaded((prev) => [...next, ...prev]);
  };

  const removePreview = (id: string) => {
    setUploaded((prev) => prev.filter((p) => p.id !== id));
  };

  const hasUploads = uploaded.length > 0;
  const hasResumeUpload = uploaded.some((u) => u.category === 'resume');
  const isBusy = uiStep !== 'idle' && uiStep !== 'done';
  const disableInputs = isBusy;

  const stepLabel = (() => {
    switch (uiStep) {
      case 'idle':
        return null;
      case 'starting-build':
        return 'Starting build…';
      case 'uploading':
        return 'Uploading documents…';
      case 'running-orchestration':
        return 'Generating draft persona…';
      case 'done':
        return 'Draft ready.';
    }
  })();

  const onGenerateDraft = async () => {
    // Resume is the only required input to proceed.
    if (!hasResumeUpload || isBusy) return;

    setError(null);

    try {
      setUiStep('starting-build');

      // 1) Create build/workflow (frontend keeps build id for tracking / potential polling)
      const build = await apiFetch<{ id: string } & Record<string, any>>('/api/builds', {
        method: 'POST',
        body: JSON.stringify({ mode: 'persona_build' }),
      });
      const buildId = build?.id;
      if (!buildId || typeof buildId !== 'string') {
        throw new Error('Failed to create build (missing buildId).');
      }

      // 2) Upload docs (single request) with per-file category tagging.
      // Job Description + Performance Review are OPTIONAL.
      // NOTE: do NOT set requireCategories=true; that would force all 3 categories server-side.
      setUiStep('uploading');
      const files = uploaded.map((u) => u.file);
      const categories = uploaded.map((u) => u.category);

      await uploadDocuments({
        files,
        categories,
        requireCategories: false,
      });

      // 3) Single-call orchestration: link → extract/normalize → generate draft (→ optional finalize)
      // We keep useLatestCategoryDocs=true so the backend can auto-select whatever categories exist.
      setUiStep('running-orchestration');

      await apiFetch('/api/orchestration/run-all', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'persona_build',
          personaId: buildId,
          autoCreatePersona: true,
          useLatestCategoryDocs: true,
        }),
      });

      // Success: persona page removed/disabled; remain on ingestion (or route elsewhere if desired)
      setUiStep('done');
      // router.push('/persona');
      router.refresh();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to generate draft persona.';
      setError(msg);
      setUiStep('idle');
    }
  };

  return (
    <div className="min-h-svh w-full" style={{ background: CANVAS_BG }}>
      {/* Old page chrome: Step progress header bar */}
      <div className="bg-white" style={{ padding: '24px 32px', borderBottom: '1px solid #D1D5DB' }}>
        <div className="flex items-center justify-center gap-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                backgroundColor: 'var(--primary)',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              1
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>Ingestion Hub</span>
          </div>

          <div className="h-0.5 w-12 transition-colors duration-300" style={{ backgroundColor: '#D1D5DB' }} />

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                backgroundColor: 'transparent',
                border: '2px solid #D1D5DB',
                color: '#D1D5DB',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              2
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>Persona Validation</span>
          </div>

          <div className="h-0.5 w-12 transition-colors duration-300" style={{ backgroundColor: '#D1D5DB' }} />

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                backgroundColor: 'transparent',
                border: '2px solid #D1D5DB',
                color: '#D1D5DB',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              3
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>Finalized Persona</span>
          </div>
        </div>
      </div>

      {/* Newer lavender strip */}
      <div className="w-full" style={{ background: LAVENDER_STRIP }}>
        <div className="mx-auto w-full max-w-[1160px] px-6 py-3">
          <div className="text-left text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>
            Build your persona
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
                if (hasResumeUpload && !isBusy)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover)';
              }}
              onMouseLeave={(e) => {
                if (hasResumeUpload && !isBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary)';
              }}
              onClick={onGenerateDraft}
            >
              {isBusy ? <Loader2 className="h-[16px] w-[16px] animate-spin" aria-hidden="true" /> : null}
              {isBusy ? 'Working…' : 'Generate Draft Persona'}
            </button>
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

        <section className="mt-10 flex flex-col items-center">
          <div className="grid w-full max-w-[980px] grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((category) => (
              <UploadCard key={category} category={category} onFilesSelected={onFilesSelected} disabled={disableInputs} />
            ))}
          </div>

          <LinkedInConnect />
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
                  {uploaded.map((item) => (
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
                          </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          <span
                            className="rounded-full px-3 py-1 text-[11.5px] font-semibold"
                            style={{ background: 'rgba(20,184,166,0.12)', color: ACCENT_TEAL }}
                          >
                            Ready
                          </span>

                          <button
                            type="button"
                            onClick={() => removePreview(item.id)}
                            disabled={disableInputs}
                            className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(20,184,166,0.30)] focus-visible:ring-offset-2"
                            style={{ color: TEXT_SECONDARY, cursor: disableInputs ? 'not-allowed' : 'pointer', opacity: disableInputs ? 0.6 : 1 }}
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
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
