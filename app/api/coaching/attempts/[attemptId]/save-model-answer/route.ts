import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { withDbRetry } from "@/lib/dbRetry";
import { isSubjectiveEntry } from "@/lib/subjectiveTypes";
import { invalidateTestsWithQuestion } from "@/lib/coachingQuestionCache";
import type { StoredAnswers } from "@/lib/coachingScore";

// POST /api/coaching/attempts/[attemptId]/save-model-answer — persist an
// AI-generated model answer back to the CoachingQuestion.solution field.
//
// When a subjective question had no model answer, Gemini writes one during
// grading and stores it per-entry as `generated_model_answer`. This endpoint
// lets the teacher accept that answer as the canonical solution, which:
//   1. Makes future grading cheaper (no more generating a fresh answer each time)
//   2. Ensures all students are graded against the same answer (consistency)
//   3. Resets rubric_version so the backfill regenerates the mark scheme
export const POST = withCoachingContext(async (req, { coachingId }, { params }) => {
  const { attemptId } = await params;
  const body = await req.json().catch(() => null);
  const questionId = (body as { questionId?: unknown })?.questionId;
  if (!questionId || typeof questionId !== "string") {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  // Look up the attempt to find the generated model answer in its answers JSON.
  const attempt = await withDbRetry(() =>
    prisma.testAttempt.findFirst({
      where: { id: attemptId, coaching_id: coachingId },
      select: { answers: true },
    })
  );
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });

  const answers = (attempt.answers ?? {}) as StoredAnswers;
  const entry = answers[questionId];
  if (!isSubjectiveEntry(entry)) {
    return NextResponse.json({ error: "not a subjective entry" }, { status: 400 });
  }
  const modelAnswer = entry.generated_model_answer;
  if (!modelAnswer?.trim()) {
    return NextResponse.json(
      { error: "no AI-generated model answer to save" },
      { status: 400 }
    );
  }

  // Verify the question exists and is owned by this coaching.
  const question = await withDbRetry(() =>
    prisma.coachingQuestion.findFirst({
      where: { id: questionId, coaching_id: coachingId },
      select: { id: true, solution: true },
    })
  );
  if (!question) {
    return NextResponse.json({ error: "question not found in this coaching" }, { status: 404 });
  }
  // Don't overwrite an existing model answer — the teacher should edit it directly
  // via the question editor if they want to change a real answer.
  if (question.solution?.trim()) {
    return NextResponse.json(
      { error: "question already has a model answer — edit it directly instead" },
      { status: 409 }
    );
  }

  // Save the generated answer as the canonical solution and reset rubric_version
  // so the backfill script regenerates the mark scheme from this new answer.
  await withDbRetry(() =>
    prisma.coachingQuestion.update({
      where: { id: questionId },
      data: { solution: modelAnswer, rubric_version: 0 },
    })
  );

  // Bust the cached question set of every live test using this question so the
  // new solution is visible on future grading passes and the review page.
  await invalidateTestsWithQuestion(coachingId, questionId);

  return NextResponse.json({ ok: true });
});
