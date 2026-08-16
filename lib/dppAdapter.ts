// Single conversion point between the coaching question shape (what the AI
// extractor emits, and what the paste form posts) and a DppQuestion row.
//
// Both fill paths go through here — PDF import is N calls, paste is one — so
// they can never drift apart.
//
// See docs/dpp-implementation-plan.md §2a.

import { validateCoachingQuestion } from "@/lib/coachingQuestionValidate";
import type { Prisma } from "@prisma/client";

type Option = { label: string; text: string };

/** The subset of a DppQuestion row this module produces. Callers add dpp_id,
 *  order and source. */
export type DppQuestionData = {
  question_text: string;
  options: Prisma.InputJsonValue;
  correct_answer: string;
  explanation: string;
  question_type: string;
  difficulty_level: string | null;
  marks: number;
  images?: Prisma.InputJsonValue;
  question_text_hindi: string | null;
  options_hindi?: Prisma.InputJsonValue;
  explanation_hindi: string | null;
  answer_disputed: boolean | null;
  blind_answer: string | null;
  verify_answer: string | null;
  figure_missing: boolean | null;
};

// A label the extractor (or a human) already glued to the front of the option
// text: "A) 42", "(A) 42", "A. 42", "A - 42". Stripped before we re-prefix, so
// a round-trip can never produce "A. A) 42".
const LEADING_LABEL = /^\s*\(?\s*([A-Za-z0-9]{1,3})\s*[).:\-\]]\s*/;

/**
 * Prefix an option's text with its own label.
 *
 * This is the load-bearing rule of the whole feature. The app derives an
 * option's letter from the FIRST CHARACTER OF THE STRING, never from its index
 * — see AnswerSelector.tsx:45, PracticeButton.tsx:272, PractiseTest.tsx:42,
 * FlashcardDeck.tsx:314, MistakeCard.tsx:31, and the generation prompt at
 * prompts.ts:46 which writes ["A. ...", "B. ...", ...].
 *
 * Store bare text and charAt(0) reads the content instead: option "42 m/s"
 * yields letter "4", matching no answer, so EVERY question renders as wrong in
 * all of those components at once — silently, until a human looks at one.
 *
 * The happy consequence: because the label travels with its text, reordering
 * options cannot invert the correct answer.
 */
function labelled(o: Option): string {
  const label = o.label.trim();
  const text = o.text.trim();
  if (!label) return wrapBareLatex(text); // validator rejects these anyway
  // Drop a label the source already prefixed, but only when it's THIS option's
  // label. A genuine "(2x + 1) is the answer" must survive untouched.
  const m = text.match(LEADING_LABEL);
  const body = m && m[1].toLowerCase() === label.toLowerCase() ? text.slice(m[0].length) : text;
  // Wrap AFTER the label is stripped, so the label never lands inside the maths.
  return `${label}. ${wrapBareLatex(body)}`.trim();
}

/** Options carrying no usable text, or duplicate labels, make the label→text
 *  mapping ambiguous. Callers treat this as a rejection rather than guessing. */
function labelsAreUsable(options: Option[]): boolean {
  const labels = options.map((o) => o.label.trim().toLowerCase()).filter(Boolean);
  return labels.length === options.length && new Set(labels).size === labels.length;
}

/** Trim binary-float noise (9.8 - 0.05 = 9.750000000000002) without forcing a
 *  fixed number of decimals onto a clean value. */
const tidy = (n: number): string => String(Number(n.toFixed(6)));

/**
 * Fold a NAT tolerance into the answer string as a range.
 *
 * The extractor reports `correct_answer: "9.8"` + `nat_tolerance: 0.05` as
 * separate fields, but nothing downstream reads a tolerance column — this app
 * expresses NAT tolerance INSIDE correct_answer, as "lo:hi". PracticeButton
 * parses exactly that at line 281 (/^([\d.-]+)\s*(?::|to)\s*([\d.-]+)$/), and
 * 1194 of 2864 PYQ NAT rows are already stored this way.
 *
 * Drop the tolerance instead and grading falls back to an exact match
 * (Math.abs(diff) < 0.000001), so a student answering 9.81 against 9.8 ± 0.05
 * is marked wrong. Encoding it as a range needs no new column and no renderer
 * change.
 */
function natAnswer(value: string, tolerance: number | null): string {
  const v = Number(value);
  if (!Number.isFinite(v) || !tolerance || tolerance <= 0) return value;
  return `${tidy(v - tolerance)}:${tidy(v + tolerance)}`;
}

/**
 * Check that a candidate answer actually fits a question's STORED options.
 *
 * Used when adjudicating a disputed answer: adopting the verifier's or the blind
 * solver's answer must not be able to write a letter that matches no option. The
 * stored options are flat label-prefixed strings ("A. newton"), so the letter is
 * the first character — the same contract every renderer uses.
 *
 * Returns the normalized answer, or null when it doesn't fit.
 */
export function resolveStoredAnswer(
  candidate: string,
  storedOptions: unknown,
  questionType: string,
): string | null {
  const raw = (candidate ?? "").trim();
  if (!raw) return null;

  if (questionType.toUpperCase() === "NAT") {
    // A plain number, or a "lo:hi" / "lo to hi" tolerance range.
    if (/^[\d.-]+\s*(?::|to)\s*[\d.-]+$/i.test(raw)) return raw;
    return Number.isFinite(Number(raw)) ? raw : null;
  }

  const opts = Array.isArray(storedOptions) ? (storedOptions as string[]) : [];
  const letters = new Set(
    opts.map((o) => String(o).trim().charAt(0).toUpperCase()).filter(Boolean),
  );
  if (letters.size === 0) return null;

  // Accept "A", "a", "A;C", "A, C", "(A)", "Option A" — every shape the pipeline
  // and a human realistically produce.
  const picked = raw
    .split(/[;,]/)
    .map((piece) => {
      const bare = piece.trim().replace(/^(?:option|ans(?:wer)?)\b[:.\s]*/i, "");
      const m = bare.match(/^\(?\s*([A-Za-z0-9])/);
      return m ? m[1].toUpperCase() : "";
    })
    .filter(Boolean);

  if (picked.length === 0 || picked.some((p) => !letters.has(p))) return null;

  const deduped = [...new Set(picked)];
  // Order by option position so two adjudications of the same answer agree.
  const order = opts.map((o) => String(o).trim().charAt(0).toUpperCase());
  deduped.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return deduped.join(";");
}

// A TeX control sequence: \frac, \text, \sqrt, \alpha …
const TEX_COMMAND = /\\[a-zA-Z]+/;
// Prose detector, applied to what remains once control sequences and their
// braces are stripped. A run of 3+ letters is a WORD; anything shorter is a
// variable (F, P, kg, dx). Banning letters outright was too strict — it left
// "F = \frac{k}{l}" and "\frac{8}{7} P" rendering as raw backslashes.
const PROSE_WORD = /[A-Za-z]{3,}/;

/**
 * Wrap bare LaTeX in `$…$` so KaTeX actually renders it.
 *
 * The extractor usually emits delimited maths (`$63\text{km}$`), but not always
 * — a real import produced option text `-1 \text{ to } \frac{1}{2}` with no
 * delimiters at all, which MathRenderer then printed literally, backslashes and
 * braces included. `transformMathContent` converts `\(…\)` and `\[…\]` to `$`,
 * but it will not invent a delimiter that was never there.
 *
 * Wrapping is deliberately conservative: only when the string has a TeX command,
 * has no `$` already, and what remains outside the commands contains no WORD
 * (a run of 3+ letters). Prose like "Take \alpha as the angle" is therefore left
 * alone, because wrapping it whole would render the words mashed together in
 * maths mode — worse than the raw backslash it replaces. Short identifiers
 * survive, so "F = \frac{k}{l}" and "\frac{8}{7} P" are correctly wrapped.
 */
export function wrapBareLatex(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s || s.includes("$")) return s;
  if (!TEX_COMMAND.test(s)) return s;
  // Already delimited another way — transformMathContent handles these.
  if (/\\[([]/.test(s)) return s;

  // Strip control sequences and the braced groups they own, then see what's left.
  const residue = s
    .replace(/\\[a-zA-Z]+\s*(\{[^{}]*\})*/g, " ")
    .replace(/\\[^a-zA-Z]/g, " ");

  return PROSE_WORD.test(residue) ? s : `$${s}$`;
}

const LETTERS = "ABCDEFGH";

/**
 * Coerce a loosely-shaped question into the canonical coaching body.
 *
 * The extractor and the paste form already speak that shape, but hand-pasted
 * JSON rarely does — it comes from a script, another bank, or an LLM, and uses
 * whatever key names and option encoding that source happened to pick. Rejecting
 * it on a key name would make bulk paste useless, so normalize first.
 *
 * Options are accepted in four encodings:
 *   [{label:"A", text:"…"}]        canonical
 *   ["A. …", "B. …"]               flat, label baked in (how the bank stores them)
 *   ["…", "…"]                     flat, bare — labels assigned by position
 *   {A: "…", B: "…"}               object map
 */
export function coerceQuestionInput(raw: Record<string, unknown>): Record<string, unknown> {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };

  let options: unknown = pick("options", "choices", "opts");
  if (options && !Array.isArray(options) && typeof options === "object") {
    // {A: "…", B: "…"} — preserve the declared letters.
    options = Object.entries(options as Record<string, unknown>).map(([label, text]) => ({
      label: String(label).trim(),
      text: String(text ?? "").trim(),
    }));
  } else if (Array.isArray(options)) {
    options = options.map((o, i) => {
      if (o && typeof o === "object") {
        const rec = o as Record<string, unknown>;
        return {
          label: String(rec.label ?? rec.key ?? LETTERS[i] ?? i + 1).trim(),
          text: String(rec.text ?? rec.value ?? rec.option ?? "").trim(),
        };
      }
      const s = String(o ?? "").trim();
      // "A. foo" / "(A) foo" / "A) foo" — take the printed label as authoritative.
      const m = s.match(LEADING_LABEL);
      return m
        ? { label: m[1], text: s.slice(m[0].length) }
        : { label: LETTERS[i] ?? String(i + 1), text: s };
    });
  }

  const answer = pick("correct_answer", "answer", "correct", "correctAnswer", "ans");

  return {
    ...raw,
    question_type: String(pick("question_type", "type", "qtype") ?? "mcq").toLowerCase(),
    question_text: String(pick("question_text", "question", "text", "statement") ?? ""),
    options,
    // An array answer (["A","C"]) is joined by the validator, so pass it through.
    correct_answer: Array.isArray(answer) ? answer : answer === undefined ? "" : String(answer),
    max_marks: Number(pick("max_marks", "marks", "mark", "points") ?? 1),
    solution: pick("solution", "explanation", "sol", "reason") ?? null,
    nat_tolerance: pick("nat_tolerance", "tolerance", "tol"),
    // Review flags travel verbatim — coerceQuestionInput must not drop them, or
    // the editor loses the dispute evidence the verify pass paid to produce.
    answer_disputed: raw.answer_disputed,
    blind_answer: raw.blind_answer,
    verify_answer: raw.verify_answer,
    figure_missing: raw.figure_missing,
    question_text_hindi: pick("question_text_hindi", "question_hindi") ?? null,
    solution_hindi: pick("solution_hindi", "explanation_hindi") ?? null,
  };
}

/**
 * Validate + convert one incoming question into a DppQuestion payload.
 *
 * `input` is the loose coaching body: ParsedQuestion from lib/coachingImport
 * (question_type, question_text, options[{label,text}], correct_answer,
 * max_marks, solution, …), the paste form's object, or hand-pasted JSON in a
 * near-enough shape — coerceQuestionInput reconciles the differences first.
 */
export function adaptToDppQuestion(
  rawInput: Record<string, unknown>,
): { error?: string; data?: DppQuestionData } {
  const input = coerceQuestionInput(rawInput);
  // Validation first: it normalizes a free-form correct_answer ("Option A",
  // "(A)", the full option text) down to a bare label, and returns "" — which
  // it turns into an error — when nothing matches.
  const { error, data } = validateCoachingQuestion(input);
  if (error || !data) return { error: error ?? "invalid question" };

  const type = data.question_type.toLowerCase();
  if (type === "subjective") {
    // No grading path exists for subjective inside a DPP, and DppQuestion has
    // no rubric columns. Reject loudly rather than storing an unanswerable row.
    return { error: "subjective questions are not supported in a DPP" };
  }

  const options = (data.options as unknown as Option[]) ?? [];
  const hasOptions = type === "mcq" || type === "msq";

  if (hasOptions && !labelsAreUsable(options)) {
    return { error: "options must each have a unique, non-empty label" };
  }

  // Hindi options must line up with the English ones by LABEL, not by position
  // — the translation pass can return them in a different order or drop one. On
  // any mismatch the Hindi options are dropped entirely: a misaligned
  // translation silently attaches the wrong text to a letter, which is worse
  // than showing English.
  const hindiRaw = (data.options_hindi as unknown as Option[] | undefined) ?? [];
  let optionsHindi: string[] | null = null;
  if (hasOptions && hindiRaw.length === options.length && labelsAreUsable(hindiRaw)) {
    const byLabel = new Map(hindiRaw.map((o) => [o.label.trim().toLowerCase(), o]));
    const aligned = options.map((o) => byLabel.get(o.label.trim().toLowerCase()));
    if (aligned.every(Boolean)) {
      optionsHindi = (aligned as Option[]).map(labelled);
    }
  }

  return {
    data: {
      question_text: data.question_text,
      options: (hasOptions ? options.map(labelled) : []) as unknown as Prisma.InputJsonValue,
      correct_answer:
        type === "nat" ? natAnswer(data.correct_answer, data.nat_tolerance) : data.correct_answer,
      // explanation is a required column; the validator leaves solution nullable
      // (bulk import stays lenient so a missing solution is flagged, not fatal).
      explanation: data.solution ?? "",
      question_type: type.toUpperCase(),
      difficulty_level: data.difficulty,
      marks: data.max_marks,
      // validateCoachingQuestion drops images — carry them from the raw input.
      ...(Array.isArray(input.images) && input.images.length
        ? { images: input.images as unknown as Prisma.InputJsonValue }
        : {}),
      question_text_hindi: data.question_text_hindi,
      // A nullable Json column must not receive a literal null (Prisma rejects
      // it); omitting the key leaves it unset → DB NULL.
      ...(optionsHindi ? { options_hindi: optionsHindi as unknown as Prisma.InputJsonValue } : {}),
      explanation_hindi: data.solution_hindi,
      // Extractor review flags — absent on a pasted question.
      answer_disputed: typeof input.answer_disputed === "boolean" ? input.answer_disputed : null,
      blind_answer: typeof input.blind_answer === "string" ? input.blind_answer : null,
      verify_answer: typeof input.verify_answer === "string" ? input.verify_answer : null,
      figure_missing: typeof input.figure_missing === "boolean" ? input.figure_missing : null,
    },
  };
}
