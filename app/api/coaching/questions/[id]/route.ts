import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateTestsWithQuestion } from "@/lib/coachingQuestionCache";
import { invalidateCoachingTaxonomy } from "@/lib/coachingTaxonomy";
import { validateCoachingQuestion } from "@/lib/coachingQuestionValidate";

// GET single question (full body, for the edit form).
export const GET = withCoachingContext(async (_req, { coachingId }, { params }) => {
  const { id } = await params;
  const question = await prisma.coachingQuestion.findFirst({
    where: { id, coaching_id: coachingId },
  });
  if (!question) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ question });
});

// PATCH — full replace of editable fields (same rules as create, shared validator).
export const PATCH = withCoachingContext(async (req, { coachingId, actor }, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const { error, data } = validateCoachingQuestion(body, { requireSubjectiveSolution: true });
  if (error || !data) {
    return NextResponse.json({ error: error ?? "invalid question" }, { status: 400 });
  }

  // Tenant check then singular update (updateMany is rejected by Neon HTTP).
  const owned = await prisma.coachingQuestion.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true, question_type: true },
  });
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Coaching admins MAY edit an existing subjective question — fix a wrong model
  // answer or question text they know to be off. They may NOT *convert* a regular
  // (mcq/nat) question INTO subjective: authoring subjective is super-admin-only
  // (AI import). So block the type change to subjective, not edits in place.
  if (
    data.question_type === "subjective" &&
    owned.question_type !== "subjective" &&
    !actor.isSuperAdmin
  ) {
    return NextResponse.json(
      { error: "subjective questions can only be created by super-admin import" },
      { status: 403 }
    );
  }
  await prisma.coachingQuestion.update({
    where: { id },
    data: {
      ...data,
      // Editing a subjective question can change the question text or model
      // answer, which makes its precomputed rubric stale. Reset rubric_version so
      // the backfill regenerates it; grading falls back to deriving the scheme
      // until then.
      ...(data.question_type === "subjective" ? { rubric_version: 0 } : {}),
    },
  });
  // The answer/text may have changed — bust the cached question set of every
  // live test using it so students aren't graded on the stale cached answer.
  await invalidateTestsWithQuestion(coachingId, id);
  // grade/subject/topic may have moved — refresh the folder tree.
  invalidateCoachingTaxonomy(coachingId);
  return NextResponse.json({ ok: true });
});

// DELETE — hard delete. Questions are referenced by id inside CoachingTest.questions
// (JSON, not an FK), so the resolver simply skips any id that no longer exists.
export const DELETE = withCoachingContext(async (_req, { coachingId }, { params }) => {
  const { id } = await params;
  // Tenant check then singular delete (deleteMany is rejected by Neon HTTP).
  const owned = await prisma.coachingQuestion.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.coachingQuestion.delete({ where: { id } });
  // Drop it from any live test's cached set so the resolver re-resolves (and
  // simply skips the now-missing id) instead of serving the deleted question.
  await invalidateTestsWithQuestion(coachingId, id);
  // One fewer node/count in the folder tree — refresh the cached taxonomy.
  invalidateCoachingTaxonomy(coachingId);
  return NextResponse.json({ ok: true });
});
