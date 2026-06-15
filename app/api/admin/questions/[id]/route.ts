import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCoachingActor } from "@/lib/coachingAuth";
import { validateCoachingQuestion } from "@/lib/coachingQuestionValidate";
import { invalidateTestsWithQuestion } from "@/lib/coachingQuestionCache";
import { invalidateCoachingTaxonomy } from "@/lib/coachingTaxonomy";

// Super-admin question correction endpoint. Unlike /api/coaching/questions/[id]
// (tenant-scoped to the signed-in coaching admin), this keys off the QUESTION's
// own coaching_id, so a super admin can fix ANY coaching's question — including
// orphaned ones (coaching_id = null, from a deleted coaching).
async function requireSuperAdmin() {
  const actor = await getCoachingActor();
  return actor?.isSuperAdmin ? actor : null;
}

const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403 });
const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });

// GET full question body (for the review editor).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSuperAdmin())) return forbidden();
  const { id } = await params;
  const question = await prisma.coachingQuestion.findUnique({ where: { id } });
  if (!question) return notFound();
  return NextResponse.json({ question });
}

// PATCH — full replace of editable fields via the shared validator (identical
// rules to create/edit). coaching_id is read from the row, never the actor.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSuperAdmin())) return forbidden();
  const { id } = await params;
  const existing = await prisma.coachingQuestion.findUnique({
    where: { id },
    select: { coaching_id: true },
  });
  if (!existing) return notFound();

  const body = await req.json();
  const { error, data } = validateCoachingQuestion(body);
  if (error || !data) {
    return NextResponse.json({ error: error ?? "invalid question" }, { status: 400 });
  }

  await prisma.coachingQuestion.update({ where: { id }, data });
  // The answer/text may have changed — bust the cached question set of every live
  // test using it (skip for orphaned questions: no coaching, no live tests).
  if (existing.coaching_id) {
    await invalidateTestsWithQuestion(existing.coaching_id, id);
    invalidateCoachingTaxonomy(existing.coaching_id);
  }
  return NextResponse.json({ ok: true });
}

// DELETE — hard delete (the resolver skips ids no longer present).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSuperAdmin())) return forbidden();
  const { id } = await params;
  const existing = await prisma.coachingQuestion.findUnique({
    where: { id },
    select: { coaching_id: true },
  });
  if (!existing) return notFound();

  await prisma.coachingQuestion.delete({ where: { id } });
  if (existing.coaching_id) {
    await invalidateTestsWithQuestion(existing.coaching_id, id);
    invalidateCoachingTaxonomy(existing.coaching_id);
  }
  return NextResponse.json({ ok: true });
}
