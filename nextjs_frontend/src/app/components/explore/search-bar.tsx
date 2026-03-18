"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { getRoleSuggestions, type RoleSuggestion } from "@/lib/rolesApi";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  /**
   * Execute a search for the provided query.
   * If omitted, the parent should interpret it as the current input value.
   */
  onSearch: (q?: string) => void;
  isSticky: boolean;
  /** Optional persona id to enable persona-aware autocomplete. */
  personaId?: string;
}

// PUBLIC_INTERFACE
export function SearchBar({ query, onQueryChange, onSearch, isSticky, personaId }: SearchBarProps) {
  /** Autocomplete search bar (Explore). All colors use semantic theme tokens mapped to the 5-color palette. */
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const q = String(query ?? "");
    const trimmed = q.trim();

    const controller = new AbortController();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setHighlightIndex(-1);
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    const timer = window.setTimeout(async () => {
      try {
        const s = await getRoleSuggestions(trimmed, 5, { signal: controller.signal, personaId });
        if (!cancelled) {
          setSuggestions(s);
          setHighlightIndex(-1);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (!cancelled) {
          setSuggestions([]);
          setHighlightIndex(-1);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, personaId]);

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
      const picked = highlightIndex >= 0 ? suggestions[highlightIndex] : undefined;

      if (picked?.title) {
        onQueryChange(picked.title);
        setSuggestions([]);
        setIsFocused(false);
        onSearch(picked.title);
      } else {
        onSearch(query);
        setIsFocused(false);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  }

  function highlightMatch(text: string | any) {
    if (!text || typeof text !== "string") return text || "";
    if (!query) return text;

    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;

    return (
      <>
        {text.substring(0, idx)}
        <span className="font-bold text-primary">{text.substring(idx, idx + query.length)}</span>
        {text.substring(idx + query.length)}
      </>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto" onSubmit={(e: any) => e?.preventDefault?.()}>
      <div
        className={cn(
          "flex items-center border shadow-sm transition-[box-shadow,border-color] duration-200 bg-background",
          isSticky ? "h-12" : "h-14",
          isFocused ? "border-primary ring-2 ring-ring/50" : "border-border",
        )}
        style={{ borderRadius: 12 }}
      >
        <div className="flex items-center justify-center pl-5">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search job title, skills, or industry..."
          className={cn(
            "flex-1 bg-transparent px-4 focus:outline-none text-foreground placeholder:text-muted-foreground",
            isSticky ? "text-sm" : "text-base",
          )}
        />

        <button
          type="button"
          onClick={() => {
            onSearch(query);
            setIsFocused(false);
          }}
          className={cn(
            "text-primary-foreground font-semibold px-6 py-2 rounded-xl mr-1.5 transition-all active:scale-95",
            "bg-primary hover:bg-primary/90",
          )}
        >
          Search
        </button>
      </div>

      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-popover border border-border shadow-xl rounded-xl overflow-hidden">
          <ul className="py-2">
            {suggestions.map((s, i) => (
              <li
                key={s.id || `${s.title}-${i}`}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 text-sm cursor-pointer",
                  i === highlightIndex ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary",
                )}
                onMouseEnter={() => setHighlightIndex(i)}
                onClick={() => {
                  onQueryChange(s.title);
                  setSuggestions([]);
                  setIsFocused(false);
                  onSearch(s.title);
                }}
              >
                <Search className="h-4 w-4 shrink-0 opacity-60" />
                <span>{highlightMatch(s.title)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
