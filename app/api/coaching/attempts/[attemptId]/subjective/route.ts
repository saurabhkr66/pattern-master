import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { withDbRetry } from "@/lib/dbRetry";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
} from "@/lib/coachingQuestionCache";
import type { RuntimeTest } from "@/lib/coachingTestRuntime";
import {
  computeAttemptScore,
  computeGradingStatus,
  type StoredAnswers,
} from "@/lib/coachingScore";
import { isSubjectiveEntry } from "@/lib/subjectiveTypes";
import { invalidateTestLeaderboard } from "@/lib/coachingLeaderboard";
import { invalidateAttemptResult } from "@/lib/coachingResult";

// PATCH /api/coaching/attempts/[attemptId]/subjective — teacher's manual grade
// for ONE subjective answer. Body: { questionId, marks }. The override always
// wins over AI marks and clears any flagged state; the attempt's score,
// section_scores and grading_status are recomputed through the shared formula.
//
// Neon HTTP (no transactions): findFirst authorizes + reads, then a SINGLE
// update by unique id writes everything.
export const PATCH = withCoachingContext(async (req, { coachingId, actor }, { params }) => {
  const { attemptId } = await params;
  const body = await req.json().catch(() => null);
  const questionId = (body as { questionId?: unknown })?.questionId;
  const marksRaw = Number((body as { marks?: unknown })?.marks);
  if (!questionId || typeof questionId !== "string" || !Number.isFinite(marksRaw)) {
    return NextResponse.json({ error: "questionId and marks are required" }, { status: 400 });
  }

  const attempt = await withDbRetry(() =>
    prisma.testAttempt.findFirst({
      where: { id: attemptId, coaching_id: coachingId },
      select: {
        id: true,
        status: true,
        answers: true,
        student_id: true,
        test: { select: { id: true, questions: true, shuffle: true, pool_size: true } },
      },
    })
  );
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  if (attempt.status !== "submitted") {
    return NextResponse.json({ error: "attempt not submitted yet" }, { status: 400 });
  }

  const runtimeTest: RuntimeTest = {
    id: attempt.test.id,
    questions: attempt.test.questions,
    shuffle: attempt.test.shuffle,
    pool_size: attempt.test.pool_size,
  };
  const base = await getResolvedTestQuestions(runtimeTest, coachingId);
  const resolved = studentQuestionsFromBase(base, runtimeTest, attempt.student_id);
  const q = resolved.find((x) => x.id === questionId);
  if (!q || q.question_type !== "subjective") {
    return NextResponse.json({ error: "not a subjective question on this paper" }, { status: 400 });
  }
  if (marksRaw < 0 || marksRaw > q.marks) {
    return NextResponse.json({ error: `marks must be between 0 and ${q.marks}` }, { status: 400 });
  }
  // Half-mark steps, same granularity the AI grades in.
  const marks = Math.round(marksRaw * 2) / 2;

  const answers = { ...((attempt.answers ?? {}) as StoredAnswers) };
  const entry = answers[questionId];
  if (!isSubjectiveEntry(entry)) {
    return NextResponse.json({ error: "the student did not answer this question" }, { status: 400 });
  }

  const gradedBy = actor.adminId ?? actor.clerkId;
  const gradedAt = new Date();
  const updatedEntry = {
    ...entry,
    manual_override: marks,
    graded_by: gradedBy,
    graded_at: gradedAt.toISOString(),
    flagged: false,
  };
  answers[questionId] = updatedEntry;

  const { score, sectionScores } = computeAttemptScore(resolved, answers);
  const gradingStatus = computeGradingStatus(resolved, answers);

  await withDbRetry(() =>
    prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        answers: answers as object,
        score,
        section_scores: sectionScores ?? undefined,
        grading_status: gradingStatus,
        graded_by: gradedBy,
        graded_at: gradedAt,
      },
    })
  );

  await Promise.all([
    invalidateTestLeaderboard(attempt.test.id),
    invalidateAttemptResult(attemptId),
  ]);

  return NextResponse.json({
    ok: true,
    entry: updatedEntry,
    score,
    gradingStatus,
  });
});
