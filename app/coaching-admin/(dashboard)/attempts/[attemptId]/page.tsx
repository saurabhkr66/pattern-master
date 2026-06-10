import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { finalizeOverdueAttempts, isPastDeadline } from "@/lib/coachingFinalize";
import { getAttemptResultData } from "@/lib/coachingResult";
import { isR2Configured, presignAnswerGets } from "@/lib/r2";
import CoachingResultAnalysis from "@/components/coaching/CoachingResultAnalysis";

export const dynamic = "force-dynamic";

// Admin/super-admin view of ONE student's attempt — the same deep analysis the
// student sees on /c/[slug]/result/[attemptId], but authorized through the
// coaching-admin actor and scoped to the actor's coaching (the tenant boundary).
// Attempt id is globally unique, so this flat route is reachable from both the
// student profile and the per-test results page.
export default async function AdminAttemptAnalysisPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
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

  const loadAttempt = () =>
    prisma.testAttempt.findFirst({
      // coaching_id is the tenant boundary — an admin may view ANY of their
      // coaching's students' attempts (no student_id = self constraint).
      where: { id: attemptId, coaching_id: coachingId },
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
        student: { select: { name: true } },
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

  // Not yet submitted? If the deadline passed (closed app / dead phone), finalize
  // from the autosaved answers and show the result. If they still have time, the
  // attempt is genuinely live — show a notice instead of a half-graded analysis.
  if (attempt.status !== "submitted") {
    const overdue = isPastDeadline(
      attempt.started_at,
      attempt.test.duration_secs,
      attempt.test.end_at
    );
    if (overdue) {
      await finalizeOverdueAttempts(attempt.test.id, coachingId);
      attempt = await loadAttempt();
      if (!attempt) notFound();
    }
    if (attempt.status !== "submitted") {
      return (
        <div className="p-8">
          <Link
            href={`/coaching-admin/students/${attempt.student_id}`}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to {attempt.student.name}
          </Link>
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-lg font-semibold text-white">{attempt.test.title}</p>
            <p className="mt-2 text-sm text-slate-400">
              This attempt is still in progress — no analysis until the student submits or the
              test window closes.
            </p>
          </div>
        </div>
      );
    }
  }

  // Cached, shared builder — seeded by THIS attempt's student_id so the
  // shuffle/pool matches what that student saw. Identical grading to the
  // student-facing result page.
  const result = await getAttemptResultData(attempt, coachingId);

  // Sign photo URLs fresh per request (the cached ResultData only carries keys).
  const photoKeys = result.questions.flatMap((q) => q.subjective?.imageKeys ?? []);
  const imageUrlMap =
    photoKeys.length && isR2Configured() ? await presignAnswerGets(photoKeys) : undefined;

  const hasSubjective = attempt.grading_status !== "none";

  return (
    <div className="flex h-screen flex-col">
      {hasSubjective && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
          <span className="text-sm text-slate-300">
            {attempt.grading_status === "review" && (
              <span className="text-amber-400">Some written answers need your review.</span>
            )}
            {attempt.grading_status === "pending" && (
              <span className="text-amber-400">AI grading in progress…</span>
            )}
            {attempt.grading_status === "done" && "All written answers graded."}
          </span>
          <Link
            href={`/coaching-admin/attempts/${attempt.id}/review`}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
          >
            Review written answers →
          </Link>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <CoachingResultAnalysis
          result={result}
          dashboardHref={`/coaching-admin/students/${attempt.student_id}`}
          imageUrlMap={imageUrlMap}
        />
      </div>
    </div>
  );
}
