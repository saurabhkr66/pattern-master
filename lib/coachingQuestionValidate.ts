// Single source of truth for validating + normalizing a coaching question body.
// Shared by the admin create (POST), edit (PATCH), and the bulk-import commit
// route so every write path enforces identical rules and produces the same
// CoachingQuestion shape.

import type { Prisma } from "@prisma/client";

export type Option = { label: string; text: string };

const TYPES = new Set(["mcq", "msq", "nat", "subjective"]);

/** Types that carry answer choices — options + label-based correct answers. */
const OPTION_TYPES = new Set(["mcq", "msq"]);

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

/**
 * Map a free-form MCQ answer to one of the option labels. AI import (and humans)
 * may return "Option A", "(A)", "A.", "a", or the full option *text* instead of
 * the bare label "A" — normalize all of those to the matching label so a correct
 * answer isn't silently rejected. Returns "" if nothing matches.
 */
function normalizeMcqAnswer(raw: string, options: Option[]): string {
  const s = raw.trim();
  if (!s) return "";
  // Exact label, then case-insensitive label.
  const exact = options.find((o) => o.label === s);
  if (exact) return exact.label;
  const ci = options.find((o) => o.label.toLowerCase() === s.toLowerCase());
  if (ci) return ci.label;
  // Full option text (e.g. Gemini returned the answer string, not the letter).
  const byText = options.find((o) => o.text.toLowerCase() === s.toLowerCase());
  if (byText) return byText.label;
  // Leading letter inside decoration: "A)", "A.", "(A)", "Option A", "Ans: A".
  // The word prefix is stripped FIRST: the pattern below only fires when the
  // token is followed by punctuation, so an undecorated "Option A" / "Ans: A"
  // would otherwise fall through and be rejected. Matching above still runs on
  // the original string, so an option genuinely labelled "Answer" is unaffected.
  const bare = s.replace(/^(?:option|ans(?:wer)?)\b[:.\s]*/i, "").trim();
  const m = bare.match(/(?:option|ans(?:wer)?[:.\s]*)?\(?\s*([A-Za-z0-9]+)\s*[).:\-]/i);
  const lead = m?.[1] ?? (/^[A-Za-z0-9]+$/.test(bare) ? bare : "");
  const byLead = lead && options.find((o) => o.label.toLowerCase() === lead.toLowerCase());
  return byLead ? byLead.label : "";
}

// Connectives a human-written multi-answer wraps its labels in ("Both A and C",
// "A and C only"). Dropped before resolution so they aren't mistaken for labels.
const MSQ_NOISE = /^(and|or|both|only|all|of|the|these|option|options|ans|answer|answers)$/i;

/**
 * Map a free-form MSQ answer to the canonical ";"-joined label list the engine
 * stores (see scoreQuestion in lib/resolveQuestions). Accepts every shape a paper,
 * an AI extraction, or a pasted JSON file realistically produces:
 *   "A;C" · "A,C" · "A, C" · "AC" · "(A) (C)" · ["A","C"] (arrives as "A,C")
 * Each piece goes through normalizeMcqAnswer, so option TEXT and decorated labels
 * resolve too. Output is deduped and ordered by option order so two imports of the
 * same answer never disagree on string form. Returns "" if any piece is unresolvable
 * — a partially-understood multi-answer is worse than a rejected row.
 */
function normalizeMsqAnswer(raw: string, options: Option[]): string {
  const s = raw.trim();
  if (!s) return "";

  // Whole-string match first: an option's own label or text may legitimately
  // contain a separator ("A, B and C only" as a single choice on some papers).
  const whole = normalizeMcqAnswer(s, options);
  const separated = s
    .split(/[;,/|]+|\s+/)
    .map((p) => p.trim())
    .filter((p) => p && !MSQ_NOISE.test(p));
  if (whole && separated.length === 1) return whole;

  let pieces = separated;
  // Bare concatenation ("ACD") — only expand when EVERY character is a real
  // single-char label, so a text answer or a multi-char label isn't shredded.
  if (
    pieces.length === 1 &&
    pieces[0].length > 1 &&
    !normalizeMcqAnswer(pieces[0], options) &&
    [...pieces[0]].every((ch) => options.some((o) => o.label.toLowerCase() === ch.toLowerCase()))
  ) {
    pieces = [...pieces[0]];
  }

  const labels: string[] = [];
  for (const piece of pieces) {
    const label = normalizeMcqAnswer(piece, options);
    if (!label) return ""; // unresolvable piece → reject the whole row
    if (!labels.includes(label)) labels.push(label);
  }
  const order = new Map(options.map((o, i) => [o.label, i]));
  labels.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  return labels.join(";");
}

export function validateCoachingQuestion(
  body: Record<string, unknown>,
  // Direct create/edit pass requireSubjectiveSolution=true so a subjective
  // question can't be saved without a model answer (it's needed both to grade and
  // to precompute the rubric — see lib/coachingRubric). The bulk import leaves it
  // off and stays lenient: missing solutions are flagged for review instead.
  opts?: { requireSubjectiveSolution?: boolean }
): { error?: string; data?: ValidatedQuestion } {
  const type = String(body?.question_type ?? "mcq").toLowerCase();
  if (!TYPES.has(type)) return { error: "invalid question_type" };
  const questionText = typeof body?.question_text === "string" ? body.question_text.trim() : "";
  if (!questionText) return { error: "question_text is required" };

  const solution = str(body.solution);
  if (type === "subjective" && opts?.requireSubjectiveSolution && !solution) {
    return { error: "subjective questions require a model answer (solution)" };
  }

  const maxMarks = Number(body.max_marks ?? 1);
  if (!Number.isFinite(maxMarks) || maxMarks <= 0) return { error: "invalid max_marks" };

  let options: Option[] = [];
  let correct_answer = "";
  let nat_tolerance: number | null = null;

  if (OPTION_TYPES.has(type)) {
    options = normOptions(body.options);
    if (options.length < 2) return { error: `${type} needs at least 2 options` };
    // An answer list may arrive as a real array (["A","C"]) or as a string in any
    // of the shapes normalizeMsqAnswer accepts; join arrays explicitly rather than
    // leaning on String() coercion so an element containing a comma survives.
    const rawAnswer = Array.isArray(body.correct_answer)
      ? body.correct_answer.map((v) => String(v).trim()).filter(Boolean).join(";")
      : String(body.correct_answer ?? "");
    correct_answer =
      type === "msq"
        ? normalizeMsqAnswer(rawAnswer, options)
        : normalizeMcqAnswer(rawAnswer, options);
    if (!correct_answer) {
      return { error: `correct_answer "${rawAnswer}" matches no option label` };
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

  // Hindi options only kept for the option-bearing types, and only when at least
  // one has text.
  const optionsHi = OPTION_TYPES.has(type) ? normOptions(body.options_hindi) : [];

  return {
    data: {
      question_type: type,
      question_text: questionText,
      options: options as unknown as Prisma.InputJsonValue,
      correct_answer,
      solution,
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
