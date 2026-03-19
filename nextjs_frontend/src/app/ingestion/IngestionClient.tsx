'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCircle2, Linkedin, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
};

function UploadCard({ category, onFilesSelected }: UploadCardProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const onBrowse = () => inputRef.current?.click();

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

    const list = e.dataTransfer.files;
    if (!list || list.length === 0) return;
    onFilesSelected(category, Array.from(list));
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className="group relative w-full rounded-[12px] border bg-white p-4"
      style={{
        borderColor: isDragOver ? accent : BORDER_SUBTLE,
        boxShadow: isDragOver ? '0 12px 32px rgba(17,24,39,0.10)' : '0 8px 24px rgba(0,0,0,0.06)',
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      role="button"
      tabIndex={0}
      aria-label={`${categoryTitle(category)} (click to browse or drag and drop)`}
      onClick={onBrowse}
      onKeyDown={(e) => {
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
            }}
            onMouseEnter={(e) => {
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

// PUBLIC_INTERFACE
export default function IngestionClient() {
  /**
   * Restored “old” ingestion UI chrome (step/progress header + hero/actions),
   * but keeping only the NEW three upload containers in place of the old single uploader.
   *
   * Note: this ingestion route is UI-only; it maintains local state for previews.
   */
  const router = useRouter();
  const [uploaded, setUploaded] = useState<UploadedPreview[]>([]);

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

      {/* Newer lavender strip can remain (still part of ingestion UI spec); it doesn't break old layout */}
      <div className="w-full" style={{ background: LAVENDER_STRIP }}>
        <div className="mx-auto w-full max-w-[1160px] px-6 py-3">
          <div className="text-left text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>
            Build your persona
          </div>
        </div>
      </div>

      {/* Old page: centered hero + action buttons + upload area */}
      <main className="mx-auto w-full max-w-[1160px] px-6 pb-16 pt-10">
        <section className="mx-auto w-full max-w-[980px] text-center">
          <h1 className="text-[36px] font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>
            Build your <span style={{ color: ACCENT_TEAL }}>persona</span>
          </h1>

          <p className="mx-auto mt-3 max-w-[680px] text-[14px]" style={{ color: TEXT_SECONDARY }}>
            Upload your professional documents to generate your AI-powered career profile.
          </p>

          {/* Legacy CTA: "Generate Draft Persona" button with the same navigation behavior as the older ingestion version. */}
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-lg transition-all duration-200"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                cursor: hasUploads ? 'pointer' : 'not-allowed',
                opacity: hasUploads ? 1 : 0.55,
              }}
              disabled={!hasUploads}
              onMouseEnter={(e) => {
                if (hasUploads) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover)';
              }}
              onMouseLeave={(e) => {
                if (hasUploads) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary)';
              }}
              onClick={() => {
                if (!hasUploads) return;

                /**
                 * Legacy navigation/route behavior (copied from older ingestion flow):
                 * - Clicking "Generate Draft Persona" routes the user to the draft persona page at `/persona`.
                 * - This is intentionally UI-only navigation (no orchestration call here), matching the legacy behavior.
                 */
                router.push('/persona');
              }}
            >
              Generate Draft Persona
            </button>
          </div>
        </section>

        {/* Replace ONLY the old single upload container with the three new upload containers */}
        <section className="mt-10 flex flex-col items-center">
          <div className="grid w-full max-w-[980px] grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((category) => (
              <UploadCard key={category} category={category} onFilesSelected={onFilesSelected} />
            ))}
          </div>

          <LinkedInConnect />
        </section>

        {/* Keep smooth animated uploaded preview list */}
        <section className="mx-auto mt-10 w-full max-w-[980px]">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13.5px] font-semibold" style={{ color: TEXT_PRIMARY }}>
              Uploaded files
            </div>
            <div className="text-[11.5px]" style={{ color: TEXT_MUTED }}>
              UI preview only
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
                            Uploaded
                          </span>

                          <button
                            type="button"
                            onClick={() => removePreview(item.id)}
                            className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(20,184,166,0.30)] focus-visible:ring-offset-2"
                            style={{ color: TEXT_SECONDARY }}
                            aria-label={`Remove ${item.file.name}`}
                            title="Remove"
                            onMouseEnter={(e) => {
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
