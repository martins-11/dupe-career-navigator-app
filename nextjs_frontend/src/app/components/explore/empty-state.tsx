"use client";

import { SearchX } from "lucide-react";

/**
 * ZIP-matching empty state shown when no roles match filters.
 */
export type EmptyStateProps = {
  onResetAll?: () => void;
};

/**
 * PUBLIC_INTERFACE
 * EmptyState
 *
 * Props:
 * - onResetAll: optional callback to clear all search + filter state in the Explore page.
 */
export function EmptyState({ onResetAll }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-secondary mb-5">
        <SearchX className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5 text-balance text-center">No roles match your filters</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm text-pretty mb-6">
        Try adjusting your filters or search keywords to find the role that fits you best.
      </p>

      {onResetAll && (
        <button
          onClick={onResetAll}
          className="text-sm font-semibold px-4 py-2 cursor-pointer"
          style={{ borderRadius: 12, background: 'var(--primary)', color: 'var(--cn-white)' }}
        >
          Reset all filters
        </button>
      )}
    </div>
  );
}
