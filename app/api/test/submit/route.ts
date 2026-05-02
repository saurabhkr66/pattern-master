import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getExamConfig, type ExamType } from "@/lib/examConfigs";
import type { SubmitAnswer } from "@/components/test/TestEngine";
interface BreakdownItem {
  questionId: string; source: string; sectionIndex: number; sectionName: string;
  questionType: string; marks: number; isOptional: boolean; counted: boolean;
  userAnswer: string | null; correctAnswer: string;
  isCorrect: boolean; isSkipped: boolean; explanation: string;
  questionText: string; options: string[] | null; subject?: string;
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
    const subjPyqIds = answers.filter((a) => a.source === "subject_pyq").map((a) => a.questionId);

    // Also try to get answers from the stored template (avoids N+1 lookups and handles all question types)
    let templateAnswers: Map<string, { correct_answer: string; explanation: string; question_text: string; options: unknown }> | null = null;
    if (mockTestId) {
      const template = await prisma.mockTestTemplate.findUnique({
        where: { id: mockTestId },
        select: { questions: true, sections: true },
      });
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
            },
          ])
        );
      }
    }

    // Fallback: fetch from individual tables
    const [fetchedPyqs, fetchedSubjPyqs] = await Promise.all([
      pyqIds.length > 0 && !templateAnswers
        ? prisma.pYQ.findMany({
            where: { id: { in: pyqIds } },
            select: { id: true, correct_answer: true, explanation: true, question_text: true, options: true },
          })
        : [],
      subjPyqIds.length > 0 && !templateAnswers
        ? prisma.subjectPYQ.findMany({
            where: { id: { in: subjPyqIds } },
            select: { id: true, correct_answer: true, explanation: true, question_text: true, options: true },
          })
        : [],
    ]);

    const pyqMap = new Map((fetchedPyqs as any[]).map((q) => [q.id, q]));
    const subjPyqMap = new Map((fetchedSubjPyqs as any[]).map((q) => [q.id, q]));

    function getQData(ans: SubmitAnswer) {
      if (templateAnswers) return templateAnswers.get(ans.questionId) ?? null;
      return ans.source === "pyq" ? pyqMap.get(ans.questionId) ?? null : subjPyqMap.get(ans.questionId) ?? null;
    }

    // ── Handle Section B optional questions ──
    // For each section with optional config, count only the first `countSize` answered optional questions.
    const sectionOptionalCounts: Map<number, number> = new Map();
    const countedOptionalIds: Set<string> = new Set();

    for (const ans of answers) {
      if (!ans.isOptional) continue;
      const sec = config.sections[ans.sectionIndex];
      if (!sec?.optional) continue;

      const soFar = sectionOptionalCounts.get(ans.sectionIndex) ?? 0;
      const isAnswered = ans.userAnswer && ans.userAnswer.trim() !== "";
      if (isAnswered && soFar < sec.optional.countSize) {
        countedOptionalIds.add(ans.questionId);
        sectionOptionalCounts.set(ans.sectionIndex, soFar + 1);
      }
    }

    // ── Grade all answers ──
    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    // Per-section tracking
    const sectionTrackers: Map<number, { score: number; maxScore: number; correct: number; wrong: number; skipped: number }> = new Map();
    config.sections.forEach((sec, si) => {
      sectionTrackers.set(si, { score: 0, maxScore: sec.maxScore, correct: 0, wrong: 0, skipped: 0 });
    });

    const breakdown: BreakdownItem[] = [];
    const negativePerMarkBySec = config.sections.map((sec) => sec.negativePerMark);

    for (const ans of answers) {
      const qData = getQData(ans);
      if (!qData) continue;

      const sec = config.sections[ans.sectionIndex];
      const negPerMark = negativePerMarkBySec[ans.sectionIndex] ?? 1 / 3;
      const isSkipped = !ans.userAnswer || ans.userAnswer.trim() === "";
      const isCounted = !ans.isOptional || countedOptionalIds.has(ans.questionId);

      let isCorrect = false;
      if (!isSkipped) {
        isCorrect = isAnswerCorrect(ans.questionType, ans.userAnswer!, qData.correct_answer);
      }

      // Score delta
      if (isCounted) {
        maxScore += ans.marks;
        const secT = sectionTrackers.get(ans.sectionIndex);

        if (isSkipped) {
          skippedCount++;
          if (secT) secT.skipped++;
        } else if (isCorrect) {
          correctCount++;
          score += ans.marks;
          if (secT) { secT.correct++; secT.score += ans.marks; }
        } else {
          wrongCount++;
          const penalty = negativeScore(ans.questionType, ans.marks, negPerMark);
          score -= penalty;
          if (secT) { secT.wrong++; secT.score -= penalty; }
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
        isOptional: ans.isOptional,
        counted: isCounted,
        userAnswer: ans.userAnswer ?? null,
        correctAnswer: qData.correct_answer,
        isCorrect: isCorrect && isCounted,
        isSkipped,
        explanation: qData.explanation,
        questionText: qData.question_text,
        options: Array.isArray(qData.options) ? (qData.options as string[]) : null,
      });
    }

    const finalScore = Math.max(0, Math.round(score * 100) / 100);

    // Build per-section score data
    const sectionScores: SectionScore[] = config.sections.map((sec, si) => {
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
    } catch (dbErr: any) {
      if (!(dbErr?.code === "P2021" || dbErr?.message?.includes("does not exist"))) throw dbErr;
    }

    // Save individual attempts for dashboard tracking (only correct ones for Mock Tests per user request)
    await Promise.allSettled(
      answers.map(async (ans) => {
        const qData = getQData(ans);
        if (!qData || !ans.userAnswer || ans.userAnswer.trim() === "") return;

        const isCorrect = isAnswerCorrect(ans.questionType, ans.userAnswer, qData.correct_answer);
        
        // Skip saving wrong questions from mock tests to avoid cluttering mistake/review pages
        if (!isCorrect) return;

        await prisma.attempt.create({
          data: {
            user_id: userId,
            pyq_id: ans.source === "pyq" ? ans.questionId : null,
            subject_pyq_id: ans.source === "subject_pyq" ? ans.questionId : null,
            is_correct: isCorrect,
            user_answer: ans.userAnswer,
          },
        });
      })
    );

    await revalidatePath("/dashboard", "page");
    await revalidateTag("dashboard", "page");

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
        breakdown,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Test submit error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
