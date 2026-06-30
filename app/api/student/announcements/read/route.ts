import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";

// POST /api/student/announcements/read  { ids: string[] }
// Mark the given announcements as read for the current student. Idempotent: an
// already-read announcement is a no-op. Called by the student announcements page
// on view so the dashboard unread badge clears.
export async function POST(req: Request) {
  const student = await getCurrentStudent();
  if (!student) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (student.status !== "approved") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const raw: unknown = body.ids;
  const ids = Array.isArray(raw)
    ? [...new Set(raw.filter((x): x is string => typeof x === "string"))]
    : [];
  if (ids.length === 0) return NextResponse.json({ ok: true, marked: 0 });

  // Only mark announcements that actually belong to this student's coaching and
  // are still live — a forged id can't create a stray read row.
  const valid = await prisma.announcement.findMany({
    where: { id: { in: ids }, coaching_id: student.coaching_id, active: true },
    select: { id: true },
  });

  // Per-row upsert: the Neon HTTP adapter has no $transaction/createMany-skip in
  // one round-trip, so loop. The @@unique([announcement_id, student_id]) makes
  // each upsert idempotent.
  for (const a of valid) {
    await prisma.announcementRead.upsert({
      where: { announcement_id_student_id: { announcement_id: a.id, student_id: student.id } },
      create: { announcement_id: a.id, student_id: student.id },
      update: {},
    });
  }

  return NextResponse.json({ ok: true, marked: valid.length });
}
