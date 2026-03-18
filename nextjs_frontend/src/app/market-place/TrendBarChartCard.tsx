'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/app/components/ui/chart';

type TrendDatum = {
  label: string;
  value: number; // 0-100 index
  change: number; // +/- points vs previous period
  color: string; // bar color
};

const data: TrendDatum[] = [
  { label: 'AI Eng', value: 92, change: 8, color: '#7C3AED' }, // violet
  { label: 'Data', value: 81, change: 5, color: '#06B6D4' }, // cyan
  { label: 'Sec', value: 74, change: 3, color: '#10B981' }, // emerald
  { label: 'Cloud', value: 78, change: 2, color: '#2563EB' }, // blue
  { label: 'Product', value: 63, change: -1, color: '#F97316' }, // orange
  { label: 'Design', value: 58, change: 1, color: '#EC4899' }, // pink
];

const chartConfig = {
  value: {
    label: 'Demand index',
    color: '#7C3AED',
  },
} as const;

// PUBLIC_INTERFACE
export default function TrendBarChartCard() {
  /**
   * Renders the “Current trends” colorful bar chart card.
   * Client-only to ensure responsive measurement works correctly.
   */
  return (
    <Card className="border-zinc-200/70 bg-white shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
      <CardHeader className="pb-4">
        <CardTitle className="text-[14px] md:text-[15px] font-semibold text-zinc-950">
          Current trends (demand index)
        </CardTitle>
        <CardDescription className="text-[12.5px] text-zinc-600">
          Composite index (0–100) based on hiring velocity, skill premium, and role adjacency.
          Values shown are illustrative placeholders.
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 items-start">
          <ChartContainer
            config={chartConfig}
            className="h-[280px] w-full rounded-xl border border-zinc-200/70 bg-gradient-to-b from-white to-violet-50/40 p-3"
          >
            <BarChart data={data} margin={{ top: 18, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(24,24,27,0.08)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(24,24,27,0.65)', fontSize: 12 }}
              />
              <YAxis
                width={30}
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(24,24,27,0.55)', fontSize: 12 }}
              />

              <ChartTooltip
                cursor={{ fill: 'rgba(124,58,237,0.07)' }}
                content={
                  <ChartTooltipContent
                    // We want numeric values; label comes from the category
                    labelFormatter={(value) => String(value)}
                    formatter={(val, _name, item) => {
                      const payload = item?.payload as TrendDatum | undefined;
                      const change = payload?.change ?? 0;
                      const sign = change > 0 ? '+' : '';
                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-zinc-600">Demand index</span>
                          <span className="font-mono font-semibold text-zinc-950 tabular-nums">
                            {String(val)}{' '}
                            <span
                              className={[
                                'ml-2 font-sans font-semibold',
                                change >= 0 ? 'text-emerald-600' : 'text-rose-600',
                              ].join(' ')}
                            >
                              ({sign}
                              {change})
                            </span>
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />

              <Bar dataKey="value" radius={[10, 10, 4, 4]}>
                {data.map((d) => (
                  <Cell key={d.label} fill={d.color} fillOpacity={0.9} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  className="fill-zinc-800"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>

          <div className="rounded-xl border border-zinc-200/70 bg-white p-4">
            <div className="text-[12px] font-semibold text-violet-700">Quick interpretation</div>

            <div className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-zinc-700">
              <p>
                <span className="font-semibold text-zinc-950">AI Engineering</span> continues to lead with
                the strongest momentum and highest skill premium.
              </p>
              <p>
                <span className="font-semibold text-zinc-950">Security + Cloud</span> remain durable
                anchors—especially for compliance-heavy industries.
              </p>
              <p>
                <span className="font-semibold text-zinc-950">Product</span> is slightly softer short-term,
                but remains a strong multiplier when paired with AI + analytics.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-zinc-200/70 bg-violet-50 px-3 py-2">
                <div className="text-[10px] text-zinc-600">Coverage</div>
                <div className="text-[12px] font-semibold text-zinc-950">6 segments</div>
              </div>
              <div className="rounded-lg border border-zinc-200/70 bg-white px-3 py-2">
                <div className="text-[10px] text-zinc-600">Updated</div>
                <div className="text-[12px] font-semibold text-zinc-950">This week</div>
              </div>
              <div className="rounded-lg border border-zinc-200/70 bg-white px-3 py-2">
                <div className="text-[10px] text-zinc-600">Signal</div>
                <div className="text-[12px] font-semibold text-zinc-950">Strong</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
