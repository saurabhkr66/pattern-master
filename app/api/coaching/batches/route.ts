import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

// GET /api/coaching/batches — list batches with student counts.
export const GET = withCoachingContext(async (_req, { coachingId }) => {
  const batches = await prisma.batch.findMany({
    where: { coaching_id: coachingId },
    select: {
      id: true,
      name: true,
      _count: { select: { students: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ batches });
});

// POST /api/coaching/batches  { name }
export const POST = withCoachingContext(async (req, { coachingId }) => {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const batch = await prisma.batch.create({
      data: { coaching_id: coachingId, name: name.trim() },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: batch.id });
  } catch {
    // (coaching_id, name) unique constraint.
    return NextResponse.json({ error: "a batch with this name already exists" }, { status: 409 });
  }
});
