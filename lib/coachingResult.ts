import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import { scoreQuestion } from "@/lib/resolveQuestions";
import { getResolvedTestQuestions, studentQuestionsFromBase } from "@/lib/coachingQuestionCache";
import { subjectiveEntryMarks } from "@/lib/coachingScore";
import { isSubjectiveEntry, type SubjectiveAnswerEntry } from "@/lib/subjectiveTypes";
import type { RuntimeTest } from "@/lib/coachingTestRuntime";
import { buildResultData } from "@/components/test/mockTestUtils";
import type { ResultData } from "@/components/test/testAnalysisHelpers";

// Shared analysis builder for a SUBMITTED coaching attempt. Used by both the
// student-facing result page (/c/[slug]/result/[attemptId]) and the admin's
// per-attempt analysis (/coaching-admin/attempts/[attemptId]) so the two grade
// IDENTICALLY (one copy of the breakdown logic) and so the expensive resolve +
// score work is cached.
//
// A submitted attempt's OBJECTIVE grading is frozen, so the computed ResultData
// is cached per attempt in Redis. Subjective answers break the "frozen" rule:
// the async Gemini worker and teacher overrides change marks AFTER submission —
// both call invalidateAttemptResult so the next view recomputes.
//
// v2: rows may carry a `subjective` block (photo keys, AI feedback, pending).

const TTL_SECONDS = 60 * 60 * 24; // 24h
const resultKey = (attemptId: string) => `coaching:attempt:${attemptId}:result:v2`;

/** Drop a cached attempt result — call whenever its grading changes post-submit. */
export async function invalidateAttemptResult(attemptId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await redis.del(resultKey(attemptId));
  } catch {
    /* best-effort: the 24h TTL bounds staleness if Redis hiccups */
  }
}

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
  const studentAnswers = (attempt.answers ?? {}) as Record<
    string,
    string | SubjectiveAnswerEntry
  >;
  const times = (attempt.question_times ?? {}) as Record<string, number>;

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const breakdown = resolved.map((q) => {
    const common = {
      questionId: q.id,
      questionText: q.question_text,
      options: q.options.length ? q.options : null,
      questionType: q.question_type.toUpperCase(),
      correctAnswer: q.correct_answer,
      marks: q.marks,
      // sectionName drives buildResultData's per-section breakdown (the question's
      // subject IS its section); subject kept for the topic-within-section grouping.
      sectionName: q.subject || "General",
      subject: q.subject || "General",
      topic: q.topic || undefined,
      explanation: q.solution || undefined,
      images: q.images ?? undefined,
      timeSpentSecs: times[q.id] ?? 0,
    };

    // Subjective: marks come from the stored entry (AI or teacher), not from
    // scoreQuestion. Pending answers (low confidence / flagged / ungraded) show
    // a "pending review" state and count as skipped until they're final.
    if (q.question_type === "subjective") {
      const entry = studentAnswers[q.id];
      if (!isSubjectiveEntry(entry) || entry.image_keys.length === 0) {
        skippedCount++;
        return {
          ...common,
          userAnswer: null,
          isCorrect: null as boolean | null,
          awardedMarks: 0,
          subjective: {
            pending: false,
            feedback: null,
            confidence: null,
            marks: null,
            imageKeys: [] as string[],
            gradedBy: null,
          },
        };
      }
      const { marks, pending } = subjectiveEntryMarks(entry, q.marks);
      if (pending) skippedCount++;
      else if (marks > 0) correctCount++;
      else wrongCount++;
      return {
        ...common,
        userAnswer: `${entry.image_keys.length} photo answer${entry.image_keys.length > 1 ? "s" : ""}`,
        isCorrect: pending ? null : marks > 0,
        awardedMarks: pending ? 0 : marks,
        subjective: {
          pending,
          feedback: pending ? null : entry.gemini_feedback,
          confidence: entry.gemini_confidence,
          marks: pending ? null : marks,
          // KEYS, not URLs — the page presigns fresh per request (this object
          // is Redis-cached for 24h; signed URLs expire in 1h).
          imageKeys: entry.image_keys,
          gradedBy: entry.graded_by,
        },
      };
    }

    const ua = (typeof studentAnswers[q.id] === "string" ? (studentAnswers[q.id] as string) : "").trim();
    const answered = ua !== "";
    const awarded = scoreQuestion(q, ua) ?? 0;
    const isCorrect = !answered ? null : awarded > 0;
    if (!answered) skippedCount++;
    else if (isCorrect) correctCount++;
    else wrongCount++;

    return { ...common, userAnswer: answered ? ua : null, isCorrect, awardedMarks: awarded, subjective: undefined };
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
    // Coaching tests aren't tied to a national exam type, so leave examType
    // unset — otherwise ScoreOverview shows a misleading "GATE" pill on every
    // result. The badge is hidden when examType is undefined.
    { examType: undefined, mockTestId: null }
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
