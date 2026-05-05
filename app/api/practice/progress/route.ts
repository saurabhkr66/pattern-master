import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * Lightweight endpoint that returns ONLY the user's solved counts
 * for a set of pattern IDs. Called client-side after the static
 * topic list has already rendered.
 *
 * Query params:
 *   ids=comma,separated,pattern,ids
 *   spIds=comma,separated,subject_pattern,ids  (raw IDs, not "subject-" prefixed)
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ progress: {} });
    }

    const { searchParams } = new URL(request.url);
    const rawIds = searchParams.get("ids") || "";
    const rawSpIds = searchParams.get("spIds") || "";

    const patternIds = rawIds.split(",").map(s => s.trim()).filter(Boolean);
    const spIds = rawSpIds.split(",").map(s => s.trim()).filter(Boolean);

    const progress: Record<string, number> = {};

    const promises: Promise<void>[] = [];

    // Solved counts for topic patterns (GeneratedQuestion + PYQ)
    if (patternIds.length > 0) {
      promises.push(
        Promise.all([
          prisma.$queryRaw<{ pid: string; solved: bigint }[]>`
            SELECT q.pattern_id as pid, COUNT(DISTINCT a.question_id)::bigint as solved
            FROM "Attempt" a
            JOIN "GeneratedQuestion" q ON q.id = a.question_id
            WHERE a.user_id = ${userId} AND a.is_correct = true AND q.pattern_id = ANY(${patternIds})
            GROUP BY q.pattern_id
          `,
          prisma.$queryRaw<{ pid: string; solved: bigint }[]>`
            SELECT p.pattern_id as pid, COUNT(DISTINCT a.pyq_id)::bigint as solved
            FROM "Attempt" a
            JOIN "PYQ" p ON p.id = a.pyq_id
            WHERE a.user_id = ${userId} AND a.is_correct = true AND p.pattern_id = ANY(${patternIds})
            GROUP BY p.pattern_id
          `,
        ]).then(([qSolved, pSolved]) => {
          qSolved.forEach(r => { progress[r.pid] = (progress[r.pid] ?? 0) + Number(r.solved); });
          pSolved.forEach(r => { progress[r.pid] = (progress[r.pid] ?? 0) + Number(r.solved); });
        })
      );
    }

    // Solved counts for subject-level patterns (SubjectPYQ)
    if (spIds.length > 0) {
      promises.push(
        prisma.$queryRaw<{ sp_id: string; solved: bigint }[]>`
          SELECT sp.subject_pattern_id as sp_id, COUNT(DISTINCT a.subject_pyq_id)::bigint as solved
          FROM "Attempt" a
          JOIN "SubjectPYQ" sp ON sp.id = a.subject_pyq_id
          WHERE a.user_id = ${userId}
            AND a.is_correct = true
            AND sp.subject_pattern_id = ANY(${spIds})
          GROUP BY sp.subject_pattern_id
        `.then((rows) => {
          rows.forEach(r => {
            // Key uses "subject-" prefix to match the client-side pattern IDs
            progress[`subject-${r.sp_id}`] = Number(r.solved);
          });
        })
      );
    }

    await Promise.all(promises);

    return NextResponse.json({ progress });
  } catch (err) {
    console.error("[GET /api/practice/progress]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
