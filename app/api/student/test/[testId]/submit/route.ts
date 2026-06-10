import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
  getCachedTestConfig,
} from "@/lib/coachingQuestionCache";
import { gradeAndWrite, isPastDeadline } from "@/lib/coachingFinalize";

// Headroom for the after() grading worker on serverless (no-op on the VPS node
// server): Gemini grades a full subjective paper in well under this.
export const maxDuration = 120;

/**
 * Submit a coaching test attempt: score it server-side and mark it submitted.
 *
 * Billing is handled MANUALLY/offline (owner decision) — we do NOT write a
 * BillingEvent here. The billing dashboard derives amount due from the count of
 * submitted attempts × price_per_test. This also sidesteps the Neon HTTP
 * adapter's lack of transactions: submission is a single idempotent update.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    // getCurrentStudent enforces the single-session token (a kicked session 401s here).
    const student = await getCurrentStudent();
    if (!student) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const sid = student.id;
    const cid = student.coaching_id;

    const { attemptId, answers, timeTakenSecs } = await req.json();
    if (!attemptId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    // Authorize against the attempt row alone (id + tenancy). started_at lets us
    // enforce the deadline server-side. The test's runtime config comes from
    // Redis (warmed by the test page on render), so we don't join the test row
    // into every submit during a batch's auto-submit spike.
    // The attempt row (Neon) and the runtime config (Redis) are independent —
    // both keyed only by the student/test — so fetch them in parallel. This
    // overlaps the DB read with the cache read during a batch's auto-submit
    // spike. The cheap Redis read on the rare already-submitted path is harmless.
    const [attempt, test] = await Promise.all([
      prisma.testAttempt.findFirst({
        where: { id: attemptId, test_id: testId, student_id: sid, coaching_id: cid },
        select: { id: true, status: true, started_at: true },
      }),
      getCachedTestConfig(testId, cid),
    ]);
    if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });

    // Idempotent: already submitted → just return.
    if (attempt.status === "submitted") {
      return NextResponse.json({ ok: true, attemptId, alreadySubmitted: true });
    }

    if (!test) return NextResponse.json({ error: "test not found" }, { status: 404 });

    // Server-authoritative deadline (live-test integrity): the timer lived in the
    // browser, but the server decides when time is up. Past the shared deadline
    // (+ grace for jitter/network) we refuse the submit — the student's answers
    // were autosaved to Redis and are finalized on-view from there instead, so a
    // delayed/replayed submit can't buy extra time.
    if (
      test.duration_secs != null &&
      isPastDeadline(attempt.started_at, test.duration_secs, test.end_at ?? null)
    ) {
      return NextResponse.json({ error: "time expired" }, { status: 403 });
    }

    // Rebuild the EXACT question set this student saw — from the cached base.
    const base = await getResolvedTestQuestions(test, cid);
    const resolved = studentQuestionsFromBase(base, test, sid);

    // Map submitted answers + per-question time by questionId (display space;
    // gradeAndWrite de-shuffles before grading).
    const answerMap = new Map<string, string>();
    const questionTimes: Record<string, number> = {};
    for (const a of answers) {
      if (a && typeof a.questionId === "string") {
        answerMap.set(a.questionId, a.userAnswer == null ? "" : String(a.userAnswer));
        const t = Number(a.timeSpentSecs);
        if (Number.isFinite(t) && t >= 0) questionTimes[a.questionId] = Math.round(t);
      }
    }

    const totalTime = Number(timeTakenSecs);
    const { score, maxScore, updated, needsGrading } = await gradeAndWrite({
      attemptId,
      studentId: sid,
      coachingId: cid,
      test,
      resolved,
      answers: answerMap,
      times: questionTimes,
      timeTakenSecs: Number.isFinite(totalTime) ? totalTime : null,
    });
    // gradeAndWrite guards on status: "in_progress", so the status read above is
    // just a fast path — the write itself is the gate. A double-click / retry /
    // second tab (or a replay after the on-view finalizer already graded this)
    // gets updated: false here instead of clobbering the stored submission.

    // Lost the race / already finalized — the winning write owns the score, so
    // report it as a no-op submit rather than returning this attempt's recompute.
    if (!updated) {
      return NextResponse.json({ ok: true, attemptId, alreadySubmitted: true });
    }

    // Photo answers (if any) are graded by Gemini AFTER this response flushes —
    // the student sees "Submitted" instantly, never waits on the AI. A failure
    // here leaves grading_status = "pending"; the admin's "Grade ungraded"
    // button on the results page is the retry net.
    if (needsGrading) {
      after(() =>
        import("@/lib/subjectiveGrading")
          .then((m) => m.gradeAttemptSubjectives({ attemptId, coachingId: cid, trigger: "auto" }))
          .catch((err) => console.error(`[submit] grading ${attemptId} failed:`, err))
      );
    }

    return NextResponse.json({ ok: true, attemptId, score, maxScore });
  } catch (err) {
    console.error("coaching test submit failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
