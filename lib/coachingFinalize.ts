import "server-only";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedQuestion } from "@/lib/resolveQuestions";
import { computeAttemptScore, computeGradingStatus, type StoredAnswers } from "@/lib/coachingScore";
import { newSubjectiveEntry, MAX_SUBJECTIVE_PHOTOS } from "@/lib/subjectiveTypes";
import { answerKeyPrefix } from "@/lib/r2";
import { optionPermutation, optionSeed, type RuntimeTest } from "@/lib/coachingTestRuntime";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
  isTestFinalized,
  markTestFinalized,
} from "@/lib/coachingQuestionCache";
import { withDbRetry } from "@/lib/dbRetry";
import { readTabSwitches, clearTabSwitches } from "@/lib/coachingTabSwitch";
import { invalidateTestLeaderboard } from "@/lib/coachingLeaderboard";
import { getCoachingDraft } from "@/lib/coachingDraft";
import type { DraftState } from "@/components/test/testEngineTypes";

// Server-authoritative finalization of a coaching attempt.
//
// Two callers share this module so they grade IDENTICALLY:
//   - the live submit endpoint (browser-sent answers), and
//   - the on-view finalize path (a student who never submitted — closed app,
//     dead phone, lost Wi-Fi — graded from their last autosaved Redis answers
//     when a coach/student next opens the results).
//
// The timer the browser displayed is min(started_at + duration, end_at)
// (see the test page). We enforce the SAME deadline here so the server, not the
// student's clock, decides when time is up.

// Grace (seconds) added to the hard deadline before a submit is refused / an
// attempt is force-finalized. It must comfortably exceed the client auto-submit's
// 0–5s jitter + network lag + submit retries so a legitimate buzzer-fired
// submission is never wrongly rejected. A would-be late-finisher gains at most
// this window on a per-student-shuffled paper — negligible.
export const SUBMIT_GRACE_SECS = 60;

type Dateish = Date | string | null | undefined;

/** Effective deadline (epoch ms) = min(started_at + duration, end_at). */
export function attemptDeadlineMs(
  startedAt: Dateish,
  durationSecs: number,
  endAt: Dateish
): number {
  let ms = new Date(startedAt ?? 0).getTime() + durationSecs * 1000;
  if (endAt) ms = Math.min(ms, new Date(endAt).getTime());
  return ms;
}

/** True once `now` is past the deadline + grace (a submit must be refused). */
export function isPastDeadline(
  startedAt: Dateish,
  durationSecs: number,
  endAt: Dateish,
  now: number = Date.now(),
  graceSecs: number = SUBMIT_GRACE_SECS
): boolean {
  return now > attemptDeadlineMs(startedAt, durationSecs, endAt) + graceSecs * 1000;
}

/**
 * Convert a Redis draft (the engine's in-progress state) into display-space
 * answers + per-question times, EXACTLY mirroring TestEngine.buildAnswers so a
 * server-finalized attempt grades the same as a browser-submitted one. Answers
 * stay in DISPLAY space (shuffled option letters); gradeAndWrite de-shuffles.
 */
export function answersFromDraft(
  draft: DraftState | null,
  resolved: NormalizedQuestion[]
): { answers: Map<string, string>; times: Record<string, number> } {
  const answers = new Map<string, string>();
  const times: Record<string, number> = {};
  const mcq = draft?.mcqAnswers ?? {};
  const msq = draft?.msqAnswers ?? {};
  const nat = draft?.natValues ?? {};
  const subj = draft?.subjPhotos ?? {};
  const tmap = draft?.timeSpentMap ?? {};
  for (const q of resolved) {
    let ua = "";
    if (q.question_type === "msq") ua = msq[q.id]?.slice().sort().join(";") || "";
    else if (q.question_type === "nat") ua = (nat[q.id] ?? "").trim();
    // Subjective: the draft carries the uploaded photos' R2 keys — without this
    // branch a never-submitted student would silently lose their photo answers
    // on force-finalize.
    else if (q.question_type === "subjective") ua = (subj[q.id] ?? []).join(";");
    else ua = mcq[q.id] ?? ""; // mcq
    answers.set(q.id, ua);
    const t = Number(tmap[q.id]);
    if (Number.isFinite(t) && t >= 0) times[q.id] = Math.round(t);
  }
  return { answers, times };
}

/**
 * Grade display-space answers against the resolved question set and persist the
 * attempt as submitted. Shared by the live submit endpoint and the on-view
 * finalize path. De-shuffles MCQ answers back to original option letters when
 * the test shuffled options.
 *
 * The write is ALWAYS guarded on status: "in_progress" — it's a no-op (updated:
 * false) if the attempt has already been finalized. This makes the write itself
 * the single submit gate, so neither racing live submits nor the finalize-on-
 * view path can clobber an existing submission (which may carry fresher answers).
 * Callers should branch on `updated` to detect "already submitted".
 */
export async function gradeAndWrite(opts: {
  attemptId: string;
  studentId: string;
  coachingId: string;
  test: Pick<RuntimeTest, "id" | "shuffle">;
  resolved: NormalizedQuestion[];
  answers: Map<string, string>;
  times: Record<string, number>;
  timeTakenSecs: number | null;
}): Promise<{ score: number; maxScore: number; updated: boolean; needsGrading: boolean }> {
  const { attemptId, studentId, coachingId, test, resolved, answers, times, timeTakenSecs } = opts;

  // When options were shuffled for display, the student's answer is a DISPLAY
  // letter — map it back to the original option letter so grading (which compares
  // original labels) and the stored answer are correct.
  const toOriginalLetter = (q: { id: string; options: string[] }, displayLetter: string) => {
    const d = displayLetter.trim().toUpperCase().charCodeAt(0) - 65;
    if (d < 0 || d >= q.options.length) return displayLetter;
    const perm = optionPermutation(optionSeed(studentId, test.id, q.id), q.options.length);
    return String.fromCharCode(65 + perm[d]);
  };

  // Build the STORED answers (original option space). Objective answers stay
  // strings; a subjective answer becomes a SubjectiveAnswerEntry holding its
  // photos' R2 keys (graded asynchronously after this write).
  const keyPrefix = answerKeyPrefix(coachingId, test.id, attemptId);
  const storedAnswers: StoredAnswers = {};
  for (const q of resolved) {
    let ua = answers.get(q.id) ?? "";
    if (q.question_type === "subjective") {
      // The submit payload carries the photo keys joined with ";". Keep only
      // keys minted for THIS attempt (prefix check = ownership), max 3.
      const keys = ua
        .split(";")
        .map((k) => k.trim())
        .filter((k) => k.startsWith(keyPrefix))
        .slice(0, MAX_SUBJECTIVE_PHOTOS);
      storedAnswers[q.id] = keys.length ? newSubjectiveEntry(keys) : "";
      continue;
    }
    if (test.shuffle && q.question_type === "mcq" && ua && q.options.length) {
      ua = toOriginalLetter(q, ua);
    }
    storedAnswers[q.id] = ua;
  }

  // One shared formula for submit-time, post-AI, and post-override scoring.
  const { score, maxScore, sectionScores } = computeAttemptScore(resolved, storedAnswers);
  const gradingStatus = computeGradingStatus(resolved, storedAnswers);

  // Flush the Redis-accumulated tab-switch counter into this one write. null =
  // Redis was unavailable, so the count lives in the DB column already — don't
  // clobber it.
  const tabSwitches = await readTabSwitches(studentId, attemptId);
  const timeTaken =
    timeTakenSecs != null && Number.isFinite(timeTakenSecs) && timeTakenSecs >= 0
      ? Math.round(timeTakenSecs)
      : null;
  // JSON columns are written as parameterized text cast to jsonb.
  const answersJson = JSON.stringify(storedAnswers);
  const timesJson = JSON.stringify(times);
  const sectionJson = sectionScores ? JSON.stringify(sectionScores) : null;

  let updated = true;
  // Retry the score write — a transient Neon blip here must not lose a submission.
  await withDbRetry(async () => {
    // Guarded on status so exactly one finalize wins: a no-op if a real submission
    // already landed (status flipped) — never overwrite it with a racing submit or
    // the possibly-staler autosaved draft. Implemented as a SINGLE guarded UPDATE,
    // NOT updateMany — the Neon HTTP adapter runs updateMany via a transaction,
    // which HTTP mode forbids ("Transactions are not supported in HTTP mode"); a
    // lone UPDATE statement needs no transaction and is atomic on its own.
    // tab_switches uses COALESCE so a null (Redis-unavailable) read keeps the
    // existing DB-side counter instead of clobbering it.
    const count = await prisma.$executeRaw(Prisma.sql`
      UPDATE "TestAttempt"
      SET status = 'submitted',
          answers = ${answersJson}::jsonb,
          score = ${score},
          max_score = ${maxScore},
          time_taken_secs = ${timeTaken},
          question_times = ${timesJson}::jsonb,
          submitted_at = ${new Date()},
          tab_switches = COALESCE(${tabSwitches}::int, tab_switches),
          section_scores = ${sectionJson}::jsonb,
          grading_status = ${gradingStatus}
      WHERE id = ${attemptId} AND status = 'in_progress'
    `);
    updated = count > 0;
  });

  // Counter persisted — drop the Redis key (best-effort).
  if (tabSwitches != null && updated) await clearTabSwitches(studentId, attemptId);

  // This attempt's score just changed the test's ranking — bust the cached
  // leaderboard so the next view recomputes. Single choke point: covers live
  // submits, batch auto-submits, and on-view force-finalized attempts alike.
  if (updated) await invalidateTestLeaderboard(test.id);
  // pending = ≥1 photo answer awaiting AI — the caller fires the async grader.
  return { score, maxScore, updated, needsGrading: updated && gradingStatus === "pending" };
}

/**
 * Force-finalize every in-progress attempt of a test whose deadline has passed,
 * grading each from its last autosaved Redis answers. Called on-view (coach
 * results page, student result page) so a student who never submitted still gets
 * their written answers saved and scored — no scheduler required.
 *
 * Bounded + best-effort: one attempt's failure (missing draft, transient DB
 * blip) is swallowed so it never breaks the page; the next view retries it.
 * Returns how many attempts were finalized.
 */
export async function finalizeOverdueAttempts(
  testId: string,
  coachingId: string
): Promise<number> {
  // Fast path: once the window has closed and every attempt is finalized, a
  // permanent Redis marker lets repeat views (results / leaderboard / result
  // pages) skip the two DB reads below — these pages are hit far more often
  // after a test ends than during it.
  if (await isTestFinalized(testId)) return 0;

  const test = await prisma.coachingTest.findFirst({
    where: { id: testId, coaching_id: coachingId },
    select: {
      id: true,
      questions: true,
      shuffle: true,
      pool_size: true,
      duration_secs: true,
      end_at: true,
    },
  });
  if (!test) return 0;

  const open = await prisma.testAttempt.findMany({
    where: { test_id: testId, coaching_id: coachingId, status: "in_progress" },
    select: { id: true, student_id: true, started_at: true },
  });

  const now = Date.now();
  // The window is permanently closed only when end_at exists and now is past it
  // + grace — after that no attempt can legitimately be (or become) in progress.
  const windowClosed =
    test.end_at != null &&
    now > new Date(test.end_at).getTime() + SUBMIT_GRACE_SECS * 1000;

  if (open.length === 0) {
    // Nothing left in progress. If the window is also closed, no future attempt
    // can appear — set the marker so subsequent views short-circuit. (Re-mark is
    // idempotent; the marker is cleared if the test is later edited/reopened.)
    if (windowClosed) await markTestFinalized(testId);
    return 0;
  }

  const overdue = open.filter((a) =>
    isPastDeadline(a.started_at, test.duration_secs, test.end_at, now)
  );
  if (overdue.length === 0) return 0;

  const runtimeTest: RuntimeTest = {
    id: test.id,
    questions: test.questions,
    shuffle: test.shuffle,
    pool_size: test.pool_size,
  };
  // Resolved set is identical for every student of the test — resolve once.
  const base = await getResolvedTestQuestions(runtimeTest, coachingId);
  const deadlineMs = (startedAt: Date) =>
    attemptDeadlineMs(startedAt, test.duration_secs, test.end_at);

  // Batch all Redis draft reads in parallel — each is one Redis GET, and they
  // are independent. This replaces the sequential per-attempt loop that caused
  // ~500 serial I/O operations when 100 students' attempts expired at once.
  const draftsAndResolved = await Promise.all(
    overdue.map(async (a) => ({
      attempt: a,
      resolved: studentQuestionsFromBase(base, runtimeTest, a.student_id),
      draft: await getCoachingDraft(a.id, a.student_id),
    }))
  );

  // Grade + write all in parallel. Each gradeAndWrite is independently guarded
  // by `WHERE status = 'in_progress'` so concurrent writes are safe.
  const results = await Promise.all(
    draftsAndResolved.map(async ({ attempt: a, resolved, draft }) => {
      try {
        const { answers, times } = answersFromDraft(draft, resolved);
        const timeTaken = Math.round(
          (deadlineMs(a.started_at) - new Date(a.started_at).getTime()) / 1000
        );
        const res = await gradeAndWrite({
          attemptId: a.id,
          studentId: a.student_id,
          coachingId,
          test: runtimeTest,
          resolved,
          answers,
          times,
          timeTakenSecs: timeTaken,
        });
        // Photo answers recovered from the draft are left at grading_status =
        // pending for the Gemini BATCH sweeper (cheaper than per-answer calls);
        // we nudge it ONCE after the loop rather than grading inline per attempt.
        return { updated: res.updated ? 1 : 0, needsGrading: res.needsGrading };
      } catch (err) {
        console.error(`[finalize] attempt ${a.id} failed:`, err);
        return { updated: 0, needsGrading: false };
      }
    })
  );

  const finalized = results.reduce<number>((s, r) => s + r.updated, 0);

  // If any finalized attempt has pending photo answers, nudge the batch sweeper
  // after the response flushes so grading advances on this view without waiting
  // for cron. Idempotent + lock-guarded; the cron and admin "Grade ungraded"
  // button remain the backstops.
  if (results.some((r) => r.needsGrading)) {
    after(() =>
      import("@/lib/subjectiveBatch")
        .then((m) => m.nudgeGradingSweep())
        .catch((err) => console.error("[finalize] grading nudge failed:", err))
    );
  }

  // Invalidate the leaderboard ONCE for the whole batch, not per-attempt.
  // The debounced invalidateTestLeaderboard handles dedup, but calling once
  // here is cleaner and avoids even the Redis check per attempt.
  if (finalized > 0) await invalidateTestLeaderboard(test.id);

  return finalized;
}
