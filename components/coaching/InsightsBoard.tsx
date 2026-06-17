"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp, UserX } from "lucide-react";
import { mono } from "@/components/coaching/ui";
import type { AbsentStudent, InsightStudent, TrendStudent } from "@/lib/coachingInsights";

// Insights panel, adapted from the "Redesign for mobile and web" handoff to the
// app's dark/amber design tokens. Filter tabs + (web) 3-column "All" grid +
// expandable student rows with sparklines and recent-score chips.
//
// The handoff's light theme, "Last 30 days" range, and message/kudos/remind/
// reschedule actions are intentionally omitted — no theme system or messaging/
// scheduling backend exists. The one real action is "View profile" (links to the
// student detail page); "Mark reviewed" is local-only triage state, as it is in
// the prototype.

type GroupKey = "needs" | "improving" | "absent";
type Tab = "all" | GroupKey;

// Semantic colors already used across the coaching admin (red/emerald/amber).
const SEM: Record<GroupKey, { text: string; bg: string; icon: typeof TrendingDown }> = {
  needs: { text: "text-red-400", bg: "bg-red-500/15", icon: TrendingDown },
  improving: { text: "text-emerald-400", bg: "bg-emerald-500/15", icon: TrendingUp },
  absent: { text: "text-amber-400", bg: "bg-amber-500/15", icon: UserX },
};

// Score → semantic tone (same thresholds as the rest of the app).
function scoreTone(n: number): { text: string; bg: string } {
  if (n < 40) return { text: "text-red-400", bg: "bg-red-500/15" };
  if (n < 70) return { text: "text-amber-400", bg: "bg-amber-500/15" };
  return { text: "text-emerald-400", bg: "bg-emerald-500/15" };
}

// Stable per-student hue from the name, for the avatar tint.
function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

// 56×20 polyline normalized min→max with a 3px inset.
function sparkPoints(arr: number[]): string {
  const w = 56, h = 20, p = 3;
  if (!arr || arr.length < 2) return "";
  const mn = Math.min(...arr), mx = Math.max(...arr), rg = mx - mn || 1, st = (w - 2 * p) / (arr.length - 1);
  return arr
    .map((val, i) => `${(p + i * st).toFixed(1)},${(h - p - ((val - mn) / rg) * (h - 2 * p)).toFixed(1)}`)
    .join(" ");
}

export type InsightsBoardData = {
  weak: InsightStudent[];
  improving: TrendStudent[];
  absent: AbsentStudent[];
};

export default function InsightsBoard({ data }: { data: InsightsBoardData }) {
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});

  const counts = { needs: data.weak.length, improving: data.improving.length, absent: data.absent.length };

  const groups = useMemo(
    () =>
      [
        {
          key: "needs" as const,
          title: "Needs attention",
          desc: "Lowest average scores",
          emptyTitle: "Everyone's on track",
          emptyDesc: "No submitted tests yet.",
          students: data.weak,
        },
        {
          key: "improving" as const,
          title: "Improving",
          desc: "Biggest gain from first to latest test",
          emptyTitle: "Not enough history yet",
          emptyDesc: "Improvements show after a few tests.",
          students: data.improving,
        },
        {
          key: "absent" as const,
          title: "Absent",
          desc: "Active students who missed closed tests",
          emptyTitle: "Full attendance",
          emptyDesc: "Everyone has shown up — no missed tests.",
          students: data.absent,
        },
      ],
    [data]
  );

  const visible = tab === "all" ? groups : groups.filter((g) => g.key === tab);
  // Web "All" view fans into 3 columns; mobile / single-group tabs stay stacked.
  const gridCols = tab === "all" ? "lg:grid-cols-3" : "grid-cols-1";

  const tabs: { key: Tab; label: string; count?: number; tone?: GroupKey }[] = [
    { key: "all", label: "All" },
    { key: "needs", label: "Needs attention", count: counts.needs, tone: "needs" },
    { key: "improving", label: "Improving", count: counts.improving, tone: "improving" },
    { key: "absent", label: "Absent", count: counts.absent, tone: "absent" },
  ];

  return (
    <div>
      {/* Filter tabs */}
      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {tabs.map((tb) => {
          const active = tab === tb.key;
          const sem = tb.tone ? SEM[tb.tone] : null;
          return (
            <button
              key={tb.key}
              onClick={() => {
                setTab(tb.key);
                setExpanded(null);
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? sem
                    ? `${sem.bg} ${sem.text} border-transparent`
                    : "border-white/15 bg-white/[0.09] text-slate-100"
                  : "border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              {tb.label}
              {tb.count != null && (
                <span
                  className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                    active ? "" : "bg-white/[0.08] text-slate-400"
                  }`}
                  style={{ fontFamily: mono }}
                >
                  {tb.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Groups */}
      <div className={`grid items-start gap-4 ${gridCols}`}>
        {visible.map((g) => {
          const sem = SEM[g.key];
          const Icon = sem.icon;
          return (
            <section
              key={g.key}
              className="overflow-hidden rounded-2xl border bg-white/[0.025]"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${sem.bg} ${sem.text}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-[15px] font-bold text-white">{g.title}</h2>
                    <span
                      className={`rounded-full px-1.5 py-px text-[11px] font-bold ${sem.bg} ${sem.text}`}
                      style={{ fontFamily: mono }}
                    >
                      {g.students.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{g.desc}</p>
                </div>
              </div>

              {g.students.length > 0 ? (
                <div>
                  {g.students.map((s) => (
                    <StudentRow
                      key={s.id}
                      groupKey={g.key}
                      student={s}
                      expanded={expanded === s.id}
                      reviewed={!!reviewed[s.id]}
                      onToggle={() => setExpanded((id) => (id === s.id ? null : s.id))}
                      onReview={() => setReviewed((r) => ({ ...r, [s.id]: !r[s.id] }))}
                    />
                  ))}
                </div>
              ) : (
                <div className="border-t px-4 py-7 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="text-[13px] font-bold text-white">{g.emptyTitle}</div>
                  <div className="mt-1 text-xs text-slate-400">{g.emptyDesc}</div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function StudentRow({
  groupKey,
  student,
  expanded,
  reviewed,
  onToggle,
  onReview,
}: {
  groupKey: GroupKey;
  student: InsightStudent | TrendStudent | AbsentStudent;
  expanded: boolean;
  reviewed: boolean;
  onToggle: () => void;
  onReview: () => void;
}) {
  const hue = hueOf(student.name);
  const avBg = `hsl(${hue} 42% 24%)`;
  const avFg = `hsl(${hue} 72% 73%)`;

  // Per-group derived presentation.
  let meta: string;
  let spark: number[] | null = null;
  let sparkClass = "";
  let metricText: string;
  let metricTone: { text: string; bg: string };
  let chipsLabel: string;
  let chips: { label: string; text: string; bg: string }[] = [];

  if (groupKey === "needs") {
    const s = student as InsightStudent;
    meta = `${s.testsTaken} test${s.testsTaken === 1 ? "" : "s"}`;
    spark = s.scores;
    sparkClass = "stroke-red-400";
    metricText = `${s.avgPct}% avg`;
    metricTone = { text: "text-red-400", bg: "bg-red-500/15" };
    chipsLabel = "Recent scores";
    chips = s.scores.map((n) => ({ label: `${n}%`, ...scoreTone(n) }));
  } else if (groupKey === "improving") {
    const s = student as TrendStudent;
    meta = `${s.scores.length} tests · now ${s.to}%`;
    spark = s.scores;
    sparkClass = "stroke-emerald-400";
    metricText = `+${s.delta}%`;
    metricTone = { text: "text-emerald-400", bg: "bg-emerald-500/15" };
    chipsLabel = "First → latest";
    chips = s.scores.map((n) => ({ label: `${n}%`, ...scoreTone(n) }));
  } else {
    const s = student as AbsentStudent;
    meta = `${s.missed} closed test${s.missed === 1 ? "" : "s"} missed`;
    metricText = `${s.missed} missed`;
    metricTone = { text: "text-amber-400", bg: "bg-amber-500/15" };
    chipsLabel = "Missed tests";
    chips = s.missedTitles.map((m) => ({ label: m, text: "text-slate-300", bg: "bg-white/[0.06]" }));
  }

  return (
    <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03] sm:px-5"
        style={{ opacity: reviewed ? 0.5 : 1 }}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold"
          style={{ background: avBg, color: avFg }}
        >
          {student.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-white">{student.name}</span>
          <span className="block truncate text-[11.5px] text-slate-500" style={{ fontFamily: mono }}>
            {meta}
          </span>
        </span>
        {spark && spark.length >= 2 && (
          <svg width="56" height="20" viewBox="0 0 56 20" fill="none" className="hidden shrink-0 sm:block">
            <polyline
              points={sparkPoints(spark)}
              fill="none"
              className={sparkClass}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${metricTone.bg} ${metricTone.text}`}
          style={{ fontFamily: mono }}
        >
          {metricText}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-slate-600 transition-transform"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}
        >
          <polyline points="6,4 10,8 6,12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="bg-white/[0.02] px-4 pb-4 pl-[60px] pt-1 sm:px-5 sm:pl-[64px]">
          {chips.length > 0 && (
            <>
              <div className="mb-2 mt-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                {chipsLabel}
              </div>
              <div className="mb-3.5 flex flex-wrap gap-1.5">
                {chips.map((c, i) => (
                  <span
                    key={i}
                    className={`rounded-md px-2 py-0.5 text-[11.5px] font-bold ${c.bg} ${c.text}`}
                    style={{ fontFamily: mono }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/coaching-admin/students/${student.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              View profile
            </Link>
            <button
              onClick={onReview}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                reviewed
                  ? "border-transparent bg-emerald-500/15 text-emerald-400"
                  : "border-white/15 text-slate-200 hover:bg-white/[0.06]"
              }`}
            >
              {reviewed ? "Reviewed ✓" : "Mark reviewed"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
