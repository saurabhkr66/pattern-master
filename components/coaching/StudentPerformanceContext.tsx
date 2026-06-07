import { Trophy } from "lucide-react";
import { Card, AMBER_GRAD, AMBER_GLOW, display, mono } from "@/components/coaching/ui";
import TrendChart from "@/components/coaching/TrendChart";
import type { PeerStats } from "@/lib/coachingPeerStats";

// Student-facing "where do I stand" banner, rendered above the coaching result
// analysis. Shows Rank, Percentile, Class Avg vs You, and an improvement trend —
// the shareable status students care about. Dark/amber theme, matches the
// student dashboard + leaderboard. Server component (pure presentation).

export default function StudentPerformanceContext({ stats }: { stats: PeerStats }) {
  const { rank, totalStudents, percentile, yourPct, classAvgPct, trend } = stats;
  const hasCohort = totalStudents > 1;
  const aboveClass = yourPct >= classAvgPct;

  // Trend points: "Test 1", "Test 2", … keep the axis compact regardless of title.
  const trendPoints = trend.map((t, i) => ({ label: `Test ${i + 1}`, pct: t.pct }));

  return (
    <div className="mx-auto w-full max-w-7xl px-6 pt-6 md:px-10 md:pt-10">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ background: AMBER_GRAD, boxShadow: AMBER_GLOW }}
        >
          <Trophy className="h-4 w-4 text-[#1a1205]" />
        </span>
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: display }}>
          Your standing
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Rank + Percentile */}
        <Card glow>
          <div className="grid h-full grid-cols-2 divide-x divide-white/[0.06]">
            <div className="px-5 py-5">
              <p className="text-xs font-medium text-slate-400">Rank</p>
              {hasCohort ? (
                <p className="mt-2">
                  <span className="font-bold text-amber-400" style={{ fontFamily: display, fontSize: 30 }}>
                    #{rank}
                  </span>
                  <span className="ml-1.5 text-sm text-slate-400">/ {totalStudents}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">First to finish 🎉</p>
              )}
            </div>
            <div className="px-5 py-5">
              <p className="text-xs font-medium text-slate-400">Percentile</p>
              {hasCohort ? (
                <p className="mt-2">
                  <span className="font-bold text-white" style={{ fontFamily: display, fontSize: 30 }}>
                    {percentile}
                  </span>
                  <span className="ml-1 text-sm text-slate-400">pct</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">—</p>
              )}
            </div>
          </div>
        </Card>

        {/* Class Avg vs You */}
        <Card>
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-slate-400">You vs class average</p>
            <div className="mt-4 space-y-3">
              <CompareBar label="Class avg" pct={classAvgPct} highlight={false} />
              <CompareBar label="You" pct={yourPct} highlight />
            </div>
            {hasCohort && (
              <p className="mt-3 text-xs text-slate-400">
                {aboveClass ? (
                  <span className="text-emerald-400">
                    +{yourPct - classAvgPct}% above the class average
                  </span>
                ) : (
                  <span className="text-amber-400">
                    {classAvgPct - yourPct}% below the class average
                  </span>
                )}
              </p>
            )}
          </div>
        </Card>

        {/* Improvement trend (hidden until there are ≥2 tests) */}
        <Card>
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-slate-400">Improvement trend</p>
            {trendPoints.length >= 2 ? (
              <div className="mt-2">
                <TrendChart points={trendPoints} />
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-500">
                Take another test to see your progress over time.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Horizontal score bar. "You" is amber-filled; the class average is muted.
function CompareBar({ label, pct, highlight }: { label: string; pct: number; highlight: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span
          className={`text-xs font-semibold ${highlight ? "text-amber-400" : "text-slate-300"}`}
          style={{ fontFamily: mono }}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: highlight ? AMBER_GRAD : "rgba(148,163,184,0.55)",
          }}
        />
      </div>
    </div>
  );
}
