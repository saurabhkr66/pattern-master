import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

async function queryProgress(userId: string, exam: string, branch: string) {
  const branchClause = branch
    ? Prisma.sql`AND p.branch = ${branch}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ pid: string; solved: bigint }[]>(
    Prisma.sql`
      SELECT q.pattern_id::text AS pid,
             COUNT(DISTINCT a.question_id)::bigint AS solved
      FROM "Attempt" a
      JOIN "GeneratedQuestion" q ON q.id = a.question_id
      JOIN "Pattern" p ON p.id = q.pattern_id
      WHERE a.user_id = ${userId}
        AND a.is_correct = true
        AND p.exam_type = ${exam}
        ${branchClause}
      GROUP BY q.pattern_id

      UNION ALL

      SELECT pyq.pattern_id::text AS pid,
             COUNT(DISTINCT a.pyq_id)::bigint AS solved
      FROM "Attempt" a
      JOIN "PYQ" pyq ON pyq.id = a.pyq_id
      JOIN "Pattern" p ON p.id = pyq.pattern_id
      WHERE a.user_id = ${userId}
        AND a.is_correct = true
        AND p.exam_type = ${exam}
        ${branchClause}
      GROUP BY pyq.pattern_id
    `
  );

  const progress: Record<string, number> = {};
  for (const r of rows) {
    progress[r.pid] = (progress[r.pid] ?? 0) + Number(r.solved);
  }
  return progress;
}

/**
 * Returns all solved counts for the user across an entire exam/branch.
 * Keyed on exam+branch (not per-subject IDs) so the client can cache it
 * once and reuse it across all subject tab switches.
 *
 * Query params: exam, branch
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    // Flag the unauthenticated case explicitly. An empty `progress` map is
    // indistinguishable from "solved nothing", and the client persists the map
    // to localStorage for 6 h — so a single session-less request (Clerk not yet
    // resolved) used to pin every topic at 0/N until the TTL expired.
    if (!userId) {
      return NextResponse.json(
        { progress: {}, unauthenticated: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const { searchParams } = new URL(request.url);
    const exam = searchParams.get("exam") || "GATE";
    const branch = searchParams.get("branch") || "";

    const getCached = unstable_cache(
      () => queryProgress(userId, exam, branch),
      [`practice-progress-${userId}-${exam}-${branch || "all"}`],
      // 300s TTL safety net — see dashboard/_lib/queries.ts: `revalidate: false`
      // froze stale-empty entries forever when no new attempt followed.
      { revalidate: 300, tags: [`dashboard-${userId}`] }
    );

    const progress = await getCached();
    return NextResponse.json({ progress }, { headers: { "Cache-Control": "private, max-age=3600, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("[GET /api/practice/progress]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
