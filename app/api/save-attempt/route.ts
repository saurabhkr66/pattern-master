// app/api/save-attempt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { rateLimit } from "@/lib/rateLimit";

// Lazily ensure the authenticated Clerk user has a matching User row before we
// write rows that FK to it. The (app) layout normally upserts this, but it
// skips the upsert on a `getCachedUserBasic` cache hit (7d TTL) — so a stale
// cache after a DB reset/switch leaves us with a Clerk session but no User row.
// We only pay the Clerk round-trip on the FK-miss retry path, never on the
// hot path.
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


export async function POST(req: NextRequest) {
    try {
        const [{ userId }, body] = await Promise.all([auth(), req.json()]);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rl = await rateLimit(`attempt:${userId}`, 60, 60);
        if (!rl.success) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
        }

        const { questionId, pyqId, mockQuestionId, dppQuestionId, isCorrect, userAnswer, timeSpent } = body;

        if ((!questionId && !pyqId && !mockQuestionId && !dppQuestionId) || isCorrect === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const buildAttempt = () =>
            prisma.attempt.create({
                data: {
                    question_id: questionId || null,
                    pyq_id: pyqId || null,
                    mock_question_id: mockQuestionId || null,
                    // DPP practice answers. Note these are the ONLY attempt rows
                    // that intentionally leave question_id and pyq_id null while
                    // still being a real question — the raw queries in
                    // mistakes/review/dashboard must COALESCE this column too.
                    dpp_question_id: dppQuestionId || null,
                    is_correct: isCorrect,
                    user_answer: userAnswer ? String(userAnswer) : null,
                    user_id: userId,
                    time_spent: timeSpent || null,
                },
            });

        let attempt;
        try {
            attempt = await buildAttempt();
        } catch (e: any) {
            // P2003 = Prisma's code for a FK violation (the raw Postgres code
            // "23503" never surfaces here — the query engine normalizes it).
            // User row for this Clerk id is missing; sync it from Clerk, then
            // retry once.
            if (e?.code === "P2003") {
                await syncUser(userId);
                attempt = await buildAttempt();
            } else {
                throw e;
            }
        }

        // Only bust this user's personal caches — topic/pattern structure is static
        // and must NOT be invalidated here (would bust it for all users on every submit).
        //
        // `{ expire: 0 }` expires the tag IMMEDIATELY, so the next read (e.g. a
        // refresh that refetches /api/practice/progress) is a blocking cache miss
        // that recomputes from the DB. The previous `"page"` arg is not a defined
        // cache-life profile and gave stale-while-revalidate semantics, so the first
        // refresh after answering served the OLD count while revalidating in the
        // background — the "reverts on refresh / didn't hit DB" symptom.
        revalidateTag(`dashboard-${userId}`, { expire: 0 });
        revalidateTag(`mistakes-${userId}`, { expire: 0 });

        return NextResponse.json({ success: true, attempt }, { status: 201 });
    } catch (error) {
        console.error("Failed to save attempt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}