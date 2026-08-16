import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/requireAdmin";
import { adaptToDppQuestion } from "@/lib/dppAdapter";

// Questions inside one DPP: paste (one or many), reorder, clear all.
// See docs/dpp-implementation-plan.md §2a/§2d.

export const dynamic = "force-dynamic";

async function loadDpp(id: string) {
  return prisma.dpp.findUnique({ where: { id }, select: { id: true } });
}

/** Highest `order` currently used in this DPP, or 0 when it's empty. */
async function maxOrder(dppId: string): Promise<number> {
  const last = await prisma.dppQuestion.findFirst({
    where: { dpp_id: dppId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return last?.order ?? 0;
}

// POST /api/admin/dpp/[id]/questions — APPEND one or more questions.
//
// Body is either a single coaching-shaped question, or { questions: [...] }.
// Both the paste form (N=1) and the PDF import commit (N=18) come through here,
// so the two paths cannot drift apart.
//
// Appending is deliberate: an import NEVER deletes existing questions. One wrong
// click on the wrong DPP would otherwise destroy reviewed work with no undo,
// whereas an accidental append is visible and individually deletable. The
// "corrected PDF" case is served by DELETE below.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!(await loadDpp(id))) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const incoming: Record<string, unknown>[] = Array.isArray(body.questions)
    ? body.questions
    : [body];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "no questions supplied" }, { status: 400 });
  }

  // Adapt everything BEFORE writing anything. $transaction is unavailable on the
  // Neon HTTP adapter, so a mid-run validation failure would otherwise leave a
  // half-inserted batch behind. Validating up front makes the write all-or-none
  // in practice.
  //
  // Collect EVERY failure rather than stopping at the first: a bulk JSON paste
  // of 20 questions with three bad rows should surface all three, not force
  // three round-trips to discover them one at a time.
  const adapted = [];
  const problems: { index: number; error: string }[] = [];
  for (let i = 0; i < incoming.length; i++) {
    const { error, data } = adaptToDppQuestion(incoming[i]);
    if (error || !data) problems.push({ index: i, error: error ?? "invalid" });
    else adapted.push(data);
  }
  if (problems.length) {
    return NextResponse.json(
      {
        error:
          problems.length === 1
            ? `question ${problems[0].index + 1}: ${problems[0].error}`
            : `${problems.length} of ${incoming.length} questions are invalid — nothing was saved`,
        problems,
      },
      { status: 400 },
    );
  }

  const start = await maxOrder(id);
  const source = typeof body.source === "string" ? body.source : "paste";

  // Sequential, not Promise.all: `order` is assigned from a counter here, and
  // concurrent inserts would still be correct but harder to reason about when a
  // row fails partway. Batches are <= 25, so the round-trips are cheap.
  const created = [];
  for (let i = 0; i < adapted.length; i++) {
    const row = await prisma.dppQuestion.create({
      data: { ...adapted[i], dpp_id: id, order: start + i + 1, source },
      select: { id: true, order: true },
    });
    created.push(row);
  }

  // Touch the parent so the admin list's "last updated" reflects the append.
  await prisma.dpp.update({ where: { id }, data: { updated_at: new Date() } });
  // Question set changed → drop the cached answer-free paper (lib/dppPaper).
  revalidateTag(`dpp-${id}`, "max");

  return NextResponse.json({ created: created.length, questions: created }, { status: 201 });
}

// PATCH /api/admin/dpp/[id]/questions — reorder, given the full id list.
//
// There is deliberately NO @@unique([dpp_id, order]): without transactions, a
// renumber would transiently collide with itself and fail. Order is admin-facing
// presentation, not an integrity constraint.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!(await loadDpp(id))) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const orderedIds: unknown = body?.orderedIds;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds must be a non-empty array" }, { status: 400 });
  }

  // Every id must belong to THIS dpp, and the list must be complete — a partial
  // reorder would leave gaps or duplicate positions.
  const existing = await prisma.dppQuestion.findMany({
    where: { dpp_id: id },
    select: { id: true },
  });
  const known = new Set(existing.map((q) => q.id));
  const given = new Set(orderedIds.map(String));
  if (given.size !== orderedIds.length) {
    return NextResponse.json({ error: "orderedIds contains duplicates" }, { status: 400 });
  }
  if (given.size !== known.size || [...given].some((qid) => !known.has(qid))) {
    return NextResponse.json(
      { error: "orderedIds must list exactly the questions in this DPP" },
      { status: 400 },
    );
  }

  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.dppQuestion.update({
      where: { id: String(orderedIds[i]) },
      data: { order: i + 1 },
    });
  }
  await prisma.dpp.update({ where: { id }, data: { updated_at: new Date() } });
  // Question set changed → drop the cached answer-free paper (lib/dppPaper).
  revalidateTag(`dpp-${id}`, "max");

  return NextResponse.json({ ok: true, reordered: orderedIds.length });
}

// DELETE /api/admin/dpp/[id]/questions — clear every question, keep the DPP.
// The explicit counterpart to append-only import.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!(await loadDpp(id))) return NextResponse.json({ error: "not found" }, { status: 404 });

  // deleteMany is a single DELETE statement — no transaction, so it is fine on
  // the Neon HTTP adapter (unlike updateMany/createMany).
  const { count } = await prisma.dppQuestion.deleteMany({ where: { dpp_id: id } });
  await prisma.dpp.update({ where: { id }, data: { updated_at: new Date() } });
  // Question set changed → drop the cached answer-free paper (lib/dppPaper).
  revalidateTag(`dpp-${id}`, "max");

  return NextResponse.json({ ok: true, deleted: count });
}
