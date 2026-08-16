import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/requireAdmin";
import { adaptToDppQuestion, resolveStoredAnswer } from "@/lib/dppAdapter";

// Edit or remove one question inside a DPP.
//
// Everything the extractor produced is editable — it is good, not perfect, so
// nothing it writes is final. See docs/dpp-implementation-plan.md §3.

export const dynamic = "force-dynamic";

/** Both handlers must confirm the question belongs to the DPP in the path, not
 *  just that it exists — otherwise /dpp/A/questions/<id-from-B> would edit B. */
async function loadOwned(dppId: string, qid: string) {
  const q = await prisma.dppQuestion.findUnique({
    where: { id: qid },
    select: {
      id: true,
      dpp_id: true,
      order: true,
      options: true,
      question_type: true,
      correct_answer: true,
      blind_answer: true,
      verify_answer: true,
    },
  });
  return q && q.dpp_id === dppId ? q : null;
}

// PATCH /api/admin/dpp/[id]/questions/[qid] — full edit, or just mark reviewed.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, qid } = await params;
  const existing = await loadOwned(id, qid);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  // ── Adjudicate a disputed answer ────────────────────────────────────────────
  // "keep"   the stored answer was right; just clear the flag
  // "verify" adopt the verify pass's answer
  // "blind"  adopt the blind cross-check's answer
  //
  // The adopted answer is re-validated against the question's STORED options, so
  // a garbled verifier reply can never write a letter that matches no option —
  // which would render as "no correct answer" to every student.
  if (typeof body.resolve === "string") {
    const mode = body.resolve;
    if (!["keep", "verify", "blind"].includes(mode)) {
      return NextResponse.json({ error: "resolve must be keep, verify or blind" }, { status: 400 });
    }

    const data: Record<string, unknown> = { answer_disputed: false, reviewed: true };

    if (mode !== "keep") {
      const candidate = mode === "verify" ? existing.verify_answer : existing.blind_answer;
      if (!candidate) {
        return NextResponse.json({ error: `no ${mode} answer recorded` }, { status: 400 });
      }
      const resolved = resolveStoredAnswer(candidate, existing.options, existing.question_type);
      if (!resolved) {
        return NextResponse.json(
          { error: `the ${mode} answer "${candidate}" matches no option — edit the question instead` },
          { status: 400 },
        );
      }
      data.correct_answer = resolved;
    }

    await prisma.dppQuestion.update({ where: { id: qid }, data });
    await prisma.dpp.update({ where: { id }, data: { updated_at: new Date() } });
  // Question set changed → drop the cached answer-free paper (lib/dppPaper).
  revalidateTag(`dpp-${id}`, "max");
    return NextResponse.json({ ok: true, correct_answer: data.correct_answer ?? existing.correct_answer });
  }

  // Flag-only update: let the admin clear a review flag or mark a row vetted
  // without re-sending the whole question.
  const hasContent =
    body.question_text !== undefined ||
    body.options !== undefined ||
    body.correct_answer !== undefined;

  if (!hasContent) {
    const data: Record<string, unknown> = {};
    if (typeof body.reviewed === "boolean") data.reviewed = body.reviewed;
    if (typeof body.answer_disputed === "boolean") data.answer_disputed = body.answer_disputed;
    if (typeof body.figure_missing === "boolean") data.figure_missing = body.figure_missing;
    if (body.order !== undefined) {
      const order = Number(body.order);
      if (!Number.isInteger(order) || order < 1) {
        return NextResponse.json({ error: "order must be a positive integer" }, { status: 400 });
      }
      data.order = order;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }
    await prisma.dppQuestion.update({ where: { id: qid }, data });
    await prisma.dpp.update({ where: { id }, data: { updated_at: new Date() } });
  // Question set changed → drop the cached answer-free paper (lib/dppPaper).
  revalidateTag(`dpp-${id}`, "max");
    return NextResponse.json({ ok: true });
  }

  // Content edit — run the SAME adapter the paste and import paths use, so an
  // edited option can never end up in a different shape than an imported one
  // (in particular, every option must keep its own leading label).
  const { error, data } = adaptToDppQuestion(body);
  if (error || !data) {
    return NextResponse.json({ error: error ?? "invalid question" }, { status: 400 });
  }

  await prisma.dppQuestion.update({
    where: { id: qid },
    data: {
      ...data,
      // The adapter nulls any flag the caller didn't send, and the edit form
      // doesn't send them — so a spread alone would wipe the blind/verify
      // answers just because someone fixed a typo. Those are a historical record
      // of what each model concluded; only re-set them when explicitly supplied.
      blind_answer: body.blind_answer !== undefined ? data.blind_answer : existing.blind_answer,
      verify_answer: body.verify_answer !== undefined ? data.verify_answer : existing.verify_answer,
      // The FLAG is different from the evidence: a human has now looked at and
      // rewritten this question, so the "needs adjudication" state is discharged.
      answer_disputed: false,
      // An explicit edit counts as review unless the caller says otherwise.
      reviewed: typeof body.reviewed === "boolean" ? body.reviewed : true,
    },
  });
  await prisma.dpp.update({ where: { id }, data: { updated_at: new Date() } });
  // Question set changed → drop the cached answer-free paper (lib/dppPaper).
  revalidateTag(`dpp-${id}`, "max");

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/dpp/[id]/questions/[qid] — remove one question.
// Remaining questions are renumbered so `order` stays contiguous 1..N.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, qid } = await params;
  if (!(await loadOwned(id, qid))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.dppQuestion.delete({ where: { id: qid } });

  // Close the gap. updateMany can't do a positional renumber anyway, and it is
  // rejected by the Neon HTTP adapter — so walk the survivors in order.
  const rest = await prisma.dppQuestion.findMany({
    where: { dpp_id: id },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].order !== i + 1) {
      await prisma.dppQuestion.update({ where: { id: rest[i].id }, data: { order: i + 1 } });
    }
  }
  await prisma.dpp.update({ where: { id }, data: { updated_at: new Date() } });
  // Question set changed → drop the cached answer-free paper (lib/dppPaper).
  revalidateTag(`dpp-${id}`, "max");

  return NextResponse.json({ ok: true, remaining: rest.length });
}
