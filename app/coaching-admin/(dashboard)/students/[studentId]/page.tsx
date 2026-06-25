import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, TrendingUp, Award, Target, FileText, Calendar, Clock, Timer, ChevronRight } from "lucide-react";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { display, Card, StatCard, Avatar } from "@/components/coaching/ui";
import TrendChart from "@/components/coaching/TrendChart";

export const dynamic = "force-dynamic";

function pct(score: number | null, max: number | null): number | null {
  if (max == null || max <= 0 || score == null) return null;
  return Math.round((score / max) * 100);
}

function fmtTime(secs: number | null): string {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Student</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;

  // Tenant check + load history in parallel. coaching_id scopes both so an admin
  // can only ever see their own coaching's students.
  const [student, attempts] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, coaching_id: coachingId },
      select: { id: true, name: true, phone: true, active: true, batch: { select: { name: true } } },
    }),
    prisma.testAttempt.findMany({
      where: { student_id: studentId, coaching_id: coachingId, status: "submitted" },
      select: {
        id: true,
        score: true,
        max_score: true,
        time_taken_secs: true,
        submitted_at: true,
        test: { select: { title: true } },
      },
      orderBy: { submitted_at: "desc" },
      take: 100, // cap to prevent unbounded fetch
    }),
  ]);

  if (!student) notFound();

  // Summary computed in JS from the same list — no extra query.
  const percents = attempts
    .map((a) => pct(a.score, a.max_score))
    .filter((p): p is number => p != null);
  const testsTaken = attempts.length;
  const avgPct =
    percents.length > 0 ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : null;
  const bestPct = percents.length > 0 ? Math.max(...percents) : null;
  const last = attempts[0] ?? null;

  // Improvement trend: attempts come newest-first, so reverse to chronological
  // and label each "Test N". Only meaningful with ≥2 submitted tests.
  const trendPoints = [...attempts]
    .reverse()
    .map((a, i) => ({ label: `Test ${i + 1}`, pct: pct(a.score, a.max_score) ?? 0 }));

  const ICON_CLS = "h-[22px] w-[22px]";
  const stats = [
    { label: "Tests taken", sub: "Total tests", value: testsTaken, icon: <ClipboardList className={ICON_CLS} /> },
    { label: "Average", sub: "Average score", value: avgPct == null ? "—" : `${avgPct}%`, icon: <TrendingUp className={ICON_CLS} /> },
    { label: "Best", sub: "Highest score", value: bestPct == null ? "—" : `${bestPct}%`, icon: <Award className={ICON_CLS} /> },
    {
      label: "Last score",
      sub: "Most recent",
      value: last ? `${last.score ?? 0}${last.max_score ? ` / ${last.max_score}` : ""}` : "—",
      icon: <Target className={ICON_CLS} />,
    },
  ];

  return (
    <div className="p-5 sm:p-8">
      <Link
        href="/coaching-admin/students"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>

      {/* Identity */}
      <div className="mt-5 flex items-center gap-5">
        <Avatar text={student.name} size={88} ring />
        <div className="min-w-0">
          <h1
            className="truncate text-3xl font-extrabold tracking-tight text-white sm:text-[40px]"
            style={{ fontFamily: display, letterSpacing: "-0.02em" }}
          >
            {student.name}
          </h1>
          <p className="mt-1.5 truncate text-sm text-slate-400 sm:text-base">
            {student.phone}
            <span className="text-slate-600"> · </span>
            {student.batch?.name ?? "No batch"}
            {!student.active && <span className="text-slate-600"> · Inactive</span>}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} sub={s.sub} />
        ))}
      </div>

      {/* Improvement trend — per-test % over time (≥2 tests). */}
      {trendPoints.length >= 2 && (
        <Card className="mt-7">
          <div className="px-6 py-5">
            <h2 className="mb-4 text-lg font-bold text-white" style={{ fontFamily: display }}>
              Improvement trend
            </h2>
            <TrendChart points={trendPoints} height={150} />
          </div>
        </Card>
      )}

      <Card className="mt-7">
        <div className="px-6 py-6">
          <h2 className="mb-4 text-xl font-bold text-white" style={{ fontFamily: display }}>
            Test history
          </h2>

          {attempts.length === 0 ? (
            <p className="rounded-2xl border border-white/10 px-4 py-8 text-center text-sm text-slate-500">
              No submitted tests yet.
            </p>
          ) : (
            <div className="space-y-2">
              {attempts.map((a) => {
                const p = pct(a.score, a.max_score);
                const d = a.submitted_at ? new Date(a.submitted_at) : null;
                return (
                  <Link
                    key={a.id}
                    href={`/coaching-admin/attempts/${a.id}`}
                    className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 transition hover:border-amber-500/40 hover:bg-white/[0.04]"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-amber-400"
                      style={{ background: "rgba(245,158,11,0.13)", border: "1px solid rgba(245,158,11,0.3)" }}
                    >
                      <FileText className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-white">{a.test.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-400">
                        {d && (
                          <>
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {d.toLocaleDateString()}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {d.toLocaleTimeString()}
                            </span>
                          </>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <Timer className="h-3.5 w-3.5" />
                          {fmtTime(a.time_taken_secs)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-extrabold text-white">
                        {a.score ?? 0}
                        {a.max_score ? ` / ${a.max_score}` : ""}
                      </p>
                      {p != null && <p className="text-xs font-bold text-amber-400">{p}%</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
