import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/requireAdmin";
import { isUniqueViolation } from "@/lib/dbHttp";

// One DPP: read with its questions, rename/reorder/publish, or delete.
// See docs/dpp-implementation-plan.md §2d.

export const dynamic = "force-dynamic";

const STATUSES = new Set(["draft", "ready"]);

// GET /api/admin/dpp/[id] — the DPP and every question in order.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const dpp = await prisma.dpp.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      order: true,
      status: true,
      is_public: true,
      pattern_id: true,
      created_at: true,
      updated_at: true,
      pattern: {
        select: { topic_name: true, subject: true, exam_type: true, branch: true },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          question_text: true,
          options: true,
          correct_answer: true,
          explanation: true,
          question_type: true,
          difficulty_level: true,
          marks: true,
          images: true,
          question_text_hindi: true,
          options_hindi: true,
          explanation_hindi: true,
          answer_disputed: true,
          blind_answer: true,
          verify_answer: true,
          figure_missing: true,
          reviewed: true,
          source: true,
        },
      },
    },
  });

  if (!dpp) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    dpp: {
      id: dpp.id,
      name: dpp.name,
      order: dpp.order,
      status: dpp.status,
      isPublic: dpp.is_public,
      patternId: dpp.pattern_id,
      topicName: dpp.pattern.topic_name,
      subject: dpp.pattern.subject,
      examType: dpp.pattern.exam_type,
      branch: dpp.pattern.branch,
      createdAt: dpp.created_at.toISOString(),
      updatedAt: dpp.updated_at.toISOString(),
      questions: dpp.questions,
    },
  });
}

// PATCH /api/admin/dpp/[id] — rename, move, flip status, toggle visibility.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }

  if (body.order !== undefined) {
    const order = Number(body.order);
    if (!Number.isInteger(order) || order < 1) {
      return NextResponse.json({ error: "order must be a positive integer" }, { status: 400 });
    }
    data.order = order;
  }

  if (body.status !== undefined) {
    const status = String(body.status);
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "status must be draft or ready" }, { status: 400 });
    }
    data.status = status;
  }

  // RELEASE switch: is_public true + status "ready" is what makes a DPP visible
  // to students (the DPP tab, /dpp, and every run route filter on both).
  if (typeof body.isPublic === "boolean") data.is_public = body.isPublic;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  // Singular update — updateMany is rejected by the Neon HTTP adapter.
  const exists = await prisma.dpp.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    await prisma.dpp.update({ where: { id }, data });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return NextResponse.json(
        { error: `position ${data.order} is already used in this topic` },
        { status: 409 },
      );
    }
    throw e;
  }

  // Releasing/unreleasing changes the student-facing dppCount and the cached
  // paper. The "dpp" tag is deliberately narrower than "patterns" — busting the
  // latter would also drop the public topic pages and the whole question feed.
  if (data.is_public !== undefined || data.status !== undefined || data.name !== undefined) {
    revalidateTag("dpp", "max");
    revalidateTag(`dpp-${id}`, "max");
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/dpp/[id] — delete the DPP and its questions.
//
// DppQuestion.dpp_id is ON DELETE CASCADE, which is safe here in a way it never
// would be on GeneratedQuestion: these rows carry no attempts, bookmarks or
// reports, so nothing else can reference them.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const exists = await prisma.dpp.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.dpp.delete({ where: { id } });
  // A deleted DPP must disappear from the students' DPP tab immediately.
  revalidateTag("dpp", "max");
  revalidateTag(`dpp-${id}`, "max");
  return NextResponse.json({ ok: true });
}
