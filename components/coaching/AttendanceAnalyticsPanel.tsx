"use client";

import Link from "next/link";
import { AlertTriangle, CalendarRange, ScatterChart, TrendingDown } from "lucide-react";
import { Card, Pill, StatCard, display, mono } from "@/components/coaching/ui";
import TrendChart from "@/components/coaching/TrendChart";
import type { AttendanceAnalytics } from "@/lib/coachingAttendanceData";

// Presentational analytics for the admin attendance page: four panels derived
// server-side in lib/coachingAttendanceData (no fetching here). Matches the
// coaching admin dark/amber design tokens.

const AT_RISK = 75; // keep in lock-step with ATTENDANCE_AT_RISK (×100) in the data layer

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

// Attendance-% → tone (red below 50, amber below the at-risk line, green above).
function pctTone(n: number): "danger" | "amber" | "success" {
  if (n < 50) return "danger";
  if (n < AT_RISK) return "amber";
  return "success";
}

export default function AttendanceAnalyticsPanel({ analytics }: { analytics: AttendanceAnalytics }) {
  const { belowThreshold, streaks, monthly, correlation } = analytics;

  return (
    <div className="space-y-10">
      <BelowThreshold rows={belowThreshold} />
      <Streaks rows={streaks} />
      <MonthlyTrend monthly={monthly} />
      <Correlation rows={correlation} />
    </div>
  );
}

// ── section header ─────────────────────────────────────────────────────────────
function SectionHead({
  icon,
  title,
  desc,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  count?: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/12 text-amber-400">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white" style={{ fontFamily: display }}>
          {title}
          {count != null && count > 0 && (
            <span
              className="rounded-full bg-white/[0.08] px-1.5 py-px text-[11px] font-bold text-slate-300"
              style={{ fontFamily: mono }}
            >
              {count}
            </span>
          )}
        </h2>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <div className="px-6 py-10 text-center text-sm text-slate-400">{children}</div>
    </Card>
  );
}

// ── 1. below threshold ──────────────────────────────────────────────────────────
function BelowThreshold({ rows }: { rows: AttendanceAnalytics["belowThreshold"] }) {
  return (
    <section>
      <SectionHead
        icon={<TrendingDown className="h-5 w-5" />}
        title={`Below ${AT_RISK}%`}
        desc="Active students under the at-risk attendance line (last 6 months)"
        count={rows.length}
      />
      {rows.length === 0 ? (
        <Empty>Everyone is above {AT_RISK}% — no students at risk.</Empty>
      ) : (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {rows.map((s) => (
              <Link
                key={s.id}
                href={`/coaching-admin/students/${s.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.batchName}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-slate-500" style={{ fontFamily: mono }}>
                    {s.present}/{s.total}
                  </span>
                  <Pill tone={pctTone(s.percent)}>{s.percent}%</Pill>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

// ── 2. consecutive absences ──────────────────────────────────────────────────────
function Streaks({ rows }: { rows: AttendanceAnalytics["streaks"] }) {
  return (
    <section>
      <SectionHead
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Consecutive absences"
        desc="Active students currently on a run of missed days"
        count={rows.length}
      />
      {rows.length === 0 ? (
        <Empty>No active absence streaks right now.</Empty>
      ) : (
        <div
          className="overflow-hidden rounded-[18px] border"
          style={{ borderColor: "rgba(239,68,68,0.22)", background: "linear-gradient(180deg,#ef444414,#0f1218 55%)" }}
        >
          <div className="divide-y divide-white/[0.06]">
            {rows.map((s) => (
              <Link
                key={s.id}
                href={`/coaching-admin/students/${s.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.batchName}
                    {" · "}
                    {s.lastPresentDate ? `last seen ${fmtDate(s.lastPresentDate)}` : "no recent attendance"}
                  </div>
                </div>
                <Pill tone="danger" dot>
                  {s.consecutiveAbsences} in a row
                </Pill>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── 3. monthly trend ─────────────────────────────────────────────────────────────
function MonthlyTrend({ monthly }: { monthly: AttendanceAnalytics["monthly"] }) {
  const withData = monthly.filter((m) => m.total > 0);
  const best = withData.reduce<typeof withData[number] | null>((b, m) => (!b || m.percent > b.percent ? m : b), null);
  const worst = withData.reduce<typeof withData[number] | null>((w, m) => (!w || m.percent < w.percent ? m : w), null);
  const avg =
    withData.length > 0 ? Math.round(withData.reduce((s, m) => s + m.percent, 0) / withData.length) : 0;

  return (
    <section>
      <SectionHead
        icon={<CalendarRange className="h-5 w-5" />}
        title="Monthly attendance"
        desc="Coaching-wide attendance rate, last 6 months"
      />
      {withData.length === 0 ? (
        <Empty>Mark attendance for a few days to see monthly trends.</Empty>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <StatCard label="Average" value={`${avg}%`} sub="across months with data" />
            <StatCard label="Best month" value={best ? `${best.percent}%` : "—"} sub={best?.month} />
            <StatCard label="Lowest month" value={worst ? `${worst.percent}%` : "—"} sub={worst?.month} />
          </div>
          {withData.length >= 2 && (
            <Card>
              <div className="px-4 py-5">
                <TrendChart points={withData.map((m) => ({ label: m.month.split(" ")[0], pct: m.percent }))} showGrid />
              </div>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

// ── 4. attendance vs marks scatter ───────────────────────────────────────────────
function Correlation({ rows }: { rows: AttendanceAnalytics["correlation"] }) {
  return (
    <section>
      <SectionHead
        icon={<ScatterChart className="h-5 w-5" />}
        title="Attendance vs marks"
        desc="Each dot is a student — attendance % against their average test score"
        count={rows.length}
      />
      {rows.length === 0 ? (
        <Empty>Needs students with both attendance and a recent submitted test.</Empty>
      ) : (
        <Card>
          <div className="px-4 py-5">
            <ScatterPlot rows={rows} />
          </div>
        </Card>
      )}
    </section>
  );
}

function ScatterPlot({ rows }: { rows: AttendanceAnalytics["correlation"] }) {
  const W = 320;
  const H = 240;
  const padL = 34;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const x = (pct: number) => padL + (pct / 100) * innerW;
  const y = (pct: number) => padT + innerH - (pct / 100) * innerH;

  const ticks = [0, 25, 50, 75, 100];
  const atRiskX = x(AT_RISK);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" fill="none">
      {/* gridlines + axis labels */}
      {ticks.map((t) => (
        <g key={`y${t}`}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fontFamily={mono} fill="#5b6472">
            {t}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <text key={`x${t}`} x={x(t)} y={H - 10} textAnchor="middle" fontSize="9" fontFamily={mono} fill="#5b6472">
          {t}
        </text>
      ))}

      {/* at-risk reference line */}
      <line x1={atRiskX} x2={atRiskX} y1={padT} y2={padT + innerH} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 4" opacity="0.7" />
      <text x={atRiskX} y={padT + 8} textAnchor="middle" fontSize="8" fontFamily={mono} fill="#f59e0b">
        {AT_RISK}%
      </text>

      {/* axis titles */}
      <text x={padL + innerW / 2} y={H - 1} textAnchor="middle" fontSize="8.5" fontFamily={mono} fill="#64748b">
        attendance %
      </text>

      {/* dots */}
      {rows.map((s) => (
        <circle
          key={s.id}
          cx={x(s.attendancePct)}
          cy={y(s.avgScorePct)}
          r="4"
          fill={s.attendancePct < AT_RISK ? "rgba(239,68,68,0.85)" : "rgba(255,171,51,0.9)"}
          stroke="#06060c"
          strokeWidth="1"
        >
          <title>
            {s.name}: {s.attendancePct}% attendance · {s.avgScorePct}% avg score
          </title>
        </circle>
      ))}
    </svg>
  );
}
