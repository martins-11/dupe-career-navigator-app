"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { getRoleSuggestions, type RoleSuggestion } from "@/lib/rolesApi";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  isSticky: boolean;
}

export function SearchBar({ query, onQueryChange, onSearch, isSticky }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const q = String(query ?? "");
    const trimmed = q.trim();

    // Abort previous in-flight autocomplete request whenever query changes.
    const controller = new AbortController();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setHighlightIndex(-1);
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    // Debounce typing to avoid excessive network calls.
    // (Backend autocomplete is cheap, but still avoid per-keystroke bursts.)
    const timer = window.setTimeout(async () => {
      try {
        const s = await getRoleSuggestions(trimmed, 5, { signal: controller.signal });
        if (!cancelled) {
          setSuggestions(s);
          setHighlightIndex(-1);
        }
      } catch (err: any) {
        // Ignore abort errors; they are expected when user types quickly.
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
      // Prevent implicit form submissions if this component is ever used inside a <form>.
      e.preventDefault();

      const picked = highlightIndex >= 0 ? suggestions[highlightIndex] : undefined;
      if (picked?.title) {
        onQueryChange(picked.title);
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

  function highlightMatch(text: string | any) {
    if (!text || typeof text !== "string") return text || "";
    if (!query) return text;

    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;

    return (
      <>
        {text.substring(0, idx)}
        <span className="font-bold text-[#0D9488]">{text.substring(idx, idx + query.length)}</span>
        {text.substring(idx + query.length)}
      </>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full max-w-2xl mx-auto"
      // Defensive: if parent wraps this in a form, this prevents refresh on submit.
      onSubmit={(e: any) => e?.preventDefault?.()}
    >
      <div
        className={cn("flex items-center border shadow-sm transition-shadow duration-300", isSticky ? "h-12" : "h-14")}
        style={{
          borderRadius: 12,
          background: "white",
          borderColor: isFocused ? "#0D9488" : "#E2E8F0",
          boxShadow: isFocused ? "0 0 0 2px rgba(13, 148, 136, 0.2)" : "none",
        }}
      >
        <div className="flex items-center justify-center pl-5">
          <Search className="h-5 w-5 text-slate-400" />
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
          className={cn("flex-1 bg-transparent px-4 focus:outline-none text-slate-900", isSticky ? "text-sm" : "text-base")}
        />
        <button
          type="button"
          onClick={() => {
            onSearch();
            setIsFocused(false);
          }}
          className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold px-6 py-2 rounded-xl mr-1.5 transition-all active:scale-95"
        >
          Search
        </button>
      </div>

      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
          <ul className="py-2">
            {suggestions.map((s, i) => (
              <li
                key={s.id || `${s.title}-${i}`}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 text-sm cursor-pointer",
                  i === highlightIndex ? "bg-teal-50 text-[#0D9488]" : "text-slate-700 hover:bg-slate-50"
                )}
                onMouseEnter={() => setHighlightIndex(i)}
                onClick={() => {
                  onQueryChange(s.title);
                  setSuggestions([]);
                  setIsFocused(false);
                  onSearch();
                }}
              >
                <Search className="h-4 w-4 shrink-0 opacity-50" />
                <span>{highlightMatch(s.title)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}