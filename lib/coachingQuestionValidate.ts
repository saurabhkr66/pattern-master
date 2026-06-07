// Single source of truth for validating + normalizing a coaching question body.
// Shared by the admin create (POST), edit (PATCH), and the bulk-import commit
// route so every write path enforces identical rules and produces the same
// CoachingQuestion shape.

import type { Prisma } from "@prisma/client";

export type Option = { label: string; text: string };

const TYPES = new Set(["mcq", "nat", "subjective"]);

export type ValidatedQuestion = {
  question_type: string;
  question_text: string;
  // Json columns — typed as Prisma's Json input so the data object drops straight
  // into create()/update() without a call-site cast. (Values are Option[].)
  options: Prisma.InputJsonValue;
  correct_answer: string;
  solution: string | null;
  max_marks: number;
  nat_tolerance: number | null;
  // Organization: grade = exam/class, subject = section (from the ExamSection
  // catalog), set_name = the set/mock the question belongs to, topic = optional tag.
  grade: string | null;
  subject: string | null;
  topic: string | null;
  set_name: string | null;
  difficulty: string | null;
  // Bilingual (null/undefined = no Hindi → render falls back to English).
  question_text_hindi: string | null;
  // Omitted (undefined) when empty — a nullable Json column must not receive a
  // literal JS `null` (Prisma rejects it; undefined leaves it unset → DB NULL).
  options_hindi?: Prisma.InputJsonValue;
  solution_hindi: string | null;
};

function normOptions(raw: unknown): Option[] {
  return Array.isArray(raw)
    ? (raw as Array<{ label?: unknown; text?: unknown }>)
        .map((o) => ({ label: String(o.label ?? "").trim(), text: String(o.text ?? "").trim() }))
        .filter((o) => o.text)
    : [];
}

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

export function validateCoachingQuestion(
  body: Record<string, unknown>
): { error?: string; data?: ValidatedQuestion } {
  const type = String(body?.question_type ?? "mcq").toLowerCase();
  if (!TYPES.has(type)) return { error: "invalid question_type" };
  const questionText = typeof body?.question_text === "string" ? body.question_text.trim() : "";
  if (!questionText) return { error: "question_text is required" };

  const maxMarks = Number(body.max_marks ?? 1);
  if (!Number.isFinite(maxMarks) || maxMarks <= 0) return { error: "invalid max_marks" };

  let options: Option[] = [];
  let correct_answer = "";
  let nat_tolerance: number | null = null;

  if (type === "mcq") {
    options = normOptions(body.options);
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
  // subjective: no options, no correct_answer; solution acts as the model answer.

  // Hindi options only kept for mcq, and only when at least one has text.
  const optionsHi = type === "mcq" ? normOptions(body.options_hindi) : [];

  return {
    data: {
      question_type: type,
      question_text: questionText,
      options: options as unknown as Prisma.InputJsonValue,
      correct_answer,
      solution: str(body.solution),
      max_marks: maxMarks,
      nat_tolerance,
      grade: str(body.grade),
      subject: str(body.subject),
      topic: str(body.topic),
      set_name: str(body.set_name),
      difficulty: str(body.difficulty),
      question_text_hindi: str(body.question_text_hindi),
      ...(optionsHi.length
        ? { options_hindi: optionsHi as unknown as Prisma.InputJsonValue }
        : {}),
      solution_hindi: str(body.solution_hindi),
    },
  };
}
