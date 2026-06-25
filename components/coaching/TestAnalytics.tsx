import type { TestClassAnalytics } from "@/lib/coachingTestAnalytics";
import { Users, Clock, UserX, TrendingUp, CheckCircle2, Info } from "lucide-react";
import { mono, Card, StatCard } from "@/components/coaching/ui";

// Whole-class report for one test. Pure presentation — fed by
// getTestClassAnalytics. Uses the neutral coaching-module surfaces (Card /
// StatCard primitives), matching the rest of the redesigned dashboard.

// Red (dire) → amber (shaky) → emerald (solid) by % correct.
function pctTone(pct: number): { text: string; bar: string } {
  if (pct < 40) return { text: "text-red-400", bar: "bg-red-500/70" };
  if (pct < 70) return { text: "text-amber-400", bar: "bg-amber-500/70" };
  return { text: "text-emerald-400", bar: "bg-emerald-500/70" };
}

// Same tone as a hex, for the StatCard icon tile.
function pctHex(pct: number): string {
  if (pct < 40) return "#ef4444";
  if (pct < 70) return "#f59e0b";
  return "#22c55e";
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="border-b border-white/[0.07] px-5 py-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
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
      <div className="mt-6 rounded-[18px] border border-white/[0.07] bg-white/[0.02] px-4 py-10 text-center text-slate-500">
        No submissions yet — class analytics will appear once students submit.
      </div>
    );
  }

  const maxBand = Math.max(...distribution.map((d) => d.count), 1);
  const hasUntagged = topics.some((t) => t.topic === "Untagged");

  const SI = "h-[22px] w-[22px]";
  const stats = [
    { label: "Submitted", value: p.submitted, sub: "of class", icon: <Users className={SI} />, color: "#8b5cf6" },
    { label: "In progress", value: p.inProgress, sub: "students", icon: <Clock className={SI} />, color: "#3b82f6" },
    { label: "Absent", value: p.absent, sub: "students", icon: <UserX className={SI} />, color: "#f59e0b" },
    { label: "Class average", value: `${avgScorePct}%`, sub: "out of 100", icon: <TrendingUp className={SI} />, color: pctHex(avgScorePct) },
    { label: "Completion", value: `${p.completionPct}%`, sub: "tests completed", icon: <CheckCircle2 className={SI} />, color: "#22c55e" },
  ];

  return (
    <div className="mt-6 space-y-5">
      {/* Participation + class average */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} iconColor={s.color} value={s.value} label={s.label} sub={s.sub} />
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
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <p className="text-xs leading-relaxed text-slate-400">
                <span className="font-semibold text-slate-200">“Untagged”</span> = questions with no topic set.
                <br />
                Tag questions in the Bank to sharpen this breakdown.
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* Item analysis */}
      <Panel title="Question analysis" subtitle="Hardest questions first — % of the class who answered correctly">
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-y border-white/[0.07]">
                <th className="px-5 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Question</th>
                <th className="px-3 py-2.5 font-medium">Topic</th>
                <th className="px-3 py-2.5 text-right font-medium">Correct</th>
                <th className="px-3 py-2.5 text-right font-medium">Wrong</th>
                <th className="px-3 py-2.5 text-right font-medium">Skipped</th>
                <th className="px-3 py-2.5 text-right font-medium">Avg Marks</th>
                <th className="px-5 py-2.5 text-right font-medium">Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
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
                    <td className="px-3 py-3 text-right text-slate-400" style={{ fontFamily: mono }}>
                      {it.avgMarks != null ? (
                        <span>
                          <span className="text-slate-200">{it.avgMarks}</span>
                          <span className="text-slate-500"> / {it.maxMarks}</span>
                        </span>
                      ) : it.pending > 0 ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400">
                          {it.pending} pending
                        </span>
                      ) : (
                        "—"
                      )}
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
