"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { ALL_SKILLS, INDUSTRIES, JOB_TITLES, ROLES } from "@/app/components/explore/roles-data";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  isSticky: boolean;
}

/**
 * Search bar with autocomplete suggestions.
 * Matches ZIP behavior:
 * - suggestions appear after 2+ characters
 * - arrow key navigation + Enter selection
 * - click outside closes
 * - sticky mode adjusts height + text sizing
 */
export function SearchBar({ query, onQueryChange, onSearch, isSticky }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    const titleMatches = JOB_TITLES.filter((t) => t.toLowerCase().includes(q));
    const skillMatches = ALL_SKILLS.filter((s) => s.toLowerCase().includes(q));
    const industryMatches = INDUSTRIES.filter((i) => i.toLowerCase().includes(q));
    const roleDescMatches = ROLES.filter((r) => r.description.toLowerCase().includes(q)).map((r) => r.title);
    const all = [...new Set([...titleMatches, ...skillMatches, ...industryMatches, ...roleDescMatches])];
    setSuggestions(all.slice(0, 6));
    setHighlightIndex(-1);
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
        className={cn(
          "flex items-center rounded-3xl border bg-card shadow-sm transition-shadow duration-300",
          isFocused && "shadow-md ring-2 ring-primary/20",
          isSticky ? "h-12" : "h-14",
        )}
      >
        <div className="flex items-center justify-center pl-5">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search job title, skills, or industry..."
          className={cn(
            "flex-1 bg-transparent px-4 text-foreground placeholder:text-muted-foreground focus:outline-none",
            isSticky ? "text-sm" : "text-base",
          )}
        />
        <button
          onClick={() => {
            onSearch();
            setIsFocused(false);
          }}
          className={cn(
            "flex items-center justify-center rounded-3xl bg-primary text-primary-foreground font-medium transition-all duration-200 hover:opacity-90 active:scale-95 cursor-pointer mr-1.5",
            isSticky ? "px-5 py-2 text-sm" : "px-6 py-2.5 text-sm",
          )}
        >
          Search
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="py-2" role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={i === highlightIndex}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 text-sm cursor-pointer transition-colors duration-150",
                  i === highlightIndex ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-secondary/60",
                )}
                onMouseEnter={() => setHighlightIndex(i)}
                onClick={() => {
                  onQueryChange(s);
                  setSuggestions([]);
                  setIsFocused(false);
                  onSearch();
                }}
              >
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{highlightMatch(s)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
