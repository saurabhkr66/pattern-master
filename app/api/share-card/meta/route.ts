// app/api/share-card/meta/route.ts
// Returns the dominant exam label for a user (used by the share button).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ examLabel: "GATE CSE" });
  }

  const rows = await prisma.$queryRaw<{ exam_type: string; branch: string; cnt: bigint }[]>`
    SELECT
      COALESCE(pat.exam_type, pyq_pat.exam_type, sp.exam_type, 'GATE') AS exam_type,
      COALESCE(pat.branch,    pyq_pat.branch,    sp.branch,    'CSE')  AS branch,
      COUNT(*)::bigint AS cnt
    FROM "Attempt" a
    LEFT JOIN "GeneratedQuestion" gq      ON gq.id  = a.question_id
    LEFT JOIN "Pattern"           pat     ON pat.id = gq.pattern_id
    LEFT JOIN "PYQ"               pyq     ON pyq.id = a.pyq_id
    LEFT JOIN "Pattern"           pyq_pat ON pyq_pat.id = pyq.pattern_id
    LEFT JOIN "SubjectPYQ"        spyq    ON spyq.id = a.subject_pyq_id
    LEFT JOIN "SubjectPattern"    sp      ON sp.id  = spyq.subject_pattern_id
    WHERE a.user_id = ${userId}
    GROUP BY 1, 2
    ORDER BY cnt DESC
    LIMIT 1
  `;

  const examLabel =
    rows.length > 0
      ? rows[0].branch
        ? `${rows[0].exam_type} ${rows[0].branch}`
        : rows[0].exam_type
      : "GATE CSE";

  return NextResponse.json({ examLabel });
}
