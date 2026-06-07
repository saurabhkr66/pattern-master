import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

// The exam -> section catalog the Section dropdown + importer read from.
// Visible rows = global seeded (coaching_id null) + this coaching's own.

// GET /api/coaching/exam-sections            → { exams: string[] } (distinct exams)
// GET /api/coaching/exam-sections?exam=SSC   → { sections: [{ id, name, sort_order, default_marks, custom }] }
export const GET = withCoachingContext(async (req, { coachingId }) => {
  const exam = req.nextUrl.searchParams.get("exam")?.trim();

  if (!exam) {
    const rows = await prisma.examSection.findMany({
      where: { OR: [{ coaching_id: null }, { coaching_id: coachingId }] },
      select: { exam: true },
      distinct: ["exam"],
      orderBy: { exam: "asc" },
    });
    return NextResponse.json({ exams: rows.map((r) => r.exam) });
  }

  const rows = await prisma.examSection.findMany({
    where: { exam, OR: [{ coaching_id: null }, { coaching_id: coachingId }] },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sort_order: true, default_marks: true, coaching_id: true },
  });
  // De-dupe by name (a coaching override of a global section wins), preserve order.
  const seen = new Set<string>();
  const sections = rows
    .sort((a, b) => (a.coaching_id ? 1 : 0) - (b.coaching_id ? 1 : 0)) // coaching rows first so overrides win
    .filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((r) => ({
      id: r.id,
      name: r.name,
      sort_order: r.sort_order,
      default_marks: r.default_marks,
      custom: r.coaching_id != null,
    }));
  return NextResponse.json({ sections });
});

// POST /api/coaching/exam-sections  { exam, name, default_marks?, sort_order? }
// Adds a coaching-owned section to an exam (custom exam or extra section).
export const POST = withCoachingContext(async (req, { coachingId }) => {
  const body = await req.json();
  const exam = String(body?.exam ?? "").trim();
  const name = String(body?.name ?? "").trim();
  if (!exam || !name) return NextResponse.json({ error: "exam and name are required" }, { status: 400 });

  const default_marks =
    body.default_marks != null && Number.isFinite(Number(body.default_marks))
      ? Number(body.default_marks)
      : null;
  const sort_order =
    body.sort_order != null && Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 100;

  try {
    const created = await prisma.examSection.create({
      data: { coaching_id: coachingId, exam, name, default_marks, sort_order },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    // Unique([coaching_id, exam, name]) — already exists for this coaching.
    return NextResponse.json({ error: "that section already exists for this exam" }, { status: 409 });
  }
});

// DELETE /api/coaching/exam-sections?id=  — remove a coaching-owned section only.
export const DELETE = withCoachingContext(async (req, { coachingId }) => {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const owned = await prisma.examSection.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.examSection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
