import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { invalidateTestsWithQuestion } from "@/lib/coachingQuestionCache";

// GET single question (full body, for the edit form).
export const GET = withCoachingContext(async (_req, { coachingId }, { params }) => {
  const { id } = await params;
  const question = await prisma.coachingQuestion.findFirst({
    where: { id, coaching_id: coachingId },
  });
  if (!question) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ question });
});

const TYPES = new Set(["mcq", "nat", "subjective"]);
type Option = { label: string; text: string };

// Loose shape of the untrusted JSON body — every field is optional and narrowed
// below. Lets the validator parse permissively without resorting to `any`.
type QuestionInput = {
  question_type?: string;
  question_text?: string;
  max_marks?: number | string;
  options?: unknown;
  correct_answer?: string | number;
  nat_tolerance?: number | string | null;
  solution?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
};

type ValidatedQuestion = {
  question_type: string;
  question_text: string;
  options: Option[];
  correct_answer: string;
  solution: string | null;
  max_marks: number;
  nat_tolerance: number | null;
  subject: string | null;
  topic: string | null;
  difficulty: string | null;
};

// Re-validate on edit (same rules as create).
function validate(body: QuestionInput): { error?: string; data?: ValidatedQuestion } {
  const type = String(body.question_type ?? "mcq");
  if (!TYPES.has(type)) return { error: "invalid question_type" };
  if (!body.question_text?.trim()) return { error: "question_text is required" };

  const maxMarks = Number(body.max_marks ?? 1);
  if (!Number.isFinite(maxMarks) || maxMarks <= 0) return { error: "invalid max_marks" };

  let options: Option[] = [];
  let correct_answer = "";
  let nat_tolerance: number | null = null;

  if (type === "mcq") {
    options = Array.isArray(body.options)
      ? (body.options as Array<{ label?: unknown; text?: unknown }>)
          .map((o) => ({ label: String(o.label).trim(), text: String(o.text ?? "").trim() }))
          .filter((o) => o.text)
      : [];
    if (options.length < 2) return { error: "mcq needs at least 2 options" };
    correct_answer = String(body.correct_answer ?? "").trim();
    if (!options.some((o) => o.label === correct_answer)) {
      return { error: "correct_answer must match one of the option labels" };
    }
  } else if (type === "nat") {
    correct_answer = String(body.correct_answer ?? "").trim();
    if (correct_answer === "" || !Number.isFinite(Number(correct_answer))) {
      return { error: "nat correct_answer must be a number" };
    }
    nat_tolerance = body.nat_tolerance != null ? Number(body.nat_tolerance) : 0;
    if (!Number.isFinite(nat_tolerance) || nat_tolerance < 0) {
      return { error: "invalid nat_tolerance" };
    }
  }

  return {
    data: {
      question_type: type,
      question_text: String(body.question_text).trim(),
      options,
      correct_answer,
      solution: body.solution?.trim() || null,
      max_marks: maxMarks,
      nat_tolerance,
      subject: body.subject?.trim() || null,
      topic: body.topic?.trim() || null,
      difficulty: body.difficulty?.trim() || null,
    },
  };
}

// PATCH — full replace of editable fields.
export const PATCH = withCoachingContext(async (req, { coachingId }, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const { error, data } = validate(body);
  if (error || !data) {
    return NextResponse.json({ error: error ?? "invalid question" }, { status: 400 });
  }

  // Tenant check then singular update (updateMany is rejected by Neon HTTP).
  const owned = await prisma.coachingQuestion.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.coachingQuestion.update({ where: { id }, data });
  // The answer/text may have changed — bust the cached question set of every
  // live test using it so students aren't graded on the stale cached answer.
  await invalidateTestsWithQuestion(coachingId, id);
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
  return NextResponse.json({ ok: true });
});
