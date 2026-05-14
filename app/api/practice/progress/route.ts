import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

async function queryProgress(userId: string, exam: string, branch: string) {
  const branchClause = branch
    ? Prisma.sql`AND p.branch = ${branch}`
    : Prisma.empty;
  const spBranchClause = branch
    ? Prisma.sql`AND sub.branch = ${branch}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ pid: string; solved: bigint; is_subject: boolean }[]>(
    Prisma.sql`
      SELECT q.pattern_id::text AS pid,
             COUNT(DISTINCT a.question_id)::bigint AS solved,
             false::boolean AS is_subject
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
             COUNT(DISTINCT a.pyq_id)::bigint AS solved,
             false::boolean AS is_subject
      FROM "Attempt" a
      JOIN "PYQ" pyq ON pyq.id = a.pyq_id
      JOIN "Pattern" p ON p.id = pyq.pattern_id
      WHERE a.user_id = ${userId}
        AND a.is_correct = true
        AND p.exam_type = ${exam}
        ${branchClause}
      GROUP BY pyq.pattern_id

      UNION ALL

      SELECT sp.subject_pattern_id::text AS pid,
             COUNT(DISTINCT a.subject_pyq_id)::bigint AS solved,
             true::boolean AS is_subject
      FROM "Attempt" a
      JOIN "SubjectPYQ" sp ON sp.id = a.subject_pyq_id
      JOIN "SubjectPattern" sub ON sub.id = sp.subject_pattern_id
      WHERE a.user_id = ${userId}
        AND a.is_correct = true
        ${spBranchClause}
      GROUP BY sp.subject_pattern_id
    `
  );

  const progress: Record<string, number> = {};
  for (const r of rows) {
    const key = r.is_subject ? `subject-${r.pid}` : r.pid;
    progress[key] = (progress[key] ?? 0) + Number(r.solved);
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
    if (!userId) return NextResponse.json({ progress: {} });

    const { searchParams } = new URL(request.url);
    const exam = searchParams.get("exam") || "GATE";
    const branch = searchParams.get("branch") || "";

    const getCached = unstable_cache(
      () => queryProgress(userId, exam, branch),
      [`practice-progress-${userId}-${exam}-${branch || "all"}`],
      { revalidate: 30, tags: [`dashboard-${userId}`] }
    );

    const progress = await getCached();
    return NextResponse.json({ progress }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (err) {
    console.error("[GET /api/practice/progress]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
