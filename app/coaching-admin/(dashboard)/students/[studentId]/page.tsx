import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { display } from "@/components/coaching/ui";
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

  const stats = [
    { label: "Tests taken", value: testsTaken },
    { label: "Average", value: avgPct == null ? "—" : `${avgPct}%` },
    { label: "Best", value: bestPct == null ? "—" : `${bestPct}%` },
    {
      label: "Last score",
      value: last ? `${last.score ?? 0}${last.max_score ? ` / ${last.max_score}` : ""}` : "—",
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
      <div className="mt-3 flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-500/15 text-lg font-bold text-amber-400">
          {student.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-white" style={{ fontFamily: display }}>
            {student.name}
          </h1>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            <span className="font-mono">{student.phone}</span>
            <span className="text-slate-600"> · </span>
            {student.batch?.name ?? "No batch"}
            {!student.active && <span className="text-slate-600"> · Inactive</span>}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Improvement trend — per-test % over time (≥2 tests). */}
      {trendPoints.length >= 2 && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-slate-300">Improvement trend</h2>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <TrendChart points={trendPoints} height={150} />
          </div>
        </>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-300">Test history</h2>

      {attempts.length === 0 ? (
        <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-sm text-slate-500">
          No submitted tests yet.
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {attempts.map((a) => {
            const p = pct(a.score, a.max_score);
            return (
              <Link
                key={a.id}
                href={`/coaching-admin/attempts/${a.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-amber-500/40 hover:bg-white/[0.05]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{a.test.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                    <span className="text-slate-600"> · </span>
                    {fmtTime(a.time_taken_secs)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm text-slate-200">
                    {a.score ?? 0}
                    {a.max_score ? ` / ${a.max_score}` : ""}
                  </p>
                  {p != null && <p className="text-xs text-amber-400">{p}%</p>}
                </div>
                <span className="shrink-0 text-slate-500">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
