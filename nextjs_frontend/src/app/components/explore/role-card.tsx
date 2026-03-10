"use client";

import React from "react";
import { CompatibilityScore } from "./compatibility-score";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";

function normString(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function clampPercent(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Small helper that keeps the “dropdown” open while moving the pointer
 * from the card (trigger) into the panel.
 */
function useHoverDropdown(opts?: { openDelayMs?: number; closeDelayMs?: number }) {
  const openDelayMs = opts?.openDelayMs ?? 90;
  const closeDelayMs = opts?.closeDelayMs ?? 120;

  const [open, setOpen] = React.useState(false);
  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);

  const clearTimers = React.useCallback(() => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  React.useEffect(() => clearTimers, [clearTimers]);

  const scheduleOpen = React.useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;

    if (open) return;
    if (openTimer.current) window.clearTimeout(openTimer.current);

    openTimer.current = window.setTimeout(() => {
      setOpen(true);
      openTimer.current = null;
    }, openDelayMs);
  }, [open, openDelayMs]);

  const scheduleClose = React.useCallback(() => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = null;

    if (!open) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);

    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, closeDelayMs);
  }, [open, closeDelayMs]);

  return {
    open,
    setOpen,
    triggerProps: {
      onMouseEnter: scheduleOpen,
      onMouseLeave: scheduleClose,
      onFocus: scheduleOpen,
      onBlur: scheduleClose,
    } satisfies React.HTMLAttributes<HTMLElement>,
    contentProps: {
      onMouseEnter: scheduleOpen,
      onMouseLeave: scheduleClose,
    } satisfies React.HTMLAttributes<HTMLElement>,
  };
}

// PUBLIC_INTERFACE
/**
 * RoleCard (Explore)
 *
 * Updated hover behavior:
 * - The details panel behaves like a dropdown: it is anchored to the card,
 *   opens below it, and matches the card’s width (edge-aligned panel).
 * - Uses dropdown-like animation/styling (same animation primitives as shadcn dropdowns).
 */
const RoleCard = ({ role }: { role: any }) => {
  const title = normString(role?.title || role?.role_title) || "Untitled Role";
  const industry = normString(role?.industry) || "—";
  const description = normString(role?.description);

  const report =
    role?.threeTwoReport && typeof role.threeTwoReport === "object" ? role.threeTwoReport : {};
  const masteryAreas = safeStringArray(report?.masteryAreas);
  const growthAreas = safeStringArray(report?.growthAreas);

  // Prefer top-level compatibilityScore, then report.compatibilityScore, then report.score.
  const score = clampPercent(role?.compatibilityScore ?? report?.compatibilityScore ?? report?.score ?? 0);

  const requiredSkills = safeStringArray(role?.skills_required ?? role?.required_skills ?? []);
  const tags = safeStringArray(role?.tags);

  const hoverDropdown = useHoverDropdown({ openDelayMs: 80, closeDelayMs: 120 });
  const panelId = React.useId();

  return (
    <Popover open={hoverDropdown.open} onOpenChange={hoverDropdown.setOpen}>
      {/* Anchor is the card itself; PopoverContent will position relative to it */}
      <PopoverAnchor asChild>
        <div
          className="group relative bg-white border border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:border-[#0D9488]/40 hover:shadow-[0_20px_40px_-15px_rgba(13,148,136,0.1)] flex flex-col min-h-[220px] cursor-default"
          aria-label={`${title} role card`}
          aria-expanded={hoverDropdown.open}
          aria-controls={panelId}
          {...hoverDropdown.triggerProps}
        >
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#0D9488] font-black">
                Explore Role
              </span>
              <h2 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-[#0D9488] transition-colors line-clamp-2">
                {title}
              </h2>
              <p className="text-xs text-slate-400 font-medium">{industry}</p>
            </div>

            <div className="scale-75 origin-top-right -mr-4 -mt-2 shrink-0 pointer-events-none">
              <CompatibilityScore score={score} masteryCount={masteryAreas.length} growthCount={growthAreas.length} />
            </div>
          </div>

          <p className="text-slate-500 text-sm leading-relaxed line-clamp-4 mb-4 flex-grow">
            {description !== "" ? (
              description
            ) : (
              <span className="italic text-gray-400">No description provided</span>
            )}
          </p>

          {(tags.length > 0 || requiredSkills.length > 0) && (
            <div className="mt-auto pt-4 border-t border-slate-50">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((t) => (
                    <span key={t} className="px-2 py-1 bg-slate-100 rounded-full text-[11px] text-slate-700">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {requiredSkills.length > 0 && (
                <div className="mt-3 text-[11px] text-slate-400">Hover for details • {requiredSkills.length} required skills</div>
              )}
            </div>
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        id={panelId}
        side="bottom"
        align="start"
        sideOffset={10}
        // Important: match width of the anchor (card) so it reads as a dropdown panel.
        className="z-50 w-[var(--radix-popover-trigger-width)] rounded-xl border bg-popover p-5 text-popover-foreground shadow-md outline-hidden
                   data-[state=open]:animate-in data-[state=closed]:animate-out
                   data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
                   data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
                   data-[side=bottom]:slide-in-from-top-2"
        // We manage open/close via hover; disable Radix “focus outside” closing quirks by keeping pointer in content.
        {...hoverDropdown.contentProps}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 line-clamp-1">{title}</div>
              <div className="text-xs text-slate-500">{industry}</div>
            </div>

            <div className="shrink-0 text-xs text-slate-500">
              Compatibility: <span className="font-semibold text-slate-800">{score}%</span>
            </div>
          </div>

          {description && <p className="text-xs text-slate-600 leading-relaxed">{description}</p>}

          {(masteryAreas.length > 0 || growthAreas.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">
                  Mastery ({masteryAreas.length})
                </div>
                <ul className="mt-2 space-y-1">
                  {masteryAreas.slice(0, 8).map((s) => (
                    <li key={s} className="text-xs text-slate-700">
                      {s}
                    </li>
                  ))}
                  {masteryAreas.length === 0 && <li className="text-xs text-slate-400 italic">None detected</li>}
                </ul>
              </div>

              <div>
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                  Growth ({growthAreas.length})
                </div>
                <ul className="mt-2 space-y-1">
                  {growthAreas.slice(0, 8).map((s) => (
                    <li key={s} className="text-xs text-slate-700">
                      {s}
                    </li>
                  ))}
                  {growthAreas.length === 0 && <li className="text-xs text-slate-400 italic">None detected</li>}
                </ul>
              </div>
            </div>
          )}

          {requiredSkills.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Required skills</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredSkills.slice(0, 16).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] text-slate-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">Dropdown-style hover panel</div>
            <div className="text-[11px] text-slate-400">Move cursor away to close</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RoleCard;
