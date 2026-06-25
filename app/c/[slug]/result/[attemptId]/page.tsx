import { after } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { finalizeOverdueAttempts, isPastDeadline } from "@/lib/coachingFinalize";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import { getAttemptResultData } from "@/lib/coachingResult";
import { getAttemptPeerStats } from "@/lib/coachingPeerStats";
import { isR2Configured, presignAnswerGets } from "@/lib/r2";
import CoachingResultAnalysis from "@/components/coaching/CoachingResultAnalysis";
import StudentPerformanceContext from "@/components/coaching/StudentPerformanceContext";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ slug: string; attemptId: string }>;
}) {
  const { slug, attemptId } = await params;

  const coaching = await getCachedCoachingBySlug(slug); // Redis-cached
  if (!coaching || !coaching.active) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);

  const loadAttempt = () =>
    prisma.testAttempt.findFirst({
      where: { id: attemptId, student_id: student.id, coaching_id: coaching.id },
      select: {
        id: true,
        status: true,
        started_at: true,
        answers: true,
        score: true,
        max_score: true,
        time_taken_secs: true,
        question_times: true,
        grading_status: true,
        student_id: true,
        test: {
          select: {
            id: true,
            title: true,
            shuffle: true,
            pool_size: true,
            questions: true,
            duration_secs: true,
            end_at: true,
          },
        },
      },
    });

  let attempt = await loadAttempt();
  if (!attempt) notFound();

  // Still in progress when the student lands here? If their deadline has passed
  // (closed app / dead phone), finalize from the autosaved Redis answers and show
  // the result; if they still have time, send them back into the test.
  if (attempt.status !== "submitted") {
    const overdue = isPastDeadline(
      attempt.started_at,
      attempt.test.duration_secs,
      attempt.test.end_at
    );
    if (!overdue) redirect(`/c/${slug}/test/${attempt.test.id}`);
    const testId = attempt.test.id;
    await finalizeOverdueAttempts(testId, coaching.id);
    attempt = await loadAttempt();
    if (!attempt || attempt.status !== "submitted") {
      // Finalize didn't land (rare) — fall back to the test page rather than
      // render a half-graded result.
      redirect(`/c/${slug}/test/${testId}`);
    }
  }

  // Cached, shared builder (Redis, immutable per submitted attempt) — rebuilds the
  // student's set from the cached base WITH answers and grades it. Same logic the
  // coaching-admin per-attempt analysis uses, so both render identically.
  // Peer stats (rank/percentile/class-avg/trend) come from the same leaderboard
  // cohort the student sees on the leaderboard page — fetched alongside in parallel.
  const [result, peer] = await Promise.all([
    getAttemptResultData(attempt, coaching.id),
    getAttemptPeerStats({
      attemptId: attempt.id,
      testId: attempt.test.id,
      studentId: attempt.student_id,
      coachingId: coaching.id,
    }),
  ]);

  // Signed photo URLs are signed FRESH per request — the cached ResultData only
  // carries R2 keys (signed URLs expire in 1h; the cache lives 24h).
  const photoKeys = result.questions.flatMap((q) => q.subjective?.imageKeys ?? []);
  const imageUrlMap =
    photoKeys.length && isR2Configured() ? await presignAnswerGets(photoKeys) : undefined;

  const gradingInProgress =
    attempt.grading_status === "pending" || attempt.grading_status === "review";

  // Self-heal backstop for the batch grader: if this attempt's written answers are
  // still PENDING (queued but not yet AI-graded), nudge the sweeper after the
  // response flushes so grading advances on traffic even when cron lapses. The
  // sweep is global, lock-guarded, and idempotent, so firing it from a view that
  // sees pending work is safe; we skip "review" (already AI-graded, awaiting a
  // teacher) so routine result views don't sweep needlessly. The VPS cron remains
  // the primary driver — this just keeps grading moving in dev and on cron gaps.
  if (attempt.grading_status === "pending") {
    after(() =>
      import("@/lib/subjectiveBatch")
        .then((m) => m.nudgeGradingSweep())
        .catch((err) => console.error("[result] grading nudge failed:", err))
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg-base)" }}>
      {gradingInProgress && (
        <div className="flex items-center gap-2.5 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          <Hourglass className="h-4 w-4 shrink-0" />
          Your written answers are being graded — this can take a little while. Check
          back later; your score may increase once grading completes.
        </div>
      )}
      {peer && <StudentPerformanceContext stats={peer} />}
      <CoachingResultAnalysis
        result={result}
        dashboardHref={`/c/${slug}/dashboard`}
        imageUrlMap={imageUrlMap}
      />
    </div>
  );
}
