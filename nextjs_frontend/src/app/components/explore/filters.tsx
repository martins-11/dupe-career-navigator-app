"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Slider } from "@/app/components/explore/slider";
import { ALL_SKILLS, INDUSTRIES, JOB_TITLES } from "@/app/components/explore/roles-data";

interface FiltersProps {
  selectedTitle: string;
  onTitleChange: (v: string) => void;
  selectedIndustry: string;
  onIndustryChange: (v: string) => void;
  selectedSkills: string[];
  onSkillsChange: (v: string[]) => void;
  salaryRange: [number, number];
  onSalaryChange: (v: [number, number]) => void;
  isCompact: boolean;
}

function FilterDropdown({
  label,
  value,
  options,
  onSelect,
  isCompact,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  isCompact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-2xl border bg-card text-sm transition-all duration-200 cursor-pointer w-full",
          open && "ring-2 ring-primary/20 border-primary/30",
          isCompact ? "px-3 py-2" : "px-4 py-2.5",
        )}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || label}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-2xl border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 max-h-56 overflow-y-auto">
          <ul className="py-1.5">
            <li
              className="px-4 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-secondary/60 transition-colors"
              onClick={() => {
                onSelect("");
                setOpen(false);
              }}
            >
              All
            </li>
            {options.map((opt) => (
              <li
                key={opt}
                className={cn(
                  "px-4 py-2 text-sm cursor-pointer transition-colors duration-150",
                  value === opt ? "bg-secondary text-secondary-foreground font-medium" : "text-foreground hover:bg-secondary/60",
                )}
                onClick={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SkillsDropdown({
  selected,
  onChange,
  isCompact,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  isCompact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(skill: string) {
    if (selected.includes(skill)) {
      onChange(selected.filter((s) => s !== skill));
    } else {
      onChange([...selected, skill]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-2xl border bg-card text-sm transition-all duration-200 cursor-pointer w-full",
          open && "ring-2 ring-primary/20 border-primary/30",
          isCompact ? "px-3 py-2" : "px-4 py-2.5",
        )}
      >
        <span className={selected.length > 0 ? "text-foreground" : "text-muted-foreground"}>
          {selected.length > 0 ? `${selected.length} skill${selected.length > 1 ? "s" : ""} selected` : "Required Skills"}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-2xl border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 max-h-56 overflow-y-auto">
          <ul className="py-1.5">
            {ALL_SKILLS.map((skill) => {
              const isSelected = selected.includes(skill);
              return (
                <li
                  key={skill}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm cursor-pointer transition-colors duration-150",
                    isSelected ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-secondary/60",
                  )}
                  onClick={() => toggle(skill)}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center transition-colors duration-200 shrink-0",
                      isSelected ? "bg-primary border-primary" : "border-border",
                    )}
                  >
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  {skill}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// PUBLIC_INTERFACE
export function Filters({
  selectedTitle,
  onTitleChange,
  selectedIndustry,
  onIndustryChange,
  selectedSkills,
  onSkillsChange,
  salaryRange,
  onSalaryChange,
  isCompact,
}: FiltersProps) {
  /** ZIP-matching filters row: 3 dropdowns + salary slider. */
  return (
    <div
      className={cn(
        "w-full max-w-4xl mx-auto grid gap-3",
        isCompact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      <FilterDropdown
        label="Job Title"
        value={selectedTitle}
        options={JOB_TITLES}
        onSelect={onTitleChange}
        isCompact={isCompact}
      />
      <FilterDropdown
        label="Industry"
        value={selectedIndustry}
        options={INDUSTRIES}
        onSelect={onIndustryChange}
        isCompact={isCompact}
      />
      <SkillsDropdown selected={selectedSkills} onChange={onSkillsChange} isCompact={isCompact} />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Salary Range</span>
          <span className="text-xs font-medium text-foreground">{`₹${salaryRange[0]}L – ₹${salaryRange[1]}L`}</span>
        </div>
        <Slider
          min={0}
          max={60}
          step={1}
          value={salaryRange}
          onValueChange={(v) => onSalaryChange(v as [number, number])}
          className="w-full"
        />
      </div>
    </div>
  );
}

interface ActiveFilterTagsProps {
  selectedTitle: string;
  onTitleChange: (v: string) => void;
  selectedIndustry: string;
  onIndustryChange: (v: string) => void;
  selectedSkills: string[];
  onSkillsChange: (v: string[]) => void;
  salaryRange: [number, number];
  onSalaryChange: (v: [number, number]) => void;
}

// PUBLIC_INTERFACE
export function ActiveFilterTags({
  selectedTitle,
  onTitleChange,
  selectedIndustry,
  onIndustryChange,
  selectedSkills,
  onSkillsChange,
  salaryRange,
  onSalaryChange,
}: ActiveFilterTagsProps) {
  /** ZIP-matching active filter chips row with per-chip remove and clear-all. */
  const tags: { label: string; onRemove: () => void }[] = [];

  if (selectedTitle) {
    tags.push({ label: selectedTitle, onRemove: () => onTitleChange("") });
  }
  if (selectedIndustry) {
    tags.push({ label: selectedIndustry, onRemove: () => onIndustryChange("") });
  }
  selectedSkills.forEach((skill) => {
    tags.push({
      label: skill,
      onRemove: () => onSkillsChange(selectedSkills.filter((s) => s !== skill)),
    });
  });
  if (salaryRange[0] !== 0 || salaryRange[1] !== 60) {
    tags.push({
      label: `₹${salaryRange[0]}L–${salaryRange[1]}L`,
      onRemove: () => onSalaryChange([0, 60]),
    });
  }

  if (tags.length === 0) return null;

  function clearAll() {
    onTitleChange("");
    onIndustryChange("");
    onSkillsChange([]);
    onSalaryChange([0, 60]);
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-xs font-medium animate-in fade-in zoom-in-95 duration-200"
        >
          {tag.label}
          <button
            onClick={tag.onRemove}
            className="inline-flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors p-0.5 cursor-pointer"
            aria-label={`Remove ${tag.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        onClick={clearAll}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto cursor-pointer"
      >
        Clear All
      </button>
    </div>
  );
}
