import "server-only";
import { prisma } from "@/lib/prisma";
import { scoreQuestion, type NormalizedQuestion } from "@/lib/resolveQuestions";
import { optionPermutation, optionSeed, type RuntimeTest } from "@/lib/coachingTestRuntime";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
} from "@/lib/coachingQuestionCache";
import { withDbRetry } from "@/lib/dbRetry";
import { readTabSwitches, clearTabSwitches } from "@/lib/coachingTabSwitch";
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
  const tmap = draft?.timeSpentMap ?? {};
  for (const q of resolved) {
    let ua = "";
    if (q.question_type === "msq") ua = msq[q.id]?.slice().sort().join(";") || "";
    else if (q.question_type === "nat") ua = (nat[q.id] ?? "").trim();
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
 * `guardInProgress` makes the write a no-op if the attempt is no longer
 * in_progress — used by finalize-on-view so it never clobbers a real submission
 * (which may carry fresher answers than the autosaved draft).
 */
export async function gradeAndWrite(opts: {
  attemptId: string;
  studentId: string;
  test: Pick<RuntimeTest, "id" | "shuffle">;
  resolved: NormalizedQuestion[];
  answers: Map<string, string>;
  times: Record<string, number>;
  timeTakenSecs: number | null;
  guardInProgress?: boolean;
}): Promise<{ score: number; maxScore: number; updated: boolean }> {
  const { attemptId, studentId, test, resolved, answers, times, timeTakenSecs } = opts;

  // When options were shuffled for display, the student's answer is a DISPLAY
  // letter — map it back to the original option letter so grading (which compares
  // original labels) and the stored answer are correct.
  const toOriginalLetter = (q: { id: string; options: string[] }, displayLetter: string) => {
    const d = displayLetter.trim().toUpperCase().charCodeAt(0) - 65;
    if (d < 0 || d >= q.options.length) return displayLetter;
    const perm = optionPermutation(optionSeed(studentId, test.id, q.id), q.options.length);
    return String.fromCharCode(65 + perm[d]);
  };

  let score = 0;
  let maxScore = 0;
  const storedAnswers: Record<string, string> = {};
  for (const q of resolved) {
    maxScore += q.marks;
    let ua = answers.get(q.id) ?? "";
    if (test.shuffle && q.question_type === "mcq" && ua && q.options.length) {
      ua = toOriginalLetter(q, ua);
    }
    storedAnswers[q.id] = ua;
    const s = scoreQuestion(q, ua);
    if (s != null) score += s; // null = subjective (not in v1 tests), skip
  }
  // Floor the total at 0 — negative marking can push the raw sum below zero, but
  // a test score should never display negative (matches the consumer mock flow).
  score = Math.max(0, score);

  // Flush the Redis-accumulated tab-switch counter into this one write. null =
  // Redis was unavailable, so the count lives in the DB column already — don't
  // clobber it.
  const tabSwitches = await readTabSwitches(studentId, attemptId);
  const data = {
    status: "submitted",
    answers: storedAnswers,
    score,
    max_score: maxScore,
    time_taken_secs:
      timeTakenSecs != null && Number.isFinite(timeTakenSecs) && timeTakenSecs >= 0
        ? Math.round(timeTakenSecs)
        : null,
    question_times: times,
    submitted_at: new Date(),
    ...(tabSwitches != null ? { tab_switches: tabSwitches } : {}),
  };

  let updated = true;
  // Retry the score write — a transient Neon blip here must not lose a submission.
  await withDbRetry(async () => {
    if (opts.guardInProgress) {
      // No-op if a real submission already landed (status flipped) — never
      // overwrite it with the possibly-staler draft.
      const r = await prisma.testAttempt.updateMany({
        where: { id: attemptId, status: "in_progress" },
        data,
      });
      updated = r.count > 0;
    } else {
      await prisma.testAttempt.update({ where: { id: attemptId }, data });
    }
  });

  // Counter persisted — drop the Redis key (best-effort).
  if (tabSwitches != null && updated) await clearTabSwitches(studentId, attemptId);
  return { score, maxScore, updated };
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
  if (open.length === 0) return 0;

  const now = Date.now();
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

  let finalized = 0;
  for (const a of overdue) {
    try {
      const resolved = studentQuestionsFromBase(base, runtimeTest, a.student_id);
      const draft = await getCoachingDraft(a.id, a.student_id);
      const { answers, times } = answersFromDraft(draft, resolved);
      // The student worked from start until the deadline (they never submitted),
      // so record time taken as the full window up to the deadline.
      const timeTaken = Math.round(
        (deadlineMs(a.started_at) - new Date(a.started_at).getTime()) / 1000
      );
      const res = await gradeAndWrite({
        attemptId: a.id,
        studentId: a.student_id,
        test: runtimeTest,
        resolved,
        answers,
        times,
        timeTakenSecs: timeTaken,
        guardInProgress: true,
      });
      if (res.updated) finalized++;
    } catch (err) {
      console.error(`[finalize] attempt ${a.id} failed:`, err);
    }
  }
  return finalized;
}
