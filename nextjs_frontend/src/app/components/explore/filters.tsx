"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, RotateCcw, X } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Slider } from "@/app/components/explore/slider";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Skeleton } from "@/app/components/ui/skeleton";

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

  /**
   * Structured options fetched from backend endpoints:
   * - GET /api/roles/industries
   * - GET /api/roles/skills
   * - (optional) GET /api/roles/job-titles
   */
  industryOptions: string[];
  skillsOptions: string[];
  jobTitleOptions?: string[] | null;

  isLoadingOptions: boolean;
  optionsError: string | null;

  /** If true, the Job Title dropdown is rendered (backend endpoint present). */
  showJobTitleFilter: boolean;
}

function FieldLabel({ children }: { children: string }) {
  return <label className="text-xs text-muted-foreground">{children}</label>;
}

function FieldShell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

function LoadingField({ label, isCompact }: { label: string; isCompact: boolean }) {
  return (
    <FieldShell>
      <FieldLabel>{label}</FieldLabel>
      <Skeleton className={cn("w-full", isCompact ? "h-9" : "h-10")} />
    </FieldShell>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div
      className="text-[11px] rounded-lg px-3 py-2"
      style={{
        background: "rgba(var(--cn-primary-rgb), 0.08)",
        border: "1px solid rgba(var(--cn-primary-rgb), 0.20)",
        color: "var(--text-body)",
      }}
      role="alert"
    >
      {message}
    </div>
  );
}

function StructuredSelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  isCompact,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  isCompact: boolean;
  disabled?: boolean;
}) {
  const normalizedOptions = useMemo(
    () =>
      [...new Set((Array.isArray(options) ? options : []).map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [options],
  );

  return (
    <FieldShell>
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={value || "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger
          size={isCompact ? "sm" : "default"}
          className="w-full"
          style={{
            borderRadius: 12,
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-strong)",
          }}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {normalizedOptions.length === 0 ? (
            <SelectItem value="__none__" disabled>
              No options available
            </SelectItem>
          ) : (
            normalizedOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

function MultiSelectSkills({
  label,
  placeholder,
  selected,
  onChange,
  options,
  isCompact,
  disabled,
}: {
  label: string;
  placeholder: string;
  selected: string[];
  onChange: (v: string[]) => void;
  options: string[];
  isCompact: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const normalizedOptions = useMemo(
    () => [...new Set(options.map((s) => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [options],
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggleSkill(skill: string) {
    if (selectedSet.has(skill)) {
      onChange(selected.filter((s) => s !== skill));
    } else {
      onChange([...selected, skill]);
    }
  }

  function clear() {
    onChange([]);
  }

  const buttonText =
    selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} skills`;

  return (
    <FieldShell>
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={clear}
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "border text-sm transition-all duration-200 w-full focus:outline-none flex items-center justify-between gap-2",
              isCompact ? "px-3 py-2" : "px-4 py-2.5",
              disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            )}
            style={{
              borderRadius: 12,
              background: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-strong)",
            }}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="truncate text-left">{buttonText}</span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="p-0 w-[--radix-popover-trigger-width]"
          style={{ borderRadius: 12 }}
        >
          <Command>
            <CommandInput placeholder="Search skills..." />
            <CommandList>
              <CommandEmpty>
                {normalizedOptions.length === 0 ? "No skills available." : "No matching skills."}
              </CommandEmpty>
              <CommandGroup>
                {normalizedOptions.map((skill) => {
                  const isSelected = selectedSet.has(skill);
                  return (
                    <CommandItem
                      key={skill}
                      value={skill}
                      onSelect={() => toggleSkill(skill)}
                      className="cursor-pointer"
                    >
                      <span
                        className={cn(
                          "mr-2 inline-flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected ? "bg-primary text-primary-foreground border-primary" : "border-muted",
                        )}
                        aria-hidden="true"
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="truncate">{skill}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>

          {selected.length > 0 && (
            <div className="border-t p-2 flex flex-wrap gap-1.5">
              {selected.slice(0, 6).map((s) => (
                <Badge key={s} variant="secondary" className="max-w-full">
                  <span className="truncate max-w-[220px]">{s}</span>
                  <button
                    type="button"
                    className="ml-1 rounded-sm hover:bg-primary/10 p-0.5 cursor-pointer"
                    onClick={() => onChange(selected.filter((x) => x !== s))}
                    aria-label={`Remove ${s}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selected.length > 6 && (
                <span className="text-[11px] text-muted-foreground px-1.5 py-1">
                  +{selected.length - 6} more
                </span>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}

// PUBLIC_INTERFACE
export function Filters(props: FiltersProps) {
  /**
   * Backend-driven filters row:
   * - Job Title: structured select (optional; only shown if backend supports /api/roles/job-titles)
   * - Industry: structured select
   * - Skills: structured multi-select
   * - Salary: slider
   *
   * No free-text inputs and no mock values.
   */
  const {
    selectedTitle,
    onTitleChange,
    selectedIndustry,
    onIndustryChange,
    selectedSkills,
    onSkillsChange,
    salaryRange,
    onSalaryChange,
    isCompact,
    industryOptions,
    skillsOptions,
    jobTitleOptions,
    isLoadingOptions,
    optionsError,
    showJobTitleFilter,
  } = props;

  if (isLoadingOptions) {
    return (
      <div
        className={cn(
          "w-full max-w-4xl mx-auto grid gap-3",
          isCompact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {showJobTitleFilter ? <LoadingField label="Job Title" isCompact={isCompact} /> : null}
        <LoadingField label="Industry" isCompact={isCompact} />
        <LoadingField label="Skills" isCompact={isCompact} />
        <LoadingField label="Salary Range" isCompact={isCompact} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2">
      {optionsError ? (
        <InlineError message={`Couldn’t load filter options. ${optionsError}`} />
      ) : null}

      <div
        className={cn(
          "grid gap-3",
          isCompact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {showJobTitleFilter ? (
          <StructuredSelect
            label="Job Title"
            placeholder="Select a job title"
            value={selectedTitle}
            onChange={onTitleChange}
            options={jobTitleOptions ?? []}
            isCompact={isCompact}
            disabled={!!optionsError}
          />
        ) : null}

        <StructuredSelect
          label="Industry"
          placeholder="Select an industry"
          value={selectedIndustry}
          onChange={onIndustryChange}
          options={industryOptions}
          isCompact={isCompact}
          disabled={!!optionsError}
        />

        <MultiSelectSkills
          label="Skills"
          placeholder="Select skills"
          selected={selectedSkills}
          onChange={onSkillsChange}
          options={skillsOptions}
          isCompact={isCompact}
          disabled={!!optionsError}
        />

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
  const tags: { key: string; label: string; onRemove: () => void }[] = [];

  if (selectedTitle) tags.push({ key: `title:${selectedTitle}`, label: selectedTitle, onRemove: () => onTitleChange("") });
  if (selectedIndustry)
    tags.push({
      key: `industry:${selectedIndustry}`,
      label: selectedIndustry,
      onRemove: () => onIndustryChange(""),
    });
  selectedSkills.forEach((skill) => {
    tags.push({
      key: `skill:${skill}`,
      label: skill,
      onRemove: () => onSkillsChange(selectedSkills.filter((s) => s !== skill)),
    });
  });
  if (salaryRange[0] !== 0 || salaryRange[1] !== 60) {
    tags.push({
      key: `salary:${salaryRange[0]}-${salaryRange[1]}`,
      label: `₹${salaryRange[0]}L–₹${salaryRange[1]}L`,
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
          key={tag.key}
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clearAll}
        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Clear All
      </Button>
    </div>
  );
}
