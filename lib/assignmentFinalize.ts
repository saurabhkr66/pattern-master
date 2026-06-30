import "server-only";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedQuestion } from "@/lib/resolveQuestions";
import { computeAttemptScore, type StoredAnswers } from "@/lib/coachingScore";
import { buildStoredAnswers } from "@/lib/coachingFinalize";
import type { RuntimeTest } from "@/lib/coachingTestRuntime";
import { withDbRetry } from "@/lib/dbRetry";
import { invalidateTestLeaderboard } from "@/lib/coachingLeaderboard";

// Assignment finalization — the untimed homework counterpart of gradeAndWrite.
//
// Assignments deliberately keep their attempts OUT of the "submitted" status the
// timed-test flow uses, because billing and every coaching-wide aggregate count
// `status = 'submitted'` attempts (see app/api/admin/coachings/[id]/bills). An
// assignment attempt is therefore one of:
//   in_progress   — started / tapped "Check"; objective auto-scored, freely retryable
//                   (reuses the schema default; never "submitted" → billing ignores it)
//   review_locked — student tapped "Submit for review"; no more retries
// and its grading lifecycle for subjective answers is:
//   none            — no subjective question on the paper (or none answered)
//   awaiting_teacher— locked with ≥1 subjective answer, no one has graded it yet.
//     This is NOT "pending": the batch sweeper only grades grading_status='pending',
//     so 'awaiting_teacher' is invisible to it — AI grading is super-admin-triggered
//     only. The super-admin "AI grade" button runs the synchronous grader, which
//     then recomputes grading_status to done/review.

export type AssignmentAction = "check" | "review";

export async function finalizeAssignment(opts: {
  attemptId: string;
  studentId: string;
  coachingId: string;
  test: Pick<RuntimeTest, "id" | "shuffle">;
  resolved: NormalizedQuestion[];
  answers: Map<string, string>;
  times: Record<string, number>;
  action: AssignmentAction;
}): Promise<{
  score: number;
  maxScore: number;
  status: "in_progress" | "review_locked";
  gradingStatus: string;
  hasSubjective: boolean;
  storedAnswers: StoredAnswers;
}> {
  const { attemptId, studentId, coachingId, test, resolved, answers, times, action } = opts;

  const storedAnswers = buildStoredAnswers({ attemptId, studentId, coachingId, test, resolved, answers });
  const { score, maxScore, sectionScores } = computeAttemptScore(resolved, storedAnswers);

  const hasSubjectiveAnswered = resolved.some((q) => {
    if (q.question_type !== "subjective") return false;
    const v = storedAnswers[q.id];
    return !!v && typeof v !== "string" && v.image_keys.length > 0;
  });

  const status = action === "review" ? "review_locked" : "in_progress";
  // Only a locked submission with an actual subjective answer needs the teacher.
  const gradingStatus = action === "review" && hasSubjectiveAnswered ? "awaiting_teacher" : "none";

  const answersJson = JSON.stringify(storedAnswers);
  const timesJson = JSON.stringify(times);
  const sectionJson = sectionScores ? JSON.stringify(sectionScores) : null;

  // Single row, single session (no batch auto-submit race), so the write is NOT
  // guarded on a prior status — each "Check"/retry overwrites and bumps the
  // attempt counter. attempt_count starts at 1 (schema default) and increments
  // on every (re)finalize here.
  await withDbRetry(async () => {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "TestAttempt"
      SET status = ${status},
          answers = ${answersJson}::jsonb,
          score = ${score},
          max_score = ${maxScore},
          question_times = ${timesJson}::jsonb,
          section_scores = ${sectionJson}::jsonb,
          grading_status = ${gradingStatus},
          attempt_count = attempt_count + 1,
          submitted_at = ${new Date()}
      WHERE id = ${attemptId} AND student_id = ${studentId} AND coaching_id = ${coachingId}
    `);
  });

  // Assignments have their own per-test leaderboard space (keyed by the assignment
  // test_id), so refreshing it is harmless and keeps any results view consistent.
  after(() => invalidateTestLeaderboard(test.id).catch(() => {}));

  return { score, maxScore, status, gradingStatus, hasSubjective: hasSubjectiveAnswered, storedAnswers };
}
