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
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="px-5 py-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Filters</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              Refine visible branches (center role stays fixed)
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={clear} className="text-slate-600">
            Reset
          </Button>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Salary range */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Salary range</span>
              <span className="text-xs font-semibold text-slate-800">{`₹${salaryMin}L – ₹${salaryMax}L`}</span>
            </div>
            <Slider
              min={0}
              max={60}
              step={1}
              value={[salaryMin, salaryMax]}
              onValueChange={(v) => setSalary(v as [number, number])}
            />
          </div>

          {/* Skill similarity */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Skill similarity</span>
              <span className="text-xs font-semibold text-slate-800">{similarityPct}%+</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[similarityPct]}
              onValueChange={(v) => setSimilarity(((v as number[])[0] ?? 30) / 100)}
            />
            <div className="text-[11px] text-slate-500">
              Higher similarity shows roles closer to your current skill set.
            </div>
          </div>

          {/* Time horizon */}
          <div className="flex flex-col gap-2">
            <div className="text-xs text-slate-500">Time horizon</div>
            <Select
              value={(value.timeHorizon ?? 'Any') as any}
              onValueChange={(v) => onChange({ ...value, timeHorizon: v as any })}
            >
              <SelectTrigger className="w-full" style={{ borderRadius: 12 }}>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Any</SelectItem>
                <SelectItem value="Near">Near</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="Far">Far</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-[11px] text-slate-500">Show transitions by expected timeframe.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
