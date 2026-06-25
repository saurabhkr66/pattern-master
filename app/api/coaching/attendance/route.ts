import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { createEach, isStandardDriver } from "@/lib/dbHttp";
import { getBatchRoster } from "@/lib/coachingAttendanceData";
import { normalizeDateString, dateStringToUTC, parseMarks } from "@/lib/coachingAttendance";

// GET /api/coaching/attendance?batchId=&date=YYYY-MM-DD
// The roll-call roster for a batch on a date: every approved student in the batch
// with any existing mark (default absent). Computation lives in
// lib/coachingAttendanceData (shared with the admin page). Scoped to coachingId.
export const GET = withCoachingContext(async (req, { coachingId }) => {
  const batchId = req.nextUrl.searchParams.get("batchId") ?? "";
  const date = normalizeDateString(req.nextUrl.searchParams.get("date"));

  if (!batchId) {
    return NextResponse.json({ error: "a batch is required" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "a valid date (YYYY-MM-DD) is required" }, { status: 400 });
  }

  // Batch must belong to this coaching (tenant isolation).
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, coaching_id: coachingId },
    select: { id: true },
  });
  if (!batch) {
    return NextResponse.json({ error: "batch not found" }, { status: 404 });
  }

  const roster = await getBatchRoster(coachingId, batchId, date);
  return NextResponse.json(roster);
});

// POST /api/coaching/attendance  { batchId, date, marks: { [studentId]: boolean } }
// Save (or overwrite) a batch's roll-call for a date. Upserts the per-day session
// header then replaces its per-student records. Absences are stored explicitly.
// Neon HTTP has no $transaction/createMany, so this is upsert → deleteMany →
// createEach (each a lone statement) — see lib/dbHttp / project_neon_http memory.
export const POST = withCoachingContext(async (req, { coachingId, actor }) => {
  const body = await req.json().catch(() => ({}));
  const batchId = String(body.batchId ?? "");
  const date = normalizeDateString(body.date);

  if (!batchId) {
    return NextResponse.json({ error: "a batch is required" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "a valid date (YYYY-MM-DD) is required" }, { status: 400 });
  }

  const parsed = parseMarks(body.marks);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Batch must belong to this coaching, and we only accept marks for students who
  // are actually approved+active members of it — drop anything else the client sent.
  const [batch, members] = await Promise.all([
    prisma.batch.findFirst({ where: { id: batchId, coaching_id: coachingId }, select: { id: true } }),
    prisma.student.findMany({
      where: { coaching_id: coachingId, batch_id: batchId, status: "approved", active: true },
      select: { id: true },
    }),
  ]);
  if (!batch) {
    return NextResponse.json({ error: "batch not found" }, { status: 404 });
  }

  const memberIds = new Set(members.map((m) => m.id));
  const marks = parsed.ok.filter((m) => memberIds.has(m.studentId));
  if (marks.length === 0) {
    return NextResponse.json({ error: "no students in this batch to mark" }, { status: 400 });
  }

  const when = dateStringToUTC(date);

  // Upsert the session header (one per batch+date). Explicit find-then-write rather
  // than prisma.upsert so it stays a plain statement under the HTTP adapter.
  const existing = await prisma.attendanceSession.findUnique({
    where: { batch_id_date: { batch_id: batchId, date: when } },
    select: { id: true },
  });

  let sessionId: string;
  if (existing) {
    sessionId = existing.id;
    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { marked_by: actor.adminId ?? null },
    });
  } else {
    const created = await prisma.attendanceSession.create({
      data: { coaching_id: coachingId, batch_id: batchId, date: when, marked_by: actor.adminId ?? null },
      select: { id: true },
    });
    sessionId = created.id;
  }

  // Replace the day's records wholesale so a re-save reflects the current roster.
  const records = marks.map((m) => ({
    coaching_id: coachingId,
    session_id: sessionId,
    student_id: m.studentId,
    present: m.present,
  }));

  if (isStandardDriver) {
    // Standard TCP driver (VPS): wrap delete+insert in one transaction so a crash
    // mid-save can't leave the day half-marked. The HTTP adapter can't do this.
    await prisma.$transaction([
      prisma.attendanceRecord.deleteMany({ where: { session_id: sessionId } }),
      prisma.attendanceRecord.createMany({ data: records }),
    ]);
  } else {
    // Neon HTTP: no interactive transaction / createMany — delete then per-row
    // insert. The narrow window between the two is the documented trade-off.
    await prisma.attendanceRecord.deleteMany({ where: { session_id: sessionId } });
    await createEach(records, (data) => prisma.attendanceRecord.create({ data, select: { id: true } }));
  }

  return NextResponse.json({ ok: true });
});
