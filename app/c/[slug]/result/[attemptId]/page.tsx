import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { scoreQuestion } from "@/lib/resolveQuestions";
import { getResolvedTestQuestions, studentQuestionsFromBase } from "@/lib/coachingQuestionCache";
import { finalizeOverdueAttempts, isPastDeadline } from "@/lib/coachingFinalize";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import { buildResultData } from "@/components/test/mockTestUtils";
import CoachingResultAnalysis from "@/components/coaching/CoachingResultAnalysis";

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

  // Rebuild the student's set from the cached base, WITH answers (correct answers
  // + solutions). Options shown in ORIGINAL order — stored answers were de-shuffled.
  const runtimeTest = {
    id: attempt.test.id,
    questions: attempt.test.questions,
    shuffle: attempt.test.shuffle,
    pool_size: attempt.test.pool_size,
  };
  const base = await getResolvedTestQuestions(runtimeTest, coaching.id);
  const resolved = studentQuestionsFromBase(base, runtimeTest, student.id);
  const studentAnswers = (attempt.answers ?? {}) as Record<string, string>;
  const times = (attempt.question_times ?? {}) as Record<string, number>;

  // Map into the breakdown shape buildResultData expects (same as the consumer
  // mock flow), so the identical analysis UI renders.
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

  return (
    <div className="h-screen">
      <CoachingResultAnalysis result={result} dashboardHref={`/c/${slug}/dashboard`} />
    </div>
  );
}
