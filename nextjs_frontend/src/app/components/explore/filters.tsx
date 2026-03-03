"use client";

import type React from "react";
import { X } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Slider } from "@/app/components/explore/slider";

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

function TextFilter({
  label,
  value,
  placeholder,
  onChange,
  isCompact,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  isCompact: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "border text-sm transition-all duration-200 w-full focus:outline-none",
          isCompact ? "px-3 py-2" : "px-4 py-2.5",
        )}
        style={{
          borderRadius: 12,
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-strong)",
        }}
      />
    </div>
  );
}

function SkillsInput({
  selected,
  onChange,
  isCompact,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  isCompact: boolean;
}) {
  const value = selected.join(", ");

  function parseSkills(raw: string): string[] {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">Skills</label>
      <input
        value={value}
        onChange={(e) => onChange(parseSkills(e.target.value))}
        placeholder="e.g., React, SQL, Python"
        className={cn(
          "border text-sm transition-all duration-200 w-full focus:outline-none",
          isCompact ? "px-3 py-2" : "px-4 py-2.5",
        )}
        style={{
          borderRadius: 12,
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-strong)",
        }}
      />
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Enter comma-separated skills. These are sent to the backend as <code>skills</code>.
      </p>
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
  /** Backend-driven filters row (no mock option lists): title/industry/skills + salary slider. */
  return (
    <div
      className={cn(
        "w-full max-w-4xl mx-auto grid gap-3",
        isCompact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      <TextFilter
        label="Job Title"
        value={selectedTitle}
        placeholder="e.g., Software Engineer"
        onChange={onTitleChange}
        isCompact={isCompact}
      />
      <TextFilter
        label="Industry"
        value={selectedIndustry}
        placeholder="e.g., Technology"
        onChange={onIndustryChange}
        isCompact={isCompact}
      />
      <SkillsInput selected={selectedSkills} onChange={onSkillsChange} isCompact={isCompact} />
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
  /** Active filter chips row with per-chip remove and clear-all. */
  const tags: { label: string; onRemove: () => void }[] = [];

  if (selectedTitle) tags.push({ label: selectedTitle, onRemove: () => onTitleChange("") });
  if (selectedIndustry) tags.push({ label: selectedIndustry, onRemove: () => onIndustryChange("") });
  selectedSkills.forEach((skill) => {
    tags.push({ label: skill, onRemove: () => onSkillsChange(selectedSkills.filter((s) => s !== skill)) });
  });
  if (salaryRange[0] !== 0 || salaryRange[1] !== 60) {
    tags.push({ label: `₹${salaryRange[0]}L–₹${salaryRange[1]}L`, onRemove: () => onSalaryChange([0, 60]) });
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
      <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto cursor-pointer">
        Clear All
      </button>
    </div>
  );
}
