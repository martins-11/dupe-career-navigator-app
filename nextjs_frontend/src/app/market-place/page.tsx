import React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import TrendBarChartCard from '@/app/market-place/TrendBarChartCard';
import MvpSafePlaceholder from '@/app/components/MvpSafePlaceholder';

type Kpi = {
  label: string;
  value: string;
  delta: string;
  deltaTone: 'up' | 'down' | 'flat';
  footnote: string;
};

function deltaToneClasses(tone: Kpi['deltaTone']): string {
  if (tone === 'up') return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
  if (tone === 'down') return 'bg-rose-50 text-rose-700 border-rose-200/70';
  return 'bg-zinc-50 text-zinc-700 border-zinc-200/70';
}

function StatCard({ kpi }: { kpi: Kpi }) {
  return (
    <Card className="border-zinc-200/70 bg-white shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-[12.5px] font-semibold text-zinc-800">
          {kpi.label}
        </CardTitle>
        <CardDescription className="text-[11.5px] text-zinc-500">
          {kpi.footnote}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-5">
        <div className="flex items-end justify-between gap-3">
          <div className="text-[22px] md:text-[26px] font-semibold text-zinc-950 tracking-tight">
            {kpi.value}
          </div>

          <div
            className={[
              'rounded-full border px-2.5 py-1',
              'text-[11.5px] font-semibold tabular-nums',
              deltaToneClasses(kpi.deltaTone),
            ].join(' ')}
            aria-label={`Change: ${kpi.delta}`}
            title={`Change: ${kpi.delta}`}
          >
            {kpi.delta}
          </div>
        </div>

        <div className="mt-3 h-px w-full bg-zinc-100" />

        <div className="mt-3 text-[12px] text-zinc-600 leading-relaxed">
          <span className="font-semibold text-violet-700">Violet signal:</span>{' '}
          Interpretable metrics tuned for role targeting and persona alignment.
        </div>
      </CardContent>
    </Card>
  );
}

// PUBLIC_INTERFACE
export default function Page() {
  /** Market Place: professional, statistics-focused market analytics dashboard (placeholder data). */

  const kpis: Kpi[] = [
    {
      label: 'Open roles indexed',
      value: '18.2K',
      delta: '+6.4%',
      deltaTone: 'up',
      footnote: 'Illustrative count across tracked segments',
    },
    {
      label: 'Demand score (overall)',
      value: '78/100',
      delta: '+3 pts',
      deltaTone: 'up',
      footnote: 'Composite score: velocity + premium + adjacency',
    },
    {
      label: 'Median salary (US)',
      value: '$156K',
      delta: '+1.9%',
      deltaTone: 'up',
      footnote: 'Estimated median; placeholders until data is wired',
    },
    {
      label: 'Competition index',
      value: '0.62',
      delta: '−0.03',
      deltaTone: 'down',
      footnote: 'Lower is better (fewer qualified applicants per role)',
    },
  ];

  const movers = [
    { segment: 'AI Engineering', note: 'Highest momentum; strongest growth in infra + applied roles.' },
    { segment: 'Data', note: 'Stable demand; premium rising for orchestration + governance skills.' },
    { segment: 'Security', note: 'Durable demand; compliance-heavy verticals lead the velocity.' },
    { segment: 'Cloud', note: 'Strong baseline; cost-optimization and platform roles trending.' },
    { segment: 'Product', note: 'Softer short-term, but cross-functional AI PM remains resilient.' },
  ];

  return (
    <div className="min-h-svh">
      <MvpSafePlaceholder
        title="Market Place (Non‑MVP)"
        description="This analytics dashboard is available as a preview, but it is not required to complete the MVP persona → recommendations flow."
        statusLabel="MVP‑safe"
        actions={[
          { label: 'Continue MVP flow: Ingestion', href: '/ingestion', variant: 'default' },
          { label: 'Explore roles (MVP)', href: '/explore', variant: 'outline' },
          { label: 'Mind map (optional)', href: '/mindmap', variant: 'outline' },
        ]}
      >
        This page currently uses placeholder market signals (no external marketplace integrations required for MVP).
      </MvpSafePlaceholder>

      <main className="px-6 py-8 md:px-10 md:py-10 text-zinc-900">
        <div className="max-w-6xl">
          {/* Header */}
          <div className="rounded-3xl border border-zinc-200/70 bg-gradient-to-b from-white to-violet-50/50 p-6 md:p-8 shadow-[0_12px_34px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-2">
              <div className="text-[11.5px] font-semibold tracking-wide text-violet-700">
                MARKET PLACE • ANALYTICS (Preview)
              </div>

            <h1 className="text-[22px] md:text-[30px] font-semibold tracking-tight text-zinc-950">
              Market intelligence dashboard
            </h1>

            <p className="text-[13px] md:text-[14px] text-zinc-600 max-w-3xl leading-relaxed">
              A statistics-first view of what’s trending: demand, salary signals, and role segment momentum.
              This page uses placeholder values today and is designed to seamlessly swap in real-time data later.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1 text-[12px] font-semibold text-violet-700">
                Timeframe: 6 weeks
              </span>
              <span className="rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-[12px] font-semibold text-zinc-700">
                Region: US + Remote
              </span>
              <span className="rounded-full border border-zinc-200/70 bg-white px-3 py-1 text-[12px] font-semibold text-zinc-700">
                Signal: Hiring + Skills
              </span>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <StatCard key={k.label} kpi={k} />
          ))}
        </section>

        {/* Trends chart */}
        <section className="mt-6">
          <TrendBarChartCard />
        </section>

        {/* Bottom: movers + table */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-zinc-200/70 bg-white shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] md:text-[15px] font-semibold text-zinc-950">
                Segment movers (notes)
              </CardTitle>
              <CardDescription className="text-[12.5px] text-zinc-600">
                Clean, executive-style takeaways with violet accents.
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-6">
              <div className="space-y-3">
                {movers.map((m) => (
                  <div
                    key={m.segment}
                    className="rounded-xl border border-zinc-200/70 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[12.5px] font-semibold text-violet-700">
                          {m.segment}
                        </div>
                        <div className="mt-1 text-[12.5px] text-zinc-700 leading-relaxed">
                          {m.note}
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-xl border border-violet-200/70 bg-violet-50 flex items-center justify-center text-[12px] font-semibold text-violet-700">
                        ↑
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-zinc-200/70 bg-gradient-to-b from-white to-violet-50/40 px-4 py-3">
                <div className="text-[12px] font-semibold text-zinc-950">How to use this</div>
                <p className="mt-1 text-[12.5px] text-zinc-700 leading-relaxed">
                  Pick a target role family with high demand and then prioritize skills with the highest
                  premium. The dashboard is structured so you can quickly compare segments without reading
                  dense text.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200/70 bg-white shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] md:text-[15px] font-semibold text-zinc-950">
                Snapshot table (statistical view)
              </CardTitle>
              <CardDescription className="text-[12.5px] text-zinc-600">
                A compact, numbers-forward breakdown to complement the chart.
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-6">
              <div className="overflow-hidden rounded-xl border border-zinc-200/70">
                <table className="w-full text-sm">
                  <thead className="bg-violet-50/60">
                    <tr className="border-b border-zinc-200/70">
                      <th className="px-3 py-2 text-left text-[12px] font-semibold text-zinc-800">
                        Segment
                      </th>
                      <th className="px-3 py-2 text-right text-[12px] font-semibold text-zinc-800">
                        Demand
                      </th>
                      <th className="px-3 py-2 text-right text-[12px] font-semibold text-zinc-800">
                        Salary index
                      </th>
                      <th className="px-3 py-2 text-right text-[12px] font-semibold text-zinc-800">
                        Δ (pts)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {[
                      { s: 'AI Engineering', d: 92, sal: 88, delta: '+8' },
                      { s: 'Data', d: 81, sal: 76, delta: '+5' },
                      { s: 'Security', d: 74, sal: 79, delta: '+3' },
                      { s: 'Cloud', d: 78, sal: 72, delta: '+2' },
                      { s: 'Product', d: 63, sal: 69, delta: '−1' },
                      { s: 'Design', d: 58, sal: 61, delta: '+1' },
                    ].map((r) => (
                      <tr key={r.s} className="border-b border-zinc-100 last:border-0">
                        <td className="px-3 py-2 text-[12.5px] font-semibold text-zinc-900">
                          {r.s}
                        </td>
                        <td className="px-3 py-2 text-right text-[12.5px] font-mono text-zinc-900 tabular-nums">
                          {r.d}
                        </td>
                        <td className="px-3 py-2 text-right text-[12.5px] font-mono text-zinc-900 tabular-nums">
                          {r.sal}
                        </td>
                        <td className="px-3 py-2 text-right text-[12.5px] font-semibold tabular-nums">
                          <span
                            className={[
                              'rounded-full border px-2 py-0.5',
                              r.delta.startsWith('+')
                                ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700'
                                : r.delta.startsWith('−')
                                  ? 'border-rose-200/70 bg-rose-50 text-rose-700'
                                  : 'border-zinc-200/70 bg-zinc-50 text-zinc-700',
                            ].join(' ')}
                          >
                            {r.delta}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-zinc-200/70 bg-white px-3 py-2">
                  <div className="text-[10px] text-zinc-600">Top driver</div>
                  <div className="text-[12px] font-semibold text-zinc-950">AI infra</div>
                </div>
                <div className="rounded-xl border border-zinc-200/70 bg-white px-3 py-2">
                  <div className="text-[10px] text-zinc-600">Risk</div>
                  <div className="text-[12px] font-semibold text-zinc-950">Skill gap</div>
                </div>
                <div className="rounded-xl border border-zinc-200/70 bg-violet-50 px-3 py-2">
                  <div className="text-[10px] text-zinc-600">Action</div>
                  <div className="text-[12px] font-semibold text-violet-700">Upskill</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        </div>
      </main>
    </div>
  );
}
