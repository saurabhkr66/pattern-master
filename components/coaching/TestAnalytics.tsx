import type { TestClassAnalytics } from "@/lib/coachingTestAnalytics";
import { mono } from "@/components/coaching/ui";

// Whole-class report for one test. Pure presentation — fed by
// getTestClassAnalytics. Matches the slate aesthetic of the results page it
// lives on (not the redesign Card primitives).

// Red (dire) → amber (shaky) → emerald (solid) by % correct.
function pctTone(pct: number): { text: string; bar: string } {
  if (pct < 40) return { text: "text-red-400", bar: "bg-red-500/70" };
  if (pct < 70) return { text: "text-amber-400", bar: "bg-amber-500/70" };
  return { text: "text-emerald-400", bar: "bg-emerald-500/70" };
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// Labelled horizontal bar with a right-aligned value.
function Bar({
  label,
  meta,
  pct,
  barClass,
  valueClass,
  value,
}: {
  label: string;
  meta?: string;
  pct: number;
  barClass: string;
  valueClass?: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-slate-200">{label}</span>
        <span className={`shrink-0 font-semibold ${valueClass ?? "text-slate-300"}`} style={{ fontFamily: mono }}>
          {value}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      {meta && <p className="mt-1 text-xs text-slate-500">{meta}</p>}
    </div>
  );
}

export default function TestAnalytics({ data }: { data: TestClassAnalytics }) {
  const { participation: p, avgScorePct, distribution, sections, topics, items } = data;

  if (p.submitted === 0) {
    return (
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 px-4 py-10 text-center text-slate-500">
        No submissions yet — class analytics will appear once students submit.
      </div>
    );
  }

  const maxBand = Math.max(...distribution.map((d) => d.count), 1);
  const hasUntagged = topics.some((t) => t.topic === "Untagged");

  const stats = [
    { label: "Submitted", value: p.submitted, cls: "text-white" },
    { label: "In progress", value: p.inProgress, cls: "text-white" },
    { label: "Absent", value: p.absent, cls: p.absent > 0 ? "text-amber-400" : "text-white" },
    { label: "Class avg", value: `${avgScorePct}%`, cls: pctTone(avgScorePct).text },
    { label: "Completion", value: `${p.completionPct}%`, cls: "text-white" },
  ];

  return (
    <div className="mt-6 space-y-5">
      {/* Participation + class average */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold ${s.cls}`} style={{ fontFamily: mono }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Score distribution */}
        <Panel title="Score distribution" subtitle="How submitted scores spread across the class">
          <div className="space-y-3">
            {distribution.map((d) => (
              <Bar
                key={d.label}
                label={d.label}
                pct={(d.count / maxBand) * 100}
                barClass="bg-amber-500/70"
                value={`${d.count}`}
              />
            ))}
          </div>
        </Panel>

        {/* Section performance (multi-section papers only) */}
        {sections.length > 0 && (
          <Panel title="Section performance" subtitle="Average score per section">
            <div className="space-y-3">
              {sections.map((s) => {
                const tone = pctTone(s.avgPct);
                return (
                  <Bar
                    key={s.name}
                    label={s.name}
                    meta={`${s.correct} correct · ${s.wrong} wrong · ${s.skipped} skipped`}
                    pct={s.avgPct}
                    barClass={tone.bar}
                    valueClass={tone.text}
                    value={`${s.avgPct}%`}
                  />
                );
              })}
            </div>
          </Panel>
        )}

        {/* Topic performance */}
        <Panel
          title="Topic performance"
          subtitle="Weakest topics first — where the class struggled"
        >
          <div className="space-y-3">
            {topics.map((t) => {
              const tone = pctTone(t.correctPct);
              return (
                <Bar
                  key={t.topic}
                  label={t.topic}
                  meta={`${t.questions} question${t.questions === 1 ? "" : "s"}`}
                  pct={t.correctPct}
                  barClass={tone.bar}
                  valueClass={tone.text}
                  value={`${t.correctPct}%`}
                />
              );
            })}
          </div>
          {hasUntagged && (
            <p className="mt-4 text-xs text-slate-500">
              “Untagged” = questions with no topic set. Tag questions in the Bank to sharpen this breakdown.
            </p>
          )}
        </Panel>
      </div>

      {/* Item analysis */}
      <Panel title="Question analysis" subtitle="Hardest questions first — % of the class who answered correctly">
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-y border-slate-800">
                <th className="px-5 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Question</th>
                <th className="px-3 py-2.5 font-medium">Topic</th>
                <th className="px-3 py-2.5 text-right font-medium">Correct</th>
                <th className="px-3 py-2.5 text-right font-medium">Wrong</th>
                <th className="px-3 py-2.5 text-right font-medium">Skipped</th>
                <th className="px-5 py-2.5 text-right font-medium">Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {items.map((it) => {
                const tone = pctTone(it.correctPct);
                return (
                  <tr key={it.id} className="text-slate-200">
                    <td className="px-5 py-3 text-slate-500" style={{ fontFamily: mono }}>
                      {it.index}
                    </td>
                    <td className="max-w-[320px] px-3 py-3">
                      <span className="line-clamp-2 text-slate-200">{it.text}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-400">{it.topic ?? "—"}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${tone.text}`} style={{ fontFamily: mono }}>
                      {it.correctPct}%
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400" style={{ fontFamily: mono }}>
                      {it.wrong}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400" style={{ fontFamily: mono }}>
                      {it.skipped}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500" style={{ fontFamily: mono }}>
                      {it.seen}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
