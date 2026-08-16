import "server-only";
import { prisma } from "@/lib/prisma";
import { buildResultData } from "@/components/test/mockTestUtils";
import type { ResultData } from "@/components/test/TestAnalysis";
import { isAnswerCorrect } from "@/lib/objectiveGrade";
import { engineAnswerToStored } from "@/lib/dppOptions";

// Server-authoritative grading for a DPP run, and the run → ResultData mapping
// the result screen renders.
//
// Modelled on lib/coachingResult.ts. The grading half is deliberately here (not
// in the route) so it can be reasoned about in one place: the client sends only
// letters, and every score in the system is derived on this side.

/** One graded question. Shaped to be handed straight to buildResultData, and
 *  stored verbatim in DppRun.answers — the same BreakdownItem[] shape
 *  TestSession.answers uses, so a future merge is a union, not a migration.
 *
 *  ⚠️ `questionText` / `questionType` are camelCase because that is what the
 *  shared shape actually uses — see the BreakdownItem interface in
 *  app/api/test/submit/route.ts and the twin builder in lib/coachingResult.ts.
 *  These two fields were originally declared snake_case here, which silently
 *  broke every consumer that reads the canonical names: buildResultData maps
 *  `q.questionText` and `q.questionType`, so the result page's pacing card,
 *  question table and expanded view all rendered an empty question with an
 *  undefined type. Runs stored before the fix still hold the old keys — read
 *  them through normalizeDppBreakdown below, never by direct cast. */
export type DppBreakdownItem = {
  questionId: string;
  source: "dpp";
  sectionIndex: number;
  sectionName: string;
  subject: string;
  topic?: string;
  marks: number;
  awardedMarks: number;
  isCorrect: boolean | null; // null = unattempted
  userAnswer: string | null;
  correctAnswer: string;
  explanation?: string;
  questionText: string;
  options: string[];
  questionType: string;
  timeSpentSecs: number;
  images?: unknown;
};

/** What can actually be on disk: either spelling of the two renamed keys. */
type StoredDppBreakdownItem = Omit<DppBreakdownItem, "questionText" | "questionType"> & {
  questionText?: string;
  question_text?: string;
  questionType?: string;
  question_type?: string;
};

/**
 * Read a stored `DppRun.answers` array into the canonical shape.
 *
 * Runs graded before the camelCase fix carry `question_text` / `question_type`.
 * Casting straight to DppBreakdownItem type-checks and then yields `undefined`
 * at runtime — which is exactly how the original bug stayed invisible — so every
 * read of DppRun.answers goes through here instead.
 */
export function normalizeDppBreakdown(raw: unknown): DppBreakdownItem[] {
  if (!Array.isArray(raw)) return [];
  return (raw as StoredDppBreakdownItem[])
    .filter((a): a is StoredDppBreakdownItem => Boolean(a))
    .map((a) => ({
      ...a,
      questionText: a.questionText ?? a.question_text ?? "",
      questionType: a.questionType ?? a.question_type ?? "MCQ",
    }));
}

export type DppScores = {
  score: number;
  maxScore: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
};

/** What the client is allowed to send us. Note there is no score field — the
 *  client never proposes a result. */
export type DppSubmittedAnswer = {
  questionId: string;
  userAnswer: string | null;
  timeSpentSecs?: number;
};

/**
 * Grade a run against the DPP's stored answers.
 *
 * `labelsByQuestion` comes from the paper builder. Engine answers are
 * index-derived letters, so they MUST be translated back to stored labels
 * before comparison — see lib/dppOptions for why.
 *
 * No negative marking: there is no exam config behind a DPP, and negative marks
 * on a short quiz produce demoralising scores that suppress sharing.
 */
export async function gradeDppRun(opts: {
  dppId: string;
  answers: DppSubmittedAnswer[];
  labelsByQuestion: Record<string, string[]>;
  topicName: string;
  subject: string;
}): Promise<{ breakdown: DppBreakdownItem[]; scores: DppScores } | null> {
  const { dppId, answers, labelsByQuestion, topicName, subject } = opts;

  // Answers WITH the key — this is the only place they are read on the run path.
  const questions = await prisma.dppQuestion.findMany({
    where: { dpp_id: dppId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      question_text: true,
      options: true,
      correct_answer: true,
      explanation: true,
      question_type: true,
      marks: true,
      images: true,
    },
  });
  if (questions.length === 0) return null;

  const byId = new Map(answers.map((a) => [a.questionId, a]));

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let score = 0;

  const breakdown: DppBreakdownItem[] = questions.map((q) => {
    const labels = labelsByQuestion[q.id] ?? [];
    const sent = byId.get(q.id);

    // Translate the engine's letter(s) into the stored label form. NAT passes
    // through untouched.
    const stored = engineAnswerToStored(sent?.userAnswer, q.question_type, labels);
    const answered = stored !== "";

    const correct = answered && isAnswerCorrect(q.question_type, stored, q.correct_answer);
    const awarded = correct ? q.marks : 0;

    if (!answered) skippedCount++;
    else if (correct) correctCount++;
    else wrongCount++;
    score += awarded;

    return {
      questionId: q.id,
      source: "dpp",
      sectionIndex: 0,
      sectionName: topicName,
      subject,
      topic: topicName,
      marks: q.marks,
      awardedMarks: awarded,
      isCorrect: answered ? correct : null,
      // Store the label form, not the engine letter — it stays meaningful even
      // if the option order ever changes.
      userAnswer: answered ? stored : null,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      questionText: q.question_text,
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      questionType: q.question_type,
      // Advisory only — per-question times come from the client and are never
      // used for ranking. The run's total is derived from started_at.
      timeSpentSecs: Math.max(0, Math.floor(Number(sent?.timeSpentSecs ?? 0))),
      images: q.images ?? undefined,
    };
  });

  const maxScore = questions.reduce((s, q) => s + q.marks, 0);
  return {
    breakdown,
    scores: { score, maxScore, correctCount, wrongCount, skippedCount },
  };
}

/**
 * Turn a stored run into the ResultData that TestAnalysis renders.
 *
 * `examType` is deliberately left undefined: a DPP is not tied to a national
 * exam, and passing one makes ScoreOverview show a misleading exam pill. See
 * the same decision in lib/coachingResult.ts:172-175.
 */
export function dppResultData(
  breakdown: DppBreakdownItem[],
  scores: DppScores,
  timeTakenSecs: number,
): ResultData {
  return buildResultData(
    breakdown,
    { ...scores, timeTakenSecs },
    { examType: undefined, mockTestId: null },
  );
}
