import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createEach } from "@/lib/dbHttp";
import type { DppBreakdownItem } from "@/lib/dppResult";

// Fan a graded DPP run out into Attempt rows.
//
// Before this, only PRACTICE mode wrote attempts — so the review tool fed the
// dashboard streak and activity heatmap while the flagship action, the timed
// test, contributed nothing. A student whose whole week was DPP tests showed a
// zero streak.
//
// The streak query is `COUNT(*) … GROUP BY DATE(created_at)` with no question
// join (app/(app)/dashboard/_lib/queries.ts), so these rows light it up with no
// query change at all.
//
// What this deliberately does NOT change: the mistake room still reads DPP
// mistakes from DppRun.answers in its own tab, and `currentMistakesCount` keeps
// its `COALESCE(question_id, pyq_id) IS NOT NULL` guard. Counting these rows
// there too would double-count every DPP mistake against a tab fed from a
// different source. The weak-topic query DOES include them — see the note there.

/**
 * Lazily ensure the Clerk user has a User row before writing rows that FK to it.
 *
 * Same shape as the guard in app/api/save-attempt/route.ts, and needed for the
 * same reason: DppRun.user_id is deliberately not a FK (the (app) layout creates
 * the User row lazily), so someone who signed up and went straight to a DPP can
 * reach submit with a Clerk session and no User row. Kept local rather than
 * shared so the save-attempt hot path stays untouched.
 */
async function syncUser(userId: string): Promise<void> {
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  if (!email) throw new Error(`No email for Clerk user ${userId}`);
  await prisma.user.upsert({
    where: { email },
    create: { id: userId, email },
    update: { id: userId },
    select: { id: true },
  });
}

/**
 * Write one Attempt row per ANSWERED question in a graded run.
 *
 * Skipped questions (isCorrect === null) are excluded — an unanswered question
 * is not an attempt, and counting it would inflate the dashboard's
 * totalAttempted and pollute the accuracy ratio.
 *
 * Call this from `after()`: a 20-question sheet is 20 inserts on the Neon HTTP
 * adapter (createEach — createMany/$transaction throw there), and the student
 * should not wait for them to see their score.
 *
 * Safe to call exactly once per run. Both call sites are already gated by a
 * guarded UPDATE that only one request can win, so a retry or double-click
 * cannot duplicate these rows.
 */
export async function writeDppAttempts(
  userId: string,
  breakdown: DppBreakdownItem[],
): Promise<number> {
  const rows = breakdown
    .filter((b) => b.isCorrect !== null && b.questionId)
    .map((b) => ({
      user_id: userId,
      dpp_question_id: b.questionId,
      is_correct: b.isCorrect === true,
      user_answer: b.userAnswer,
      time_spent: b.timeSpentSecs || null,
    }));

  if (rows.length === 0) return 0;

  const insertAll = () =>
    createEach(rows, (data) => prisma.attempt.create({ data, select: { id: true } }));

  let created = 0;
  try {
    created = await insertAll();
  } catch (e) {
    // P2003 = FK violation. dpp_question_id came straight out of grading so it
    // is valid by construction, which leaves user_id: the User row is missing.
    // Every row fails together in that case, so retrying the whole batch cannot
    // duplicate a row that already landed.
    if ((e as { code?: string } | null)?.code !== "P2003") throw e;
    await syncUser(userId);
    created = await insertAll();
  }

  revalidateTag(`dashboard-${userId}`, { expire: 0 });
  revalidateTag(`mistakes-${userId}`, { expire: 0 });
  return created;
}
