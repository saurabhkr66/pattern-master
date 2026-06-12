import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { finalizeOverdueAttempts } from "@/lib/coachingFinalize";
import { compareLeaderboard } from "@/lib/coachingLeaderboard";
import { getCachedCoachingName } from "@/lib/coachingCache";
import { ShareRankListButton, ShareResultButton } from "@/components/coaching/ResultShareButtons";
import GradeUngradedButton from "@/components/coaching/GradeUngradedButton";
import { getTestClassAnalytics } from "@/lib/coachingTestAnalytics";
import TestAnalytics from "@/components/coaching/TestAnalytics";
import { ArrowLeft } from "lucide-react";

// Grading-state chip for the subjective AI pipeline (— for objective-only tests).
function GradingChip({ status, attemptId }: { status: string; attemptId: string }) {
  if (status === "pending") {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
        AI grading…
      </span>
    );
  }
  if (status === "review") {
    return (
      <Link
        href={`/coaching-admin/attempts/${attemptId}/review`}
        className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400 hover:underline"
      >
        Needs review
      </Link>
    );
  }
  if (status === "done") {
    return (
      <Link
        href={`/coaching-admin/attempts/${attemptId}/review`}
        className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400 hover:underline"
      >
        Graded
      </Link>
    );
  }
  return <span className="text-slate-600">—</span>;
}

export const dynamic = "force-dynamic";

function fmtTime(secs: number | null): string {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function TestResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const showAnalytics = tab === "analytics";
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <p className="text-slate-400">
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

  // Server-authoritative close: finalize any attempt whose deadline passed but
  // never submitted (closed app / dead phone), grading it from its last
  // autosaved Redis answers. Runs on-view so the table below reflects them.
  // Independent of the test-metadata read → run both in parallel; the attempts
  // query below must still wait for finalize to land.
  const [test, coachingName] = await Promise.all([
    prisma.coachingTest.findFirst({
      where: { id, coaching_id: coachingId },
      select: { id: true, title: true, status: true },
    }),
    getCachedCoachingName(coachingId),
    finalizeOverdueAttempts(id, coachingId),
  ]);
  if (!test) notFound();

  // Class report is computed only when its tab is open — keeps the default
  // Submissions view free of the extra resolve + per-question scoring pass.
  const analytics = showAnalytics ? await getTestClassAnalytics(id, coachingId) : null;

  const attempts = await prisma.testAttempt.findMany({
    where: { test_id: id, coaching_id: coachingId },
    select: {
      id: true,
      status: true,
      score: true,
      max_score: true,
      time_taken_secs: true,
      tab_switches: true,
      grading_status: true,
      started_at: true,
      submitted_at: true,
      student: { select: { name: true, phone: true } },
    },
    orderBy: { started_at: "desc" },
    take: 500, // cap to prevent unbounded fetch on large batches
  });

  const submitted = attempts.filter((a) => a.status === "submitted");
  const submissions = submitted.length;

  // Rank submitted attempts with the shared metric (score, then faster time) so
  // this table ranks identically to the student-facing leaderboard. In-progress
  // attempts have no rank (shown after the ranked rows, with "—").
  const ranked = submitted
    .slice()
    .sort((a, b) =>
      compareLeaderboard(
        { score: a.score ?? 0, timeTakenSecs: a.time_taken_secs, submittedAt: a.submitted_at?.getTime() ?? 0 },
        { score: b.score ?? 0, timeTakenSecs: b.time_taken_secs, submittedAt: b.submitted_at?.getTime() ?? 0 }
      )
    )
    .map((a, i) => ({ ...a, rank: i + 1 }));
  const inProgress = attempts
    .filter((a) => a.status !== "submitted")
    .map((a) => ({ ...a, rank: null as number | null }));
  const rows = [...ranked, ...inProgress];
  const avgScore =
    submissions > 0
      ? submitted.reduce((s, a) => s + (a.score ?? 0), 0) / submissions
      : 0;
  const topScore = submissions > 0 ? Math.max(...submitted.map((a) => a.score ?? 0)) : 0;
  const maxScore = submitted[0]?.max_score ?? attempts[0]?.max_score ?? 0;

  const stats = [
    { label: "Submissions", value: submissions },
    { label: "In progress", value: attempts.length - submissions },
    { label: "Avg score", value: maxScore ? `${avgScore.toFixed(1)} / ${maxScore}` : avgScore.toFixed(1) },
    { label: "Top score", value: maxScore ? `${topScore} / ${maxScore}` : topScore },
  ];

  // Subjective AI-grading pipeline state across the test.
  const hasSubjective = attempts.some((a) => a.grading_status !== "none");
  const ungradedIds = submitted
    .filter((a) => a.grading_status === "pending" || a.grading_status === "review")
    .map((a) => a.id);

  return (
    <div className="p-8">
      <Link
        href="/coaching-admin/tests"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tests
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">{test.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
        {ungradedIds.length > 0 && <GradeUngradedButton attemptIds={ungradedIds} />}
        {submissions > 0 && (
          <ShareRankListButton
            testTitle={test.title}
            coachingName={coachingName ?? "Your coaching"}
            entries={ranked.slice(0, 10).map((a) => ({
              rank: a.rank,
              name: a.student.name,
              score: a.score ?? 0,
            }))}
            totalAppeared={submissions}
            avgScore={avgScore}
            maxScore={maxScore}
          />
        )}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-400">Results &amp; submissions</p>
      {ungradedIds.length > 0 && (
        <p className="mt-1 text-xs text-amber-400">
          {ungradedIds.length} submission{ungradedIds.length > 1 ? "s" : ""} still have
          ungraded/unreviewed written answers — grade before sharing the rank list (ranks may
          shift as marks land).
        </p>
      )}

      {/* Submissions ↔ Analytics (admin-only; students never reach this route) */}
      <div className="mt-5 flex gap-2">
        {([
          { key: "submissions", label: "Submissions", href: `/coaching-admin/tests/${id}/results` },
          { key: "analytics", label: "Analytics", href: `/coaching-admin/tests/${id}/results?tab=analytics` },
        ] as const).map((t) => {
          const active = (t.key === "analytics") === showAnalytics;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-amber-500 font-semibold text-slate-950"
                  : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {showAnalytics ? (
        analytics ? (
          <TestAnalytics data={analytics} />
        ) : (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 px-4 py-10 text-center text-slate-500">
            No analytics available.
          </div>
        )
      ) : (
        <>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Desktop: table. Mobile: stacked cards (below). */}
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Score</th>
              {hasSubjective && <th className="px-4 py-3 font-medium">Grading</th>}
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Tab switches</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={hasSubjective ? 10 : 9} className="px-4 py-8 text-center text-slate-500">
                  No attempts yet.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="text-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-300">
                    {a.rank != null ? `#${a.rank}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "submitted" ? (
                      <Link
                        href={`/coaching-admin/attempts/${a.id}`}
                        className="text-white hover:text-amber-400 hover:underline"
                      >
                        {a.student.name}
                      </Link>
                    ) : (
                      a.student.name
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{a.student.phone}</td>
                  <td className="px-4 py-3">
                    {a.status === "submitted" ? (
                      <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400">
                        Submitted
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        In progress
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {a.status === "submitted"
                      ? `${a.score ?? 0}${a.max_score ? ` / ${a.max_score}` : ""}`
                      : "—"}
                  </td>
                  {hasSubjective && (
                    <td className="px-4 py-3">
                      {a.status === "submitted" ? (
                        <GradingChip status={a.grading_status} attemptId={a.id} />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {a.status === "submitted" ? fmtTime(a.time_taken_secs) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        a.tab_switches > 0 ? "font-medium text-amber-400" : "text-slate-400"
                      }
                    >
                      {a.tab_switches}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "submitted" && a.rank != null ? (
                      <ShareResultButton
                        studentName={a.student.name}
                        phone={a.student.phone}
                        testTitle={test.title}
                        coachingName={coachingName ?? "Your coaching"}
                        score={a.score ?? 0}
                        maxScore={a.max_score ?? 0}
                        rank={a.rank}
                        totalStudents={submissions}
                        timeTakenSecs={a.time_taken_secs}
                      />
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">
            No attempts yet.
          </p>
        ) : (
          rows.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="shrink-0 font-semibold text-slate-300">
                    {a.rank != null ? `#${a.rank}` : "—"}
                  </span>
                  <div className="min-w-0">
                    {a.status === "submitted" ? (
                      <Link
                        href={`/coaching-admin/attempts/${a.id}`}
                        className="font-medium text-white hover:text-amber-400"
                      >
                        {a.student.name}
                      </Link>
                    ) : (
                      <p className="font-medium text-white">{a.student.name}</p>
                    )}
                    <p className="mt-0.5 font-mono text-xs text-slate-400">{a.student.phone}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {a.status === "submitted" ? (
                    <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400">Submitted</span>
                  ) : (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">In progress</span>
                  )}
                  {a.status === "submitted" && a.rank != null && (
                    <ShareResultButton
                      studentName={a.student.name}
                      phone={a.student.phone}
                      testTitle={test.title}
                      coachingName={coachingName ?? "Your coaching"}
                      score={a.score ?? 0}
                      maxScore={a.max_score ?? 0}
                      rank={a.rank}
                      totalStudents={submissions}
                      timeTakenSecs={a.time_taken_secs}
                    />
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>
                  Score:{" "}
                  <span className="text-slate-200">
                    {a.status === "submitted" ? `${a.score ?? 0}${a.max_score ? ` / ${a.max_score}` : ""}` : "—"}
                  </span>
                </span>
                {a.status === "submitted" && <span>Time: {fmtTime(a.time_taken_secs)}</span>}
                {a.status === "submitted" && a.grading_status !== "none" && (
                  <GradingChip status={a.grading_status} attemptId={a.id} />
                )}
                <span className={a.tab_switches > 0 ? "text-amber-400" : ""}>Tab switches: {a.tab_switches}</span>
                {a.submitted_at && <span>{new Date(a.submitted_at).toLocaleString()}</span>}
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}
    </div>
  );
}
