import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEach, isStandardDriver } from "@/lib/dbHttp";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getExamConfig, type ExamType } from "@/lib/examConfigs";
import type { SubmitAnswer } from "@/components/test/TestEngine";
import { recordSubmission } from "@/lib/leaderboard";
import { getCachedTemplateById } from "@/lib/mockTemplate";
import { clearDraft } from "@/lib/draft";
interface BreakdownItem {
  questionId: string; source: string; sectionIndex: number; sectionName: string;
  questionType: string; marks: number; isOptional: boolean; counted: boolean;
  userAnswer: string | null; correctAnswer: string;
  isCorrect: boolean; isSkipped: boolean; awardedMarks: number; explanation: string;
  questionText: string; options: string[] | null; subject?: string; topic?: string;
  timeSpentSecs: number;
}
interface SectionScore {
  name: string; score: number; maxScore: number;
  correct: number; wrong: number; skipped: number;
}

/* ── Checking helpers ── */
function checkNat(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  const ca = correctAnswer.trim();
  const val = parseFloat(userAnswer.trim());
  if (ca.includes(":") && !ca.toLowerCase().includes(" to ")) {
    const [minStr, maxStr] = ca.split(":");
    return !isNaN(val) && val >= parseFloat(minStr) && val <= parseFloat(maxStr);
  }
  if (/ to /i.test(ca)) {
    const [minStr, maxStr] = ca.split(/ to /i);
    return !isNaN(val) && val >= parseFloat(minStr) && val <= parseFloat(maxStr);
  }
  return userAnswer.trim() === ca;
}

function checkMsq(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  const userSet = userAnswer.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean).sort();
  const correctSet = correctAnswer.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean).sort();
  return JSON.stringify(userSet) === JSON.stringify(correctSet);
}

function checkMcq(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  return userAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
}

function isAnswerCorrect(questionType: string, userAnswer: string, correctAnswer: string): boolean {
  if (questionType === "MCQ") return checkMcq(userAnswer, correctAnswer);
  if (questionType === "MSQ") return checkMsq(userAnswer, correctAnswer);
  if (questionType === "NAT") return checkNat(userAnswer, correctAnswer);
  return false;
}

/* ── Negative marking ── */
function negativeScore(questionType: string, marks: number, negativePerMark: number): number {
  if (questionType !== "MCQ") return 0; // MSQ and NAT have no negative marking
  return marks * negativePerMark;
}

function parseOptionSet(answer: string): string[] {
  return answer.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean);
}

/**
 * JEE Advanced MSQ partial marking (2019+ scheme):
 *  - Any wrong option chosen  → −2
 *  - All correct options chosen (none wrong) → full marks
 *  - Some (but not all) correct options chosen, none wrong → +1 per correct option chosen
 *  - Nothing chosen → 0
 */
function scoreAdvancedMsq(userAnswer: string, correctAnswer: string, marks: number): number {
  const selected = parseOptionSet(userAnswer);
  if (selected.length === 0) return 0;
  const correct = parseOptionSet(correctAnswer);
  const correctSet = new Set(correct);
  const anyWrong = selected.some((l) => !correctSet.has(l));
  if (anyWrong) return -2;
  const selectedSet = new Set(selected);
  const chosenCorrect = correct.filter((l) => selectedSet.has(l)).length;
  if (chosenCorrect === correct.length) return marks; // full marks
  return chosenCorrect; // +1 per correct option (partial)
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      answers,
      timeTakenSecs,
      mockTestId,
      examType = "GATE",
      branch = null,
    }: {
      answers: SubmitAnswer[];
      timeTakenSecs: number;
      mockTestId?: string;
      examType?: string;
      branch?: string | null;
    } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid answers payload" }, { status: 400 });
    }

    const config = getExamConfig(examType as ExamType, branch ?? undefined);

    // Fetch correct answers from DB
    const pyqIds = answers.filter((a) => a.source === "pyq").map((a) => a.questionId);

    // Also try to get answers from the stored template (avoids N+1 lookups and handles all question types)
    let templateAnswers: Map<string, { correct_answer: string; explanation: string; question_text: string; options: unknown; topic?: string }> | null = null;
    // Section list for scoring. The template's own sections are authoritative:
    // a user-sized random paper has fewer sections and much smaller per-section
    // maxScores than the full exam config, and sectionIndex on each answer is a
    // position in *this* list. Fall back to the exam config for old templates.
    let paperSections: { name: string; maxScore: number; negativePerMark: number }[] = config.sections;
    if (mockTestId) {
      const template = await getCachedTemplateById(mockTestId);
      const storedSections = template?.sections;
      if (Array.isArray(storedSections) && storedSections.length > 0) {
        paperSections = storedSections as typeof paperSections;
      }
      if (template?.questions) {
        const qs = template.questions as any[];
        templateAnswers = new Map(
          qs.map((q) => [
            q.id,
            {
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              question_text: q.question_text,
              options: q.options,
              topic: q.topic || q.topic_name,
            },
          ])
        );
      }
    }

    // Fallback: fetch from individual tables
    const fetchedPyqs = pyqIds.length > 0 && !templateAnswers
      ? await prisma.pYQ.findMany({
          where: { id: { in: pyqIds } },
          select: { id: true, correct_answer: true, explanation: true, question_text: true, options: true, topic: true },
        })
      : [];

    const pyqMap = new Map((fetchedPyqs as any[]).map((q) => [q.id, q]));

    function getQData(ans: SubmitAnswer) {
      if (templateAnswers) return templateAnswers.get(ans.questionId) ?? null;
      return pyqMap.get(ans.questionId) ?? null;
    }

    // ── Grade all answers ──
    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    // Per-section tracking
    const sectionTrackers: Map<number, { score: number; maxScore: number; correct: number; wrong: number; skipped: number }> = new Map();
    paperSections.forEach((sec, si) => {
      sectionTrackers.set(si, { score: 0, maxScore: sec.maxScore, correct: 0, wrong: 0, skipped: 0 });
    });

    const breakdown: BreakdownItem[] = [];
    const negativePerMarkBySec = paperSections.map((sec) => sec.negativePerMark);

    for (const ans of answers) {
      const qData = getQData(ans);
      if (!qData) continue;

      const sec = paperSections[ans.sectionIndex];
      const negPerMark = negativePerMarkBySec[ans.sectionIndex] ?? 1 / 3;
      const isSkipped = !ans.userAnswer || ans.userAnswer.trim() === "";
      const isCounted = true;

      const isAdvancedMsq = ans.questionType === "MSQ" && examType === "JEE_ADVANCED";

      let isCorrect = false;
      if (!isSkipped) {
        isCorrect = isAnswerCorrect(ans.questionType, ans.userAnswer!, qData.correct_answer);
      }

      // Marks awarded for this question (can be negative). For JEE Advanced
      // MSQ we award partial credit; everything else is all-or-nothing with
      // MCQ negative marking.
      let awardedMarks = 0;
      if (!isSkipped) {
        if (isAdvancedMsq) {
          awardedMarks = scoreAdvancedMsq(ans.userAnswer!, qData.correct_answer, ans.marks);
        } else if (isCorrect) {
          awardedMarks = ans.marks;
        } else {
          awardedMarks = -negativeScore(ans.questionType, ans.marks, negPerMark);
        }
      }

      // Score delta
      if (isCounted) {
        maxScore += ans.marks;
        const secT = sectionTrackers.get(ans.sectionIndex);
        score += awardedMarks;
        if (secT) secT.score += awardedMarks;

        if (isSkipped) {
          skippedCount++;
          if (secT) secT.skipped++;
        } else if (isCorrect) {
          correctCount++;
          if (secT) secT.correct++;
        } else {
          // Partial-but-positive (Advanced MSQ) still counts as "wrong" for the
          // correct/wrong tally; the awarded marks above capture the credit.
          wrongCount++;
          if (secT) secT.wrong++;
        }
      }

      breakdown.push({
        questionId: ans.questionId,
        source: ans.source,
        sectionIndex: ans.sectionIndex,
        sectionName: sec?.name ?? String(ans.sectionIndex),
        questionType: ans.questionType,
        marks: ans.marks,
        subject: ans.subject,
        topic: qData.topic || "General",
        isOptional: ans.isOptional,
        counted: isCounted,
        userAnswer: ans.userAnswer ?? null,
        correctAnswer: qData.correct_answer,
        isCorrect: isCorrect && isCounted,
        isSkipped,
        awardedMarks: Math.round(awardedMarks * 100) / 100,
        explanation: qData.explanation,
        questionText: qData.question_text,
        options: Array.isArray(qData.options) ? (qData.options as string[]) : null,
        timeSpentSecs: ans.timeSpentSecs || 0,
      });
    }

    const finalScore = Math.max(0, Math.round(score * 100) / 100);

    // Build per-section score data
    const sectionScores: SectionScore[] = paperSections.map((sec, si) => {
      const t = sectionTrackers.get(si)!;
      return {
        name: sec.name,
        score: Math.max(0, Math.round(t.score * 100) / 100),
        maxScore: t.maxScore,
        correct: t.correct,
        wrong: t.wrong,
        skipped: t.skipped,
      };
    });

    // Save TestSession
    let sessionId = `local-${Date.now()}`;
    let savedToDb = false;
    try {
      const session = await prisma.testSession.create({
        data: {
          user_id: userId,
          exam_type: examType,
          branch: branch ?? null,
          score: finalScore,
          max_score: maxScore,
          total_questions: answers.length,
          correct_count: correctCount,
          wrong_count: wrongCount,
          skipped_count: skippedCount,
          time_taken_secs: timeTakenSecs ?? null,
          section_scores: sectionScores as any,
          answers: breakdown as any,
          mock_test_id: mockTestId ?? null,
        },
      });
      sessionId = session.id;
      savedToDb = true;
    } catch (dbErr: any) {
      if (!(dbErr?.code === "P2021" || dbErr?.message?.includes("does not exist"))) throw dbErr;
    }

    // Delete the in-progress draft now that the test is submitted.
    // Single DELETE ... RETURNING id replaces the prior findMany+deleteMany
    // pair: one DB round-trip, and the returned ids still drive Redis cleanup.
    if (mockTestId) {
      const deletedDrafts = await prisma.$queryRaw<{ id: string }[]>`
        DELETE FROM "TestSessionDraft"
        WHERE user_id = ${userId} AND mock_test_id = ${mockTestId}
        RETURNING id
      `.catch(() => [] as { id: string }[]);
      for (const d of deletedDrafts) {
        clearDraft(userId, d.id).catch(() => {});
      }
    }

    // Save attempts for dashboard tracking (bulk insert for performance)
    const attemptData = answers
      .filter(ans => {
        const qData = getQData(ans);
        return qData && ans.userAnswer && ans.userAnswer.trim() !== "";
      })
      .map(ans => {
        const qData = getQData(ans)!;
        const isPyq = ans.source === "pyq";
        return {
          user_id: userId,
          pyq_id: isPyq ? ans.questionId : null,
          // Mock questions live inside MockTestTemplate.questions as self-contained
          // JSON — deliberately NOT rows in PYQ/GeneratedQuestion, so there is
          // nothing to FK to. `mock_question_id` is a loose string for exactly
          // that case; without it the row carries no identity at all and the
          // `mock_question_id IS NULL` filter in dashboard/_lib/queries.ts (which
          // exists to keep mock answers out of "current mistakes") silently
          // matches every row. Same FK + same value as TestSession.mock_test_id.
          mock_question_id: isPyq ? null : ans.questionId,
          mock_test_id: mockTestId ?? null,
          is_correct: isAnswerCorrect(ans.questionType, ans.userAnswer!, qData.correct_answer),
          user_answer: ans.userAnswer,
          time_spent: ans.timeSpentSecs || null,
        };
      });

    if (attemptData.length > 0) {
      if (isStandardDriver) {
        // TCP driver: one multi-row INSERT. The per-row fan-out below would issue
        // ~|answers| parallel statements per submit and starve the connection
        // pool during an exam-day spike.
        await prisma.attempt.createMany({ data: attemptData, skipDuplicates: true });
      } else {
        // Neon HTTP: createMany() needs a transaction (unsupported) — insert per
        // row instead. skipDuplicates → swallow P2002.
        await createEach(
          attemptData,
          (data) => prisma.attempt.create({ data, select: { id: true } }),
          { skipDuplicates: true }
        );
      }
    }

    // Real-time leaderboard: push to Redis + trigger Pusher event.
    // Fire-and-forget so the submit response isn't blocked. The user-email
    // lookup needed for the display name now lives inside recordSubmission,
    // off the critical path.
    if (savedToDb && mockTestId) {
      recordSubmission({
        mockId: mockTestId,
        sessionId,
        userId,
        score: finalScore,
        maxScore,
        timeTakenSecs: timeTakenSecs ?? null,
      }).catch((e) => console.warn("[leaderboard] recordSubmission failed", e));
    }

    await revalidatePath("/dashboard", "page");
    await revalidateTag("dashboard", "max");
    await revalidateTag("history", "max");
    await revalidateTag("mocks", "max");
    await revalidateTag("leaderboard", "max");

    return NextResponse.json(
      {
        sessionId,
        score: finalScore,
        maxScore,
        correctCount,
        wrongCount,
        skippedCount,
        timeTakenSecs,
        sectionScores,
        // Only include breakdown when not saved to DB (fallback for DB failures)
        // so the client can still show the analysis without a history fetch
        ...(savedToDb ? {} : { breakdown }),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Test submit error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
