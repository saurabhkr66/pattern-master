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
import { isAnswerCorrect } from "@/lib/objectiveGrade";
import { redis, isRedisConfigured } from "@/lib/redis";

// A stored template question — the ONLY source of grading facts. The client's
// answer payload contributes nothing but the chosen answer and time spent;
// marks, type and section used to be read from it, which let a crafted request
// award itself any score.
interface TemplateQuestion {
  id: string;
  source?: string;
  sectionIndex: number;
  isOptional?: boolean;
  question_type: string;
  marks: number;
  subject?: string;
  topic?: string;
  topic_name?: string;
  correct_answer: string;
  explanation: string;
  question_text: string;
  options: unknown;
}

// A submit with no draft to claim (draft start failed, or a repeat request
// that lost the race) returns the user's session from this window instead of
// creating a duplicate.
const DUPLICATE_WINDOW_MS = 60_000;

function sessionResponse(s: {
  id: string; score: number; max_score: number; correct_count: number;
  wrong_count: number; skipped_count: number; time_taken_secs: number | null;
  section_scores: unknown;
}) {
  return NextResponse.json({
    sessionId: s.id,
    score: s.score,
    maxScore: s.max_score,
    correctCount: s.correct_count,
    wrongCount: s.wrong_count,
    skippedCount: s.skipped_count,
    timeTakenSecs: s.time_taken_secs,
    sectionScores: s.section_scores,
    duplicate: true,
  });
}

async function findRecentSession(userId: string, mockTestId: string) {
  return prisma.testSession.findFirst({
    where: {
      user_id: userId,
      mock_test_id: mockTestId,
      created_at: { gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true, score: true, max_score: true, correct_count: true,
      wrong_count: true, skipped_count: true, time_taken_secs: true,
      section_scores: true,
    },
  });
}
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
// checkMcq/checkMsq/checkNat/isAnswerCorrect moved verbatim to
// lib/objectiveGrade.ts so the DPP submit path grades identically. Behaviour is
// unchanged; see the import at the top of this file.

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
    // Every consumer test is served from a stored template (/api/test/generate
    // always creates one), and the template is the only trustworthy grading source.
    if (!mockTestId || typeof mockTestId !== "string") {
      return NextResponse.json({ error: "mockTestId is required" }, { status: 400 });
    }

    const template = await getCachedTemplateById(mockTestId);
    const templateQs = (template?.questions ?? []) as TemplateQuestion[];
    if (!template || templateQs.length === 0) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // ── Double-submit guard ──
    // A double click / network retry used to create two sessions (and two
    // leaderboard rows). The lock serialises submits per user+test; a request
    // that loses the race waits for the winner and returns its result.
    const lockKey = `submit-lock:${userId}:${mockTestId}`;
    let lockHeld = false;
    if (isRedisConfigured()) {
      // Redis failure → proceed unguarded rather than block the submission.
      const acquired = await redis.set(lockKey, "1", { nx: true, ex: 30 }).catch(() => "OK");
      if (!acquired) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const existing = await findRecentSession(userId, mockTestId);
          if (existing) return sessionResponse(existing);
        }
        return NextResponse.json({ error: "Submission already in progress" }, { status: 409 });
      }
      lockHeld = true;
    }

    try {
      // Claim (delete) the in-progress draft. Its started_at is the server's
      // record of when this attempt began. Single DELETE ... RETURNING: one
      // round-trip, and the returned ids still drive Redis cleanup.
      const claimedDrafts = await prisma.$queryRaw<{ id: string; started_at: Date }[]>`
        DELETE FROM "TestSessionDraft"
        WHERE user_id = ${userId} AND mock_test_id = ${mockTestId}
        RETURNING id, started_at
      `.catch(() => [] as { id: string; started_at: Date }[]);
      for (const d of claimedDrafts) {
        clearDraft(userId, d.id).catch(() => {});
      }

      // No draft to claim: either draft start failed on the client, or an earlier
      // submit already consumed it. In the latter case, hand back that session.
      if (claimedDrafts.length === 0) {
        const existing = await findRecentSession(userId, mockTestId);
        if (existing) return sessionResponse(existing);
      }

      // ── Time taken ──
      // Server-measured from the draft's start; the client figure is only a
      // fallback when there was no draft. Either way it's capped at the paper's
      // duration — it's the leaderboard tiebreak, so it can't be client-chosen.
      const durationCap = template.duration_secs > 0 ? template.duration_secs : null;
      let effectiveTimeSecs: number | null = null;
      if (claimedDrafts.length > 0) {
        const startedAt = Math.max(...claimedDrafts.map((d) => new Date(d.started_at).getTime()));
        effectiveTimeSecs = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      } else {
        const clientTime = Number(timeTakenSecs);
        if (Number.isFinite(clientTime) && clientTime >= 0) effectiveTimeSecs = Math.round(clientTime);
      }
      if (effectiveTimeSecs !== null && durationCap !== null) {
        effectiveTimeSecs = Math.min(effectiveTimeSecs, durationCap);
      }

      const config = getExamConfig(examType as ExamType, branch ?? undefined);

      // Section list for scoring. The template's own sections are authoritative:
      // a user-sized random paper has fewer sections and much smaller per-section
      // maxScores than the full exam config, and sectionIndex on each question is a
      // position in *this* list. Fall back to the exam config for old templates.
      let paperSections: { name: string; maxScore: number; negativePerMark: number }[] = config.sections;
      if (Array.isArray(template.sections) && template.sections.length > 0) {
        paperSections = template.sections as typeof paperSections;
      }

      // Grading rule keyed off the template's exam, not the request body.
      const isAdvancedPaper =
        String(template.exam_type ?? "").replace(/\s+/g, "_").toUpperCase() === "JEE_ADVANCED";

      // The client contributes only its chosen answer and time spent per question.
      // Unknown ids are ignored; a repeated id keeps its first occurrence.
      const submitted = new Map<string, SubmitAnswer>();
      for (const a of answers) {
        if (a && typeof a.questionId === "string" && !submitted.has(a.questionId)) {
          submitted.set(a.questionId, a);
        }
      }

      // ── Grade every question in the paper ──
      // Iterating the template (not the payload) means an omitted question is
      // counted as skipped and still contributes to maxScore.
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

      for (const q of templateQs) {
        const ans = submitted.get(q.id);
        const questionType = q.question_type || "MCQ";
        const marks = Number(q.marks) || 0;
        const sectionIndex = Number.isInteger(q.sectionIndex) ? q.sectionIndex : 0;
        const userAnswer =
          typeof ans?.userAnswer === "string" && ans.userAnswer.trim() !== ""
            ? ans.userAnswer.slice(0, 200)
            : null;
        const rawTime = Number(ans?.timeSpentSecs);
        const timeSpentSecs = Number.isFinite(rawTime) && rawTime > 0
          ? Math.min(Math.round(rawTime), durationCap ?? Math.round(rawTime))
          : 0;

        const sec = paperSections[sectionIndex];
        const negPerMark = negativePerMarkBySec[sectionIndex] ?? 1 / 3;
        const isSkipped = userAnswer === null;
        const isCounted = true;

        const isAdvancedMsq = questionType === "MSQ" && isAdvancedPaper;

        let isCorrect = false;
        if (!isSkipped) {
          isCorrect = isAnswerCorrect(questionType, userAnswer!, q.correct_answer);
        }

        // Marks awarded for this question (can be negative). For JEE Advanced
        // MSQ we award partial credit; everything else is all-or-nothing with
        // MCQ negative marking.
        let awardedMarks = 0;
        if (!isSkipped) {
          if (isAdvancedMsq) {
            awardedMarks = scoreAdvancedMsq(userAnswer!, q.correct_answer, marks);
          } else if (isCorrect) {
            awardedMarks = marks;
          } else {
            awardedMarks = -negativeScore(questionType, marks, negPerMark);
          }
        }

        // Score delta
        if (isCounted) {
          maxScore += marks;
          const secT = sectionTrackers.get(sectionIndex);
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
          questionId: q.id,
          source: q.source ?? "template",
          sectionIndex,
          sectionName: sec?.name ?? String(sectionIndex),
          questionType,
          marks,
          subject: q.subject ?? ans?.subject,
          topic: q.topic || q.topic_name || "General",
          isOptional: q.isOptional ?? false,
          counted: isCounted,
          userAnswer,
          correctAnswer: q.correct_answer,
          isCorrect: isCorrect && isCounted,
          isSkipped,
          awardedMarks: Math.round(awardedMarks * 100) / 100,
          explanation: q.explanation,
          questionText: q.question_text,
          options: Array.isArray(q.options) ? (q.options as string[]) : null,
          timeSpentSecs,
        });
      }

      // No zero floor: real GATE/JEE/NEET scores go negative, and clamping hid
      // it (and disagreed with the per-question gained/lost marks shown).
      const finalScore = Math.round(score * 100) / 100;

      // Build per-section score data
      const sectionScores: SectionScore[] = paperSections.map((sec, si) => {
        const t = sectionTrackers.get(si)!;
        return {
          name: sec.name,
          score: Math.round(t.score * 100) / 100,
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
            total_questions: templateQs.length,
            correct_count: correctCount,
            wrong_count: wrongCount,
            skipped_count: skippedCount,
            time_taken_secs: effectiveTimeSecs,
            section_scores: sectionScores as any,
            answers: breakdown as any,
            mock_test_id: mockTestId,
          },
        });
        sessionId = session.id;
        savedToDb = true;
      } catch (dbErr: any) {
        if (!(dbErr?.code === "P2021" || dbErr?.message?.includes("does not exist"))) throw dbErr;
      }

      // Save attempts for dashboard tracking (bulk insert for performance)
      const attemptData = breakdown
        .filter((b) => !b.isSkipped)
        .map((b) => {
          const isPyq = b.source === "pyq";
          return {
            user_id: userId,
            pyq_id: isPyq ? b.questionId : null,
            // Mock questions live inside MockTestTemplate.questions as self-contained
            // JSON — deliberately NOT rows in PYQ/GeneratedQuestion, so there is
            // nothing to FK to. `mock_question_id` is a loose string for exactly
            // that case; without it the row carries no identity at all and the
            // `mock_question_id IS NULL` filter in dashboard/_lib/queries.ts (which
            // exists to keep mock answers out of "current mistakes") silently
            // matches every row. Same FK + same value as TestSession.mock_test_id.
            mock_question_id: isPyq ? null : b.questionId,
            mock_test_id: mockTestId,
            is_correct: b.isCorrect,
            user_answer: b.userAnswer,
            time_spent: b.timeSpentSecs || null,
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
      if (savedToDb) {
        recordSubmission({
          mockId: mockTestId,
          sessionId,
          userId,
          score: finalScore,
          maxScore,
          timeTakenSecs: effectiveTimeSecs,
        }).catch((e) => console.warn("[leaderboard] recordSubmission failed", e));
      }

      await revalidatePath("/dashboard", "page");
      await revalidateTag("dashboard", "max");
      await revalidateTag("history", "max");
      await revalidateTag("mocks", "max");
      await revalidateTag("leaderboard", "max");
      // The dashboard/mistakes queries (dashboard/_lib/queries.ts) are tagged
      // per-user (`dashboard-${userId}` / `mistakes-${userId}`), not by the
      // generic tags above, so those never got busted on mock submit — only
      // save-attempt's practice path did. Mock results looked stale/missing on
      // the dashboard for up to the 300s TTL fallback until it expired.
      await revalidateTag(`dashboard-${userId}`, { expire: 0 });
      await revalidateTag(`mistakes-${userId}`, { expire: 0 });

      return NextResponse.json(
        {
          sessionId,
          score: finalScore,
          maxScore,
          correctCount,
          wrongCount,
          skippedCount,
          timeTakenSecs: effectiveTimeSecs,
          sectionScores,
          // Only include breakdown when not saved to DB (fallback for DB failures)
          // so the client can still show the analysis without a history fetch
          ...(savedToDb ? {} : { breakdown }),
        },
        { status: 201 }
      );
    } finally {
      if (lockHeld) await redis.del(lockKey).catch(() => {});
    }
  } catch (err) {
    console.error("Test submit error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
