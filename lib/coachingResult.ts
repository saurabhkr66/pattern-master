import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import { scoreQuestion } from "@/lib/resolveQuestions";
import { getResolvedTestQuestions, studentQuestionsFromBase } from "@/lib/coachingQuestionCache";
import type { RuntimeTest } from "@/lib/coachingTestRuntime";
import { buildResultData } from "@/components/test/mockTestUtils";
import type { ResultData } from "@/components/test/testAnalysisHelpers";

// Shared analysis builder for a SUBMITTED coaching attempt. Used by both the
// student-facing result page (/c/[slug]/result/[attemptId]) and the admin's
// per-attempt analysis (/coaching-admin/attempts/[attemptId]) so the two grade
// IDENTICALLY (one copy of the breakdown logic) and so the expensive resolve +
// score work is cached.
//
// A submitted attempt's grading is frozen, so the computed ResultData is
// immutable: cache it per attempt in Redis. The cached value reflects the
// attempt's SUBMIT-TIME grading — exactly what matches the stored score/max_score
// (a live recompute can actually disagree with the stored score if a question is
// edited after submission), so no invalidation is needed; the TTL is just a bound.

const TTL_SECONDS = 60 * 60 * 24; // 24h
const resultKey = (attemptId: string) => `coaching:attempt:${attemptId}:result:v1`;

type AttemptForResult = {
  id: string;
  student_id: string;
  answers: unknown;
  score: number | null;
  max_score: number | null;
  time_taken_secs: number | null;
  question_times: unknown;
  test: {
    id: string;
    shuffle: boolean;
    pool_size: number | null;
    questions: unknown;
  };
};

/**
 * Build (or fetch from Redis) the analysis ResultData for a submitted attempt.
 * Caller must ensure the attempt is submitted — the result of an in-progress
 * attempt is not meaningful and must not be cached.
 */
export async function getAttemptResultData(
  attempt: AttemptForResult,
  coachingId: string
): Promise<ResultData> {
  if (isRedisConfigured()) {
    try {
      const cached = await redis.get<ResultData>(resultKey(attempt.id));
      if (cached) return cached;
    } catch {
      // Redis hiccup — fall through to compute.
    }
  }

  const runtimeTest: RuntimeTest = {
    id: attempt.test.id,
    questions: attempt.test.questions,
    shuffle: attempt.test.shuffle,
    pool_size: attempt.test.pool_size,
  };
  const base = await getResolvedTestQuestions(runtimeTest, coachingId);
  const resolved = studentQuestionsFromBase(base, runtimeTest, attempt.student_id);
  const studentAnswers = (attempt.answers ?? {}) as Record<string, string>;
  const times = (attempt.question_times ?? {}) as Record<string, number>;

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const breakdown = resolved.map((q) => {
    const ua = (studentAnswers[q.id] ?? "").trim();
    const answered = ua !== "";
    const awarded = scoreQuestion(q, ua) ?? 0;
    const isCorrect = !answered ? null : awarded > 0;
    if (!answered) skippedCount++;
    else if (isCorrect) correctCount++;
    else wrongCount++;

    return {
      questionId: q.id,
      questionText: q.question_text,
      options: q.options.length ? q.options : null,
      questionType: q.question_type.toUpperCase(),
      correctAnswer: q.correct_answer,
      userAnswer: answered ? ua : null,
      isCorrect,
      marks: q.marks,
      awardedMarks: awarded,
      // sectionName drives buildResultData's per-section breakdown (the question's
      // subject IS its section); subject kept for the topic-within-section grouping.
      sectionName: q.subject || "General",
      subject: q.subject || "General",
      topic: q.topic || undefined,
      explanation: q.solution || undefined,
      timeSpentSecs: times[q.id] ?? 0,
    };
  });

  const result = buildResultData(
    breakdown,
    {
      score: attempt.score ?? 0,
      maxScore: attempt.max_score ?? resolved.reduce((s, q) => s + q.marks, 0),
      correctCount,
      wrongCount,
      skippedCount,
      timeTakenSecs: attempt.time_taken_secs ?? 0,
    },
    { examType: "GATE", mockTestId: null }
  );

  if (isRedisConfigured()) {
    try {
      await redis.set(resultKey(attempt.id), result, { ex: TTL_SECONDS });
    } catch {
      // Non-fatal: caching is best-effort.
    }
  }
  return result;
}
