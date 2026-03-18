import React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';

type BarDatum = {
  label: string;
  value: number; // 0-100
  colorClass: string;
};

function BarChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: BarDatum[];
}) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-[14px] md:text-[15px] font-semibold text-white/90">
          {title}
        </CardTitle>
        <CardDescription className="text-[12.5px] text-white/65">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="flex items-end gap-3 md:gap-4 h-[160px]">
          {data.map((d) => (
            <div key={d.label} className="flex-1 min-w-0 flex flex-col items-center gap-2">
              <div className="w-full h-full flex items-end">
                <div
                  className={[
                    'w-full rounded-xl',
                    // Subtle glass outline
                    'border border-white/10',
                    // Colorful bar surface
                    d.colorClass,
                    // Soft glow
                    'shadow-[0_14px_34px_rgba(0,0,0,0.25)]',
                  ].join(' ')}
                  style={{
                    height: `${Math.max(6, Math.min(100, d.value))}%`,
                    transition: 'height 220ms ease-out',
                  }}
                  aria-label={`${d.label}: ${d.value}%`}
                  role="img"
                  title={`${d.label}: ${d.value}%`}
                />
              </div>

              <div className="text-[11px] md:text-[12px] font-medium text-white/70 truncate max-w-full">
                {d.label}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SkillRing({
  label,
  percent,
  hint,
}: {
  label: string;
  percent: number; // 0-100
  hint: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const size = 170;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-[14px] md:text-[15px] font-semibold text-white/90">
          Skill ring
        </CardTitle>
        <CardDescription className="text-[12.5px] text-white/65">
          Placeholder visualization for demand/fit.
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="flex items-center gap-5">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${clamped}%`}>
              {/* Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="transparent"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth={stroke}
              />
              {/* Progress (gradient) */}
              <defs>
                <linearGradient id="cn-skill-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
                  <stop offset="45%" stopColor="#22C55E" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F97316" stopOpacity="1" />
                </linearGradient>
              </defs>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="transparent"
                stroke="url(#cn-skill-gradient)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 240ms ease-out' }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-[26px] font-semibold text-white/92 leading-none">{clamped}%</div>
              <div className="mt-1 text-[12px] font-medium text-white/70">{label}</div>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-[13px] font-semibold text-white/85">What this means</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/65">
              {hint}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[10px] text-white/55">Momentum</div>
                <div className="text-[12px] font-semibold text-white/85">High</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[10px] text-white/55">Competition</div>
                <div className="text-[12px] font-semibold text-white/85">Medium</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[10px] text-white/55">Signal</div>
                <div className="text-[12px] font-semibold text-white/85">Strong</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// PUBLIC_INTERFACE
export default function Page() {
  /** Market Place: placeholder market trends + visualization page. */

  const demandData: BarDatum[] = [
    { label: 'AI', value: 92, colorClass: 'bg-gradient-to-t from-violet-500/70 to-violet-300/30' },
    { label: 'Data', value: 74, colorClass: 'bg-gradient-to-t from-cyan-500/65 to-cyan-300/30' },
    { label: 'Security', value: 58, colorClass: 'bg-gradient-to-t from-emerald-500/65 to-emerald-300/30' },
    { label: 'Cloud', value: 81, colorClass: 'bg-gradient-to-t from-indigo-500/65 to-indigo-300/30' },
    { label: 'Product', value: 49, colorClass: 'bg-gradient-to-t from-amber-500/65 to-amber-300/30' },
  ];

  const salaryData: BarDatum[] = [
    { label: 'Entry', value: 42, colorClass: 'bg-gradient-to-t from-pink-500/60 to-pink-300/25' },
    { label: 'Mid', value: 68, colorClass: 'bg-gradient-to-t from-orange-500/60 to-orange-300/25' },
    { label: 'Senior', value: 86, colorClass: 'bg-gradient-to-t from-lime-500/55 to-lime-300/25' },
    { label: 'Lead', value: 73, colorClass: 'bg-gradient-to-t from-sky-500/60 to-sky-300/25' },
  ];

  return (
    <main className="min-h-svh px-6 py-8 md:px-10 md:py-10">
      <div className="max-w-6xl">
        <header className="flex flex-col gap-2">
          <h1 className="text-[20px] md:text-[26px] font-semibold text-white/92 tracking-tight">
            Market Place
          </h1>
          <p className="text-[13px] md:text-[14px] text-white/65 max-w-3xl">
            Placeholder market trends dashboard. This page will eventually surface real-time role demand,
            salary signals, and emerging skills relevant to your persona and target role.
          </p>
        </header>

        <section className="mt-7 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BarChart
            title="Market demand snapshot"
            description="Colorful bar chart placeholder (0–100)."
            data={demandData}
          />
          <SkillRing
            label="Overall fit"
            percent={74}
            hint="This ring is a stand-in for a composite score based on skill coverage, market demand, and role adjacency. For now it is static placeholder data."
          />
        </section>

        <section className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BarChart
            title="Salary trend (illustrative)"
            description="Placeholder distribution by seniority band."
            data={salaryData}
          />

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-[14px] md:text-[15px] font-semibold text-white/90">
                Market trends (placeholder)
              </CardTitle>
              <CardDescription className="text-[12.5px] text-white/65">
                Descriptive placeholder copy until real market data is wired in.
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-6">
              <div className="space-y-3 text-[12.5px] leading-relaxed text-white/70">
                <p>
                  <span className="font-semibold text-white/82">Trend:</span> Hiring signals are strongest for
                  cross-functional profiles combining AI + product sense + analytics.
                </p>
                <p>
                  <span className="font-semibold text-white/82">Signal:</span> Cloud and security remain durable
                  demand anchors; niche specialization increases differentiation.
                </p>
                <p>
                  <span className="font-semibold text-white/82">Next:</span> This section will later include
                  market heatmaps, role movement, and skill gap recommendations aligned to your target role.
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[10px] text-white/55">Hot skills</div>
                    <div className="text-[12px] font-semibold text-white/85">LLMOps, Graphs</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[10px] text-white/55">Rising roles</div>
                    <div className="text-[12px] font-semibold text-white/85">AI PM, MLE</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[10px] text-white/55">Geo signal</div>
                    <div className="text-[12px] font-semibold text-white/85">Remote+</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
