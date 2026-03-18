'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, FileText, Linkedin, Upload, X } from 'lucide-react';

type UploadCategory = 'resume' | 'job_description' | 'cover_letter';

type UploadedPreview = {
  id: string;
  category: UploadCategory;
  file: File;
  addedAt: number;
};

const CANVAS_BG = '#F6F7FB';
const PANEL_BG = '#F0F1F4';
const BORDER_SUBTLE = '#DADDE5';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const TEXT_MUTED = '#8B93A3';
const PURPLE = '#7C3AED';
const PURPLE_DARK = '#6D28D9';
const LAVENDER = '#EFE9FF';

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
    case 'cover_letter':
      return 'Cover Letter';
  }
}

function categoryHint(category: UploadCategory): string {
  switch (category) {
    case 'resume':
      return 'Supported formats: PDF, DOCX, TXT';
    case 'job_description':
      return 'Supported formats: PDF, DOCX, TXT';
    case 'cover_letter':
      return 'Supported formats: PDF, DOCX, TXT';
  }
}

function categoryTitle(category: UploadCategory): string {
  switch (category) {
    case 'resume':
      return 'Upload Your Resume';
    case 'job_description':
      return 'Upload Your Job Description';
    case 'cover_letter':
      return 'Upload Your Cover Letter';
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

  return (
    <div
      className="group w-full max-w-[320px] rounded-[12px] border p-5 transition-colors"
      style={{
        background: isDragOver ? LAVENDER : PANEL_BG,
        borderColor: isDragOver ? PURPLE : BORDER_SUBTLE,
        boxShadow: '0 1px 0 rgba(0,0,0,0.03)',
      }}
    >
      <div
        className="flex flex-col items-center text-center"
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
        style={{ cursor: 'pointer' }}
      >
        <div className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>
          {categoryTitle(category)}
        </div>

        <div
          className="mt-3 flex h-[50px] w-[50px] items-center justify-center rounded-full border"
          style={{
            background: '#F7F4FF',
            borderColor: 'rgba(124,58,237,0.18)',
          }}
          aria-hidden="true"
        >
          <Upload className="h-[20px] w-[20px]" style={{ color: PURPLE }} />
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBrowse();
            }}
            className="h-[30px] rounded-full px-4 text-[12.5px] font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(124,58,237,0.35)] focus-visible:ring-offset-2"
            style={{ background: PURPLE }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = PURPLE_DARK;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = PURPLE;
            }}
          >
            Browse File
          </button>
        </div>

        <div className="mt-3 text-[11.5px]" style={{ color: TEXT_MUTED }}>
          {categoryHint(category)}
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
    </div>
  );
}

// PUBLIC_INTERFACE
export default function IngestionClient() {
  /**
   * UI-only Document Ingestion page (per reference image):
   * - 3 upload containers (resume / job description / cover letter)
   * - LinkedIn connect toggle (visual only)
   * - Animated uploaded files preview list
   *
   * NOTE: This does not call backend APIs yet; it only maintains local UI state.
   */
  const [uploaded, setUploaded] = useState<UploadedPreview[]>([]);
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);

  const cards = useMemo<UploadCategory[]>(() => ['resume', 'job_description', 'cover_letter'], []);

  const onFilesSelected = (category: UploadCategory, files: File[]) => {
    if (!files.length) return;

    // UI-only: just add previews with smooth animation.
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

  return (
    <div className="min-h-svh w-full" style={{ background: CANVAS_BG }}>
      <main className="mx-auto w-full max-w-[1160px] px-6 pb-16 pt-12">
        {/* Cards row */}
        <section className="flex flex-col items-center">
          <div className="flex w-full flex-wrap items-start justify-center gap-6">
            {cards.map((category) => (
              <UploadCard key={category} category={category} onFilesSelected={onFilesSelected} />
            ))}
          </div>

          {/* LinkedIn hint + connect */}
          <div className="mt-9 max-w-[860px] text-center text-[12.5px]" style={{ color: TEXT_SECONDARY }}>
            We recommend connecting your LinkedIn profile to improve persona accuracy
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setIsLinkedInConnected((v) => !v)}
              className="inline-flex h-[32px] items-center justify-center gap-2 rounded-full border px-4 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(124,58,237,0.35)] focus-visible:ring-offset-2"
              style={{
                background: isLinkedInConnected ? LAVENDER : '#FFFFFF',
                borderColor: isLinkedInConnected ? PURPLE : BORDER_SUBTLE,
                color: isLinkedInConnected ? PURPLE : TEXT_PRIMARY,
              }}
              aria-pressed={isLinkedInConnected}
              aria-label={isLinkedInConnected ? 'LinkedIn connected' : 'Connect to LinkedIn'}
            >
              {isLinkedInConnected ? (
                <>
                  <CheckCircle2 className="h-[16px] w-[16px]" style={{ color: PURPLE }} />
                  Connected
                </>
              ) : (
                <>
                  <Linkedin className="h-[16px] w-[16px]" style={{ color: TEXT_SECONDARY }} />
                  Connect to LinkedIn
                </>
              )}
            </button>
          </div>
        </section>

        {/* Uploaded list */}
        <section className="mx-auto mt-9 w-full max-w-[980px]">
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
                className="rounded-[12px] border p-4 text-center text-[12.5px]"
                style={{ background: '#FFFFFF', borderColor: BORDER_SUBTLE, color: TEXT_SECONDARY }}
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
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
                      className="rounded-[12px] border p-3"
                      style={{ background: PANEL_BG, borderColor: BORDER_SUBTLE }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] border"
                            style={{
                              background: '#FFFFFF',
                              borderColor: 'rgba(124,58,237,0.18)',
                            }}
                            aria-hidden="true"
                          >
                            <FileText className="h-[16px] w-[16px]" style={{ color: PURPLE }} />
                          </div>

                          <div className="min-w-0">
                            <div className="min-w-0 truncate text-[13px] font-medium" style={{ color: TEXT_PRIMARY }}>
                              {item.file.name}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px]" style={{ color: TEXT_MUTED }}>
                              <span className="rounded-full px-2 py-0.5" style={{ background: 'rgba(124,58,237,0.10)', color: PURPLE }}>
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
                            style={{ background: LAVENDER, color: PURPLE }}
                          >
                            Uploaded
                          </span>

                          <button
                            type="button"
                            onClick={() => removePreview(item.id)}
                            className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(124,58,237,0.35)] focus-visible:ring-offset-2"
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
