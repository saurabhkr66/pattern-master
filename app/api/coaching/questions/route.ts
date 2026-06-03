import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

const TYPES = new Set(["mcq", "nat", "subjective"]);

// Shape stored in CoachingQuestion.options (JSON): [{ label, text }]
type Option = { label: string; text: string };

function validate(body: any): { error?: string; data?: any } {
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
      ? body.options
          .map((o: any) => ({ label: String(o.label).trim(), text: String(o.text ?? "").trim() }))
          .filter((o: Option) => o.text)
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
  // subjective: no options, no correct_answer; solution acts as model answer.

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

// GET /api/coaching/questions?q=&subject=&type=
export const GET = withCoachingContext(async (req, { coachingId }) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const subject = req.nextUrl.searchParams.get("subject")?.trim();
  const type = req.nextUrl.searchParams.get("type")?.trim();

  const questions = await prisma.coachingQuestion.findMany({
    where: {
      coaching_id: coachingId,
      ...(subject ? { subject } : {}),
      ...(type && TYPES.has(type) ? { question_type: type } : {}),
      ...(q ? { question_text: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      question_text: true,
      question_type: true,
      subject: true,
      topic: true,
      difficulty: true,
      max_marks: true,
      correct_answer: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: 500,
  });

  return NextResponse.json({ questions });
});

// POST /api/coaching/questions
export const POST = withCoachingContext(async (req, { coachingId }) => {
  const body = await req.json();
  const { error, data } = validate(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const created = await prisma.coachingQuestion.create({
    data: { coaching_id: coachingId, ...data },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: created.id });
});
