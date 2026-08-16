import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/requireAdmin";
import { isUniqueViolation } from "@/lib/dbHttp";

// Admin-only DPP collection. See docs/dpp-implementation-plan.md §2d.
//
// Gating is isAdminRequest() — keyed off the Clerk session EMAIL, never userId,
// because dev and prod Clerk instances issue different userIds for the same
// person and a userId-keyed check silently fails in dev.

export const dynamic = "force-dynamic";

// GET /api/admin/dpp?patternId=… — list DPPs, newest topic activity first.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const patternId = req.nextUrl.searchParams.get("patternId");

  const dpps = await prisma.dpp.findMany({
    where: patternId ? { pattern_id: patternId } : undefined,
    orderBy: [{ updated_at: "desc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      order: true,
      status: true,
      is_public: true,
      created_at: true,
      updated_at: true,
      pattern_id: true,
      _count: { select: { questions: true } },
      pattern: {
        select: { topic_name: true, subject: true, exam_type: true, branch: true },
      },
    },
  });

  return NextResponse.json({
    dpps: dpps.map((d) => ({
      id: d.id,
      name: d.name,
      order: d.order,
      status: d.status,
      isPublic: d.is_public,
      questionCount: d._count.questions,
      patternId: d.pattern_id,
      topicName: d.pattern.topic_name,
      subject: d.pattern.subject,
      examType: d.pattern.exam_type,
      branch: d.pattern.branch,
      createdAt: d.created_at.toISOString(),
      updatedAt: d.updated_at.toISOString(),
    })),
  });
}

// POST /api/admin/dpp — create an EMPTY DPP, to be filled by paste or import.
//
// Creating the container before its questions is the whole reason DPP has its
// own tables: the rejected column-on-GeneratedQuestion design could not
// represent a sheet with nothing in it yet.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patternId = typeof body.patternId === "string" ? body.patternId.trim() : "";
  if (!patternId) return NextResponse.json({ error: "patternId is required" }, { status: 400 });

  const pattern = await prisma.pattern.findUnique({
    where: { id: patternId },
    select: { id: true, topic_name: true },
  });
  if (!pattern) return NextResponse.json({ error: "topic not found" }, { status: 404 });

  // Next free slot in this topic. Sequential read-then-write rather than an
  // upsert loop: $transaction is unavailable on the Neon HTTP adapter, and the
  // @@unique([pattern_id, order]) below is the real guard — a lost race surfaces
  // as a unique violation, which we retry once.
  const last = await prisma.dpp.findFirst({
    where: { pattern_id: patternId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  let order = Number.isFinite(Number(body.order)) && Number(body.order) > 0
    ? Math.floor(Number(body.order))
    : (last?.order ?? 0) + 1;

  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim()
    : `DPP ${order}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const dpp = await prisma.dpp.create({
        data: { pattern_id: patternId, name, order, status: "draft" },
        select: { id: true, name: true, order: true },
      });
      return NextResponse.json({ dpp }, { status: 201 });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      if (body.order !== undefined) {
        // The caller asked for this specific slot and it's taken — say so rather
        // than silently filing the DPP somewhere else.
        return NextResponse.json(
          { error: `position ${order} is already used in this topic` },
          { status: 409 },
        );
      }
      // Auto-assigned slot lost a race; recompute once and retry.
      const again = await prisma.dpp.findFirst({
        where: { pattern_id: patternId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (again?.order ?? 0) + 1;
    }
  }

  return NextResponse.json({ error: "could not allocate a position, try again" }, { status: 409 });
}
