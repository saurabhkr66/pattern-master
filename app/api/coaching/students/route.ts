import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

// One page of students — keeps the initial render and each "load more" small.
export const STUDENTS_PAGE_SIZE = 50;

// GET /api/coaching/students?q=&batch=&limit=&offset=
// List students for the current coaching, with optional name/phone search and
// batch filter. Always scoped to coachingId by the wrapper.
export const GET = withCoachingContext(async (req, { coachingId }) => {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const batch = sp.get("batch")?.trim();
  const limit = Math.min(Math.max(Number(sp.get("limit")) || STUDENTS_PAGE_SIZE, 1), 100);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);

  // One extra row tells us whether a next page exists, without a count() query.
  const rows = await prisma.student.findMany({
    where: {
      coaching_id: coachingId,
      ...(batch ? { batch_id: batch } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q.replace(/\D/g, "") } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      active: true,
      joined_at: true,
      batch_id: true,
      batch: { select: { id: true, name: true } },
    },
    orderBy: { joined_at: "desc" },
    skip: offset,
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  return NextResponse.json({ students: hasMore ? rows.slice(0, limit) : rows, hasMore });
});

// POST /api/coaching/students  { name, phone, batchId? }
// Manual single-student add. (CSV bulk upload intentionally deferred.)
export const POST = withCoachingContext(async (req, { coachingId }) => {
  const { name, phone, batchId } = await req.json();

  if (!name?.trim() || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }
  const normalizedPhone = String(phone).replace(/\D/g, "");
  if (normalizedPhone.length < 7) {
    return NextResponse.json({ error: "invalid phone number" }, { status: 400 });
  }

  // Guard the (coaching_id, phone) unique constraint with a friendly message.
  const existing = await prisma.student.findUnique({
    where: { coaching_id_phone: { coaching_id: coachingId, phone: normalizedPhone } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "a student with this phone already exists" },
      { status: 409 }
    );
  }

  // If a batch is given, verify it belongs to this coaching (no cross-tenant ref).
  if (batchId) {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, coaching_id: coachingId },
      select: { id: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "invalid batch" }, { status: 400 });
    }
  }

  const student = await prisma.student.create({
    data: {
      coaching_id: coachingId,
      name: name.trim(),
      phone: normalizedPhone,
      batch_id: batchId || null,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: student.id });
});
