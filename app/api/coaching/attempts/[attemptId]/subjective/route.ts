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
import { isSubjectiveEntry, type GradeHistoryEntry } from "@/lib/subjectiveTypes";
import { subjectiveEntryMarks } from "@/lib/coachingScore";
import { invalidateTestLeaderboard } from "@/lib/coachingLeaderboard";
import { invalidateAttemptResult } from "@/lib/coachingResult";

// PATCH /api/coaching/attempts/[attemptId]/subjective — teacher's manual grade
// for ONE subjective answer. Body: { questionId, marks } OR { questionId, revert: true }.
//
// Override: sets manual_override → always wins over AI marks, clears flagged.
// Revert: clears manual_override → falls back to AI marks (or pending if low/flagged).
//
// Both actions log to grade_history for audit trail, then the attempt's score,
// section_scores, and grading_status are recomputed through the shared formula.
//
// Neon HTTP (no transactions): findFirst authorizes + reads, then a SINGLE
// update by unique id writes everything.
export const PATCH = withCoachingContext(async (req, { coachingId, actor }, { params }) => {
  const { attemptId } = await params;
  const body = await req.json().catch(() => null);
  const questionId = (body as { questionId?: unknown })?.questionId;
  const revert = !!(body as { revert?: unknown })?.revert;

  if (!questionId || typeof questionId !== "string") {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  // Revert mode: clear override and fall back to AI marks.
  // Override mode: marks are required and validated.
  if (!revert) {
    const marksRaw = Number((body as { marks?: unknown })?.marks);
    if (!Number.isFinite(marksRaw)) {
      return NextResponse.json({ error: "marks are required (or set revert: true)" }, { status: 400 });
    }
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

  const answers = { ...((attempt.answers ?? {}) as StoredAnswers) };
  const entry = answers[questionId];
  if (!isSubjectiveEntry(entry)) {
    return NextResponse.json({ error: "the student did not answer this question" }, { status: 400 });
  }

  const gradedBy = actor.adminId ?? actor.clerkId;
  const gradedAt = new Date();
  const prevMarks = entry.manual_override ?? entry.gemini_marks;
  const history: GradeHistoryEntry[] = entry.grade_history?.slice() ?? [];

  if (revert) {
    // Revert to AI marks (clear override). The entry falls back to gemini_marks
    // precedence (high/medium confidence → used, else → pending).
    const aiResult = entry.gemini_marks != null && !entry.flagged
      ? subjectiveEntryMarks({ ...entry, manual_override: null }, q.marks)
      : { marks: 0, pending: true };
    history.push({
      from: prevMarks,
      to: aiResult.marks,
      by: "revert",
      at: gradedAt.toISOString(),
    });
    const updatedEntry = {
      ...entry,
      manual_override: null,
      graded_by: null,
      graded_at: null,
      grade_history: history,
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
          graded_by: null,
          graded_at: null,
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
  }

  // Override mode: set manual marks.
  const marksRaw = Number((body as { marks?: unknown })?.marks);
  if (marksRaw < 0 || marksRaw > q.marks) {
    return NextResponse.json({ error: `marks must be between 0 and ${q.marks}` }, { status: 400 });
  }
  // Half-mark steps, same granularity the AI grades in.
  const marks = Math.round(marksRaw * 2) / 2;

  history.push({
    from: prevMarks,
    to: marks,
    by: gradedBy,
    at: gradedAt.toISOString(),
  });
  const updatedEntry = {
    ...entry,
    manual_override: marks,
    graded_by: gradedBy,
    graded_at: gradedAt.toISOString(),
    flagged: false,
    grade_history: history,
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
