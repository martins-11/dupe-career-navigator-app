"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { getRoleSuggestions } from "@/lib/rolesApi";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  isSticky: boolean;
}

/**
 * Search bar with autocomplete suggestions.
 *
 * Backend integration:
 * - Suggestions are powered by GET /api/roles/search?q=...&limit=5 (titles extracted client-side).
 */
export function SearchBar({ query, onQueryChange, onSearch, isSticky }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /**
     * Debounced autocomplete:
     * - Prevents firing a request for every keystroke.
     * - Helps avoid out-of-order responses updating the UI with stale suggestions.
     * - Ensures we only ever send a *string* query to the backend.
     */
    let cancelled = false;

    const q = String(query ?? "");
    const trimmed = q.trim();

    // Clear suggestions quickly for very short queries.
    if (trimmed.length < 2) {
      setSuggestions([]);
      setHighlightIndex(-1);
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(async () => {
      try {
        const s = await getRoleSuggestions(trimmed, 5);
        if (!cancelled) {
          setSuggestions(s);
          setHighlightIndex(-1);
        }
      } catch {
        // Autocomplete should never block the UX; if it fails, just hide suggestions.
        if (!cancelled) {
          setSuggestions([]);
          setHighlightIndex(-1);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        onQueryChange(suggestions[highlightIndex]);
        setSuggestions([]);
        setIsFocused(false);
        onSearch();
      } else {
        onSearch();
        setIsFocused(false);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  }

  function highlightMatch(text: string) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-semibold text-primary">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <div
        className={cn("flex items-center border shadow-sm transition-shadow duration-300", isSticky ? "h-12" : "h-14")}
        style={{
          borderRadius: 12,
          background: "var(--bg-surface)",
          borderColor: isFocused ? "rgba(23,166,166,0.45)" : "var(--border-subtle)",
          boxShadow: isFocused ? "var(--ring-teal)" : "none",
        }}
      >
        <div className="flex items-center justify-center pl-5">
          <Search className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            onQueryChange(next);

            // Keep autocomplete responsive even if parent state updates are delayed.
            // (Debounce is already applied in the effect; this just ensures suggestions
            // are actually triggered by input changes, per authoritative instructions.)
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search job title, skills, or industry..."
          className={cn("flex-1 bg-transparent px-4 focus:outline-none", isSticky ? "text-sm" : "text-base")}
          style={{ color: "var(--text-strong)" }}
        />
        <button
          onClick={() => {
            onSearch();
            setIsFocused(false);
          }}
          className={cn(
            "flex items-center justify-center font-semibold transition-all duration-200 active:scale-95 cursor-pointer mr-1.5",
            isSticky ? "px-5 py-2 text-sm" : "px-6 py-2.5 text-sm",
          )}
          style={{
            borderRadius: 12,
            background: "var(--zip-teal)",
            color: "#fff",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--zip-teal-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--zip-teal)";
          }}
        >
          Search
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <ul className="py-2" role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={i === highlightIndex}
                className={cn("flex items-center gap-3 px-5 py-3 text-sm cursor-pointer transition-colors duration-150")}
                style={{
                  background: i === highlightIndex ? "rgba(23,166,166,0.10)" : "transparent",
                  color: "var(--text-strong)",
                }}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseLeave={() => setHighlightIndex(-1)}
                onClick={() => {
                  onQueryChange(s);
                  setSuggestions([]);
                  setIsFocused(false);
                  onSearch();
                }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <span>{highlightMatch(s)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
