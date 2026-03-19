'use client';

import React from 'react';
import { Slider } from '@/app/components/explore/slider';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import type { MindmapFilters } from '@/lib/mindmapApi';

// PUBLIC_INTERFACE
export function MindmapFiltersBar(props: {
  value: MindmapFilters;
  onChange: (next: MindmapFilters) => void;
}) {
  /** Filters bar for mindmap: salary range, skill similarity, time horizon. */
  const { value, onChange } = props;

  const salaryMin = typeof value.salaryMin === 'number' ? value.salaryMin : 0;
  const salaryMax = typeof value.salaryMax === 'number' ? value.salaryMax : 60;

  const similarity = typeof value.skillSimilarityMin === 'number' ? value.skillSimilarityMin : 0.3;
  const similarityPct = Math.round(similarity * 100);

  function setSalary(next: [number, number]) {
    onChange({ ...value, salaryMin: next[0], salaryMax: next[1] });
  }

  function setSimilarity(next: number) {
    onChange({ ...value, skillSimilarityMin: Math.max(0, Math.min(1, next)) });
  }

  function clear() {
    onChange({ salaryMin: 0, salaryMax: 60, skillSimilarityMin: 0.3, timeHorizon: 'Any' });
  }

  return (
    <div
      className="rounded-2xl border bg-white"
      style={{ borderColor: 'rgba(0,0,0,0.10)', boxShadow: 'var(--mindmap-shadow-soft)' }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div
              className="text-[10px] uppercase tracking-[0.16em] font-semibold"
              style={{ color: 'var(--mindmap-text-meta)' }}
            >
              Filters
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={clear} className="h-7 px-2 text-[11px]" style={{ color: 'var(--mindmap-text-meta)' }}>
            Reset
          </Button>
        </div>

        <Separator className="my-3" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'var(--mindmap-text-meta)' }}>
                Salary range
              </span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--mindmap-text-muted)' }}>{`$${salaryMin}k – $${salaryMax}k`}</span>
            </div>
            <Slider min={0} max={60} step={1} value={[salaryMin, salaryMax]} onValueChange={(v) => setSalary(v as [number, number])} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'var(--mindmap-text-meta)' }}>
                Skill similarity
              </span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--mindmap-text-muted)' }}>
                {similarityPct}%+
              </span>
            </div>
            <Slider min={0} max={100} step={1} value={[similarityPct]} onValueChange={(v) => setSimilarity(((v as number[])[0] ?? 30) / 100)} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[11px]" style={{ color: 'var(--mindmap-text-meta)' }}>
              Time horizon
            </div>
            <Select value={(value.timeHorizon ?? 'Any') as any} onValueChange={(v) => onChange({ ...value, timeHorizon: v as any })}>
              <SelectTrigger className="w-full h-9" style={{ borderRadius: 12 }}>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Any</SelectItem>
                <SelectItem value="Near">Near</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="Far">Far</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
