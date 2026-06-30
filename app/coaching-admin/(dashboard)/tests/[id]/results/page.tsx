import { after } from "next/server";
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
import { ArrowLeft, Upload, Loader2, Star, Trophy, ClipboardList, BarChart3, Phone, Clock, Calendar, Check } from "lucide-react";
import { display, Card, StatCard, Pill, Avatar } from "@/components/coaching/ui";

// Grading-state chip for the subjective AI pipeline (— for objective-only tests).
function GradingChip({ status, attemptId }: { status: string; attemptId: string }) {
  if (status === "pending") {
    return <Pill tone="amber">AI grading…</Pill>;
  }
  // Assignment submitted for review, not yet graded by anyone. Links the teacher
  // straight to the manual-grade UI (AI grading is super-admin-only).
  if (status === "awaiting_teacher") {
    return (
      <Link href={`/coaching-admin/attempts/${attemptId}/review`} className="hover:underline">
        <Pill tone="danger">Needs grading</Pill>
      </Link>
    );
  }
  if (status === "review") {
    return (
      <Link href={`/coaching-admin/attempts/${attemptId}/review`} className="hover:underline">
        <Pill tone="danger">Needs review</Pill>
      </Link>
    );
  }
  if (status === "done") {
    return (
      <Link href={`/coaching-admin/attempts/${attemptId}/review`} className="hover:underline">
        <Pill tone="success">
          <Star className="h-3 w-3" /> Graded
        </Pill>
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

  const SI = "h-[24px] w-[24px]";
  const stats = [
    { label: "Submissions", sub: "Total submissions", value: submissions, icon: <Upload className={SI} />, color: "#f59e0b" },
    { label: "In progress", sub: "Not submitted yet", value: attempts.length - submissions, icon: <Loader2 className={SI} />, color: "#3b82f6" },
    { label: "Avg score", sub: "Average score", value: maxScore ? `${avgScore.toFixed(1)} / ${maxScore}` : avgScore.toFixed(1), icon: <Star className={SI} />, color: "#fbbf24" },
    { label: "Top score", sub: "Highest score", value: maxScore ? `${topScore} / ${maxScore}` : topScore, icon: <Trophy className={SI} />, color: "#22c55e" },
  ];

  // Subjective AI-grading pipeline state across the test.
  const hasSubjective = attempts.some((a) => a.grading_status !== "none");
  const ungradedIds = submitted
    .filter((a) => a.grading_status === "pending" || a.grading_status === "review")
    .map((a) => a.id);

  // Self-heal backstop for the batch grader: if any attempt is still PENDING
  // (queued, not yet AI-graded), nudge the global sweeper after the response
  // flushes so grading advances on traffic when cron lapses (and in dev). The
  // sweep is global, lock-guarded, and idempotent. "review" attempts are already
  // AI-graded (teacher action, not the sweeper's), so we don't count them. The VPS
  // cron stays the primary driver; this just keeps grading moving on a cron gap.
  if (submitted.some((a) => a.grading_status === "pending")) {
    after(() =>
      import("@/lib/subjectiveBatch")
        .then((m) => m.nudgeGradingSweep())
        .catch((err) => console.error("[test-results] grading nudge failed:", err))
    );
  }

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <Link
        href="/coaching-admin/tests"
        className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:brightness-110"
      >
        <ArrowLeft className="h-5 w-5" /> Back to tests
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight text-white sm:text-[34px] lg:text-[38px]"
            style={{ fontFamily: display, letterSpacing: "-0.02em" }}
          >
            {test.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 sm:text-base">Results &amp; submissions</p>
        </div>
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
      {ungradedIds.length > 0 && (
        <p className="mt-2 text-xs text-amber-400">
          {ungradedIds.length} submission{ungradedIds.length > 1 ? "s" : ""} still have
          ungraded/unreviewed written answers — grade before sharing the rank list (ranks may
          shift as marks land).
        </p>
      )}

      {/* Submissions ↔ Analytics (admin-only; students never reach this route) */}
      <div
        className="mt-6 inline-flex gap-1.5 rounded-2xl border p-1.5"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        {([
          { key: "submissions", label: "Submissions", icon: ClipboardList, href: `/coaching-admin/tests/${id}/results` },
          { key: "analytics", label: "Analytics", icon: BarChart3, href: `/coaching-admin/tests/${id}/results?tab=analytics` },
        ] as const).map((t) => {
          const active = (t.key === "analytics") === showAnalytics;
          const Ico = t.icon;
          return (
            <Link
              key={t.key}
              href={t.href}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition"
              style={active ? { background: "linear-gradient(135deg,#fb923c 0%,#f59e0b 100%)", color: "#1a1205" } : { color: "#c9ced8" }}
            >
              <Ico className="h-[18px] w-[18px]" /> {t.label}
            </Link>
          );
        })}
      </div>

      {showAnalytics ? (
        analytics ? (
          <TestAnalytics data={analytics} />
        ) : (
          <div className="mt-6 rounded-[18px] border border-white/[0.07] bg-white/[0.02] px-4 py-10 text-center text-slate-500">
            No analytics available.
          </div>
        )
      ) : (
        <>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} iconColor={s.color} value={s.value} label={s.label} sub={s.sub} />
        ))}
      </div>

      {/* Desktop: table. Mobile: stacked cards (below). */}
      <div className="mt-6 hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead
                className="text-[13px] font-semibold text-slate-400"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th className="px-6 py-3.5 font-semibold">Rank</th>
                  <th className="px-6 py-3.5 font-semibold">Student</th>
                  <th className="px-6 py-3.5 font-semibold">Phone</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Score</th>
                  {hasSubjective && <th className="px-6 py-3.5 font-semibold">Grading</th>}
                  <th className="px-6 py-3.5 font-semibold">Time</th>
                  <th className="px-6 py-3.5 font-semibold">Tab switches</th>
                  <th className="px-6 py-3.5 font-semibold">Submitted</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={hasSubjective ? 10 : 9} className="px-6 py-10 text-center text-slate-500">
                      No attempts yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((a, i) => (
                    <tr
                      key={a.id}
                      className="text-slate-200 transition hover:bg-white/[0.02]"
                      style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                    >
                      <td className="px-6 py-4">
                        {a.rank === 1 ? (
                          <span
                            className="grid h-10 w-10 place-items-center rounded-full text-amber-400"
                            style={{ background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.3)" }}
                          >
                            <Trophy className="h-[18px] w-[18px]" />
                          </span>
                        ) : (
                          <span className="font-bold text-slate-300">{a.rank != null ? `#${a.rank}` : "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar text={a.student.name} size={40} />
                          {a.status === "submitted" ? (
                            <Link
                              href={`/coaching-admin/attempts/${a.id}`}
                              className="font-bold text-white hover:text-amber-400"
                            >
                              {a.student.name}
                            </Link>
                          ) : (
                            <span className="font-bold text-white">{a.student.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-300">
                          <Phone className="h-4 w-4 text-slate-500" />
                          {a.student.phone}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {a.status === "submitted" ? (
                          <Pill tone="success">
                            <Check className="h-3 w-3" /> Submitted
                          </Pill>
                        ) : (
                          <Pill tone="slate">In progress</Pill>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {a.status === "submitted" ? (
                          <>
                            <div className="font-bold text-white">
                              {a.score ?? 0}
                              {a.max_score ? ` / ${a.max_score}` : ""}
                            </div>
                            {a.max_score ? (
                              <div className="text-xs text-slate-500">
                                {(((a.score ?? 0) / a.max_score) * 100).toFixed(1)}%
                              </div>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      {hasSubjective && (
                        <td className="px-6 py-4">
                          {a.status === "submitted" ? (
                            <GradingChip status={a.grading_status} attemptId={a.id} />
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-300">
                          <Clock className="h-4 w-4 text-slate-500" />
                          {a.status === "submitted" ? fmtTime(a.time_taken_secs) : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={a.tab_switches > 0 ? "font-bold text-amber-400" : "text-slate-400"}>
                          {a.tab_switches}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-400">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
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
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
                    <Pill tone="success">Submitted</Pill>
                  ) : (
                    <Pill tone="slate">In progress</Pill>
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
