import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateStudent, unblockStudent } from "@/lib/studentCache";

// POST /api/coaching/students/approve-all
// Bulk-approve every pending student in the coaching — the class-time path so an
// owner doesn't tap Approve 30 times. One raw UPDATE (Neon HTTP rejects
// updateMany), RETURNING the affected ids so we can refresh each one's cache.
export const POST = withCoachingContext(async (_req, { coachingId }) => {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "Student"
    SET status = 'approved', active = true
    WHERE coaching_id = ${coachingId} AND status = 'pending'
    RETURNING id
  `;

  // Drop each cached record (so the new status is read on the next request) and
  // lift any revocation tombstone, mirroring the single-student approve path.
  await Promise.all(
    rows.flatMap((r) => [invalidateStudent(r.id), unblockStudent(r.id)])
  );

  return NextResponse.json({ ok: true, approved: rows.length });
});
