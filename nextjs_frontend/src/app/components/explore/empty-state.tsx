"use client";

import { SearchX } from "lucide-react";

/**
 * ZIP-matching empty state shown when no roles match filters.
 */
// PUBLIC_INTERFACE
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-secondary mb-5">
        <SearchX className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5 text-balance text-center">No roles match your filters</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm text-pretty">
        Try adjusting your filters or search keywords to find the role that fits you best.
      </p>
    </div>
  );
}
