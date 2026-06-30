import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { studentInTestBatches } from "@/lib/coachingBatch";
import { testWindowState } from "@/lib/coachingTestRuntime";
import { getResolvedTestQuestions, studentQuestionsFromBase } from "@/lib/coachingQuestionCache";
import { finalizeAssignment } from "@/lib/assignmentFinalize";
import { scoreQuestion, type NormalizedQuestion } from "@/lib/resolveQuestions";

// Headroom for the after() leaderboard invalidation worker.
export const maxDuration = 60;

// Per-question feedback shown AFTER a submit (never before — solutions stay
// server-side until the student commits an answer). For objective questions we
// send the correct option TEXT (not its letter) because options are shuffled
// per student, so a letter would be meaningless in the student's display order.
type Feedback = {
  questionId: string;
  type: NormalizedQuestion["question_type"];
  awarded: number;
  maxMarks: number;
  correct: boolean | null; // null = subjective (no instant verdict)
  correctText: string | null;
  solutionHtml: string | null;
};

const letterIdx = (l: string) => l.trim().toUpperCase().charCodeAt(0) - 65;
function correctOptionText(q: NormalizedQuestion): string | null {
  if (q.question_type === "nat") return q.correct_answer || null;
  if (q.question_type === "mcq" || q.question_type === "msq") {
    const letters = q.correct_answer.split(";").map((s) => s.trim()).filter(Boolean);
    const texts = letters
      .map((l) => q.options[letterIdx(l)])
      .filter((t): t is string => !!t);
    return texts.length ? texts.join("; ") : null;
  }
  return null;
}

/**
 * Submit a homework/assignment attempt. Two actions:
 *   "check"  — objective auto-scored for instant feedback; attempt stays
 *              retryable (status in_progress). Subjective answers are stored but
 *              not graded.
 *   "review" — locks the attempt (review_locked). If it carries a subjective
 *              answer it enters the teacher's review queue (grading_status
 *              awaiting_teacher); the super-admin "AI grade" button is the only
 *              thing that runs Gemini. Nothing is auto-graded or auto-billed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const student = await getCurrentStudent();
    if (!student) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (student.status !== "approved") {
      return NextResponse.json({ error: "enrollment not approved" }, { status: 403 });
    }
    const sid = student.id;
    const cid = student.coaching_id;

    const body = await req.json();
    const action = body?.action === "review" ? "review" : "check";
    const answers = body?.answers;
    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const test = await prisma.coachingTest.findFirst({
      where: { id: testId, coaching_id: cid },
      select: {
        id: true, mode: true, status: true, batch_ids: true, end_at: true,
        shuffle: true, pool_size: true, questions: true, pass_pct: true,
      },
    });
    if (!test || test.mode !== "assignment") {
      return NextResponse.json({ error: "assignment not found" }, { status: 404 });
    }
    if (test.status !== "active") {
      return NextResponse.json({ error: "assignment not available" }, { status: 403 });
    }
    if (!studentInTestBatches(test.batch_ids, student.batch_id)) {
      return NextResponse.json({ error: "assignment not available" }, { status: 403 });
    }
    // Due date is a hard close: past it the assignment is read-only.
    if (testWindowState(null, test.end_at) === "after") {
      return NextResponse.json({ error: "assignment closed" }, { status: 410 });
    }

    // One row per (assignment, student) — created by the assignment page on open.
    const attempt = await prisma.testAttempt.findFirst({
      where: { test_id: testId, student_id: sid, coaching_id: cid },
      select: { id: true, status: true },
    });
    if (!attempt) {
      return NextResponse.json({ error: "open the assignment first" }, { status: 409 });
    }
    // Locked for review — no more edits until a teacher acts on it.
    if (attempt.status === "review_locked") {
      return NextResponse.json({ error: "already submitted for review", locked: true }, { status: 409 });
    }

    const base = await getResolvedTestQuestions(test, cid);
    const resolved = studentQuestionsFromBase(base, test, sid);

    const answerMap = new Map<string, string>();
    const times: Record<string, number> = {};
    for (const a of answers) {
      if (a && typeof a.questionId === "string") {
        answerMap.set(a.questionId, a.userAnswer == null ? "" : String(a.userAnswer));
        const t = Number(a.timeSpentSecs);
        if (Number.isFinite(t) && t >= 0) times[a.questionId] = Math.round(t);
      }
    }

    const result = await finalizeAssignment({
      attemptId: attempt.id,
      studentId: sid,
      coachingId: cid,
      test,
      resolved,
      answers: answerMap,
      times,
      action,
    });

    // Build per-question feedback from the STORED (de-shuffled) answers.
    const feedback: Feedback[] = resolved.map((q) => {
      if (q.question_type === "subjective") {
        return { questionId: q.id, type: q.question_type, awarded: 0, maxMarks: q.marks, correct: null, correctText: null, solutionHtml: null };
      }
      const stored = result.storedAnswers[q.id];
      const ua = typeof stored === "string" ? stored : "";
      const awarded = scoreQuestion(q, ua) ?? 0;
      return {
        questionId: q.id,
        type: q.question_type,
        awarded,
        maxMarks: q.marks,
        correct: awarded >= q.marks && q.marks > 0,
        correctText: correctOptionText(q),
        solutionHtml: q.solution_html ?? q.solution ?? null,
      };
    });

    const pct = result.maxScore > 0 ? (result.score / result.maxScore) * 100 : 0;
    const passPct = test.pass_pct ?? 0;
    const passed = result.maxScore > 0 && pct >= passPct;

    return NextResponse.json({
      ok: true,
      action,
      status: result.status,
      gradingStatus: result.gradingStatus,
      hasSubjective: result.hasSubjective,
      score: result.score,
      maxScore: result.maxScore,
      passPct,
      passed,
      // Subjective is ungraded at submit, so a paper with subjective can't be
      // "passed" yet — the runner shows "awaiting teacher" instead.
      awaitingReview: result.status === "review_locked" && result.gradingStatus === "awaiting_teacher",
      feedback,
    });
  } catch (err) {
    console.error("assignment submit failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
