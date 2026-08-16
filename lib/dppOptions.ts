// Option normalisation shared by the DPP paper builder and the DPP grader.
//
// Deliberately NOT "server-only": these are pure functions with no DB or network
// access, and they are the single place where a bug silently mis-grades every
// question — so they must be unit-testable in isolation. lib/dppPaper.ts (which
// IS server-only) re-exports them.
//
// ⚠️ The hazard this file exists for:
//
// The app has two incompatible conventions for an option's letter:
//   • AnswerSelector / PracticeButton / FlashcardDeck / MistakeCard read
//     `option.trim().charAt(0)` — the label lives INSIDE the string.
//   • TestEngine / QuestionPane use the ARRAY INDEX (QuestionPane.tsx:174) and
//     strip the prefix for display (:199).
//
// DppQuestion stores for the first convention and grades against a LABEL, while
// lib/dppAdapter deliberately preserves input order (its tests assert that). So
// feeding stored options straight into TestEngine mis-grades the moment stored
// order differs from label order: options ["B. Control Unit", "A. ALU"] with
// correct_answer "A" renders badge A = "Control Unit"; the student picks ALU,
// sends "B", and is marked wrong. Silently.

/** Letters the engine assigns by position. Mirrors `optionLetters` in
 *  components/test/testEngineTypes.ts. */
export const ENGINE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** A label the source glued to the front of the option text: "A) 42", "(A) 42",
 *  "A. 42", "A - 42", "A: 42". */
const LEADING_LABEL = /^\s*\(?\s*([A-Za-z0-9]{1,3})\s*[).:\-\]]\s*/;

/**
 * Normalise a stored `DppQuestion.options` array for TestEngine.
 *
 * Sorting by label makes index and label agree, which is what the engine
 * assumes. Returning `labels` lets the grader map the engine's index-derived
 * letter back to the real stored label, so the two can never drift — the paper
 * builder and the grader call this same function.
 *
 * The emitted prefix is renormalised to `A.`/`B.`/`C.` so QuestionPane's
 * `^[A-E]\.` display strip also works for numeric ("1.") and F+ labels, which it
 * would otherwise leave visible as text duplicated beside the badge.
 */
export function orderedOptions(raw: unknown): { options: string[]; labels: string[] } {
  const arr = Array.isArray(raw) ? raw : [];
  if (arr.length === 0) return { options: [], labels: [] };

  const parsed = arr.map((o, i) => {
    const s = String(o ?? "").trim();
    const m = s.match(LEADING_LABEL);
    // No parseable prefix → fall back to position, the best available guess and
    // what the engine would have assumed anyway.
    const label = (m?.[1] ?? ENGINE_LETTERS[i] ?? String(i + 1)).toUpperCase();
    const text = m ? s.slice(m[0].length) : s;
    return { label, text, i };
  });

  // Stable sort by label. `numeric: true` keeps "2" before "10" for numerically
  // labelled sets; the index tiebreak preserves input order for duplicate labels
  // rather than shuffling them arbitrarily.
  const sorted = [...parsed].sort(
    (a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }) || a.i - b.i,
  );

  return {
    labels: sorted.map((p) => p.label),
    options: sorted.map((p, i) => `${ENGINE_LETTERS[i] ?? String(i + 1)}. ${p.text}`),
  };
}

/**
 * Reorder stored options into label order for DISPLAY, WITHOUT rewriting them.
 *
 * This is the PracticeButton-family counterpart to `orderedOptions`, and the
 * difference is the whole point:
 *   • orderedOptions RE-PREFIXES by position, because TestEngine derives the
 *     letter from the array index — the string's own label is thrown away.
 *   • this one only permutes the array, because AnswerSelector reads
 *     `option.trim().charAt(0)`. The label travels inside the string, so moving
 *     a string cannot separate it from its letter, and grading is unaffected.
 *
 * So it is purely cosmetic: stored order ["B. Control Unit", "A. ALU"] already
 * grades correctly in that family, it just renders B above A, which reads as a
 * bug to a student. Re-prefixing here instead would be the actual bug — it would
 * relabel "A. ALU" as "B." and invert the answer.
 */
export function sortStoredOptions(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw.map((o) => String(o ?? "")) : [];
  return arr
    .map((s, i) => ({ s, i, label: (s.trim().match(LEADING_LABEL)?.[1] ?? "").toUpperCase() }))
    .sort((a, b) => {
      // Unlabelled entries keep their position rather than sorting to one end —
      // there is no letter to order them by, and inventing one would be a guess.
      if (!a.label || !b.label) return a.i - b.i;
      return a.label.localeCompare(b.label, undefined, { numeric: true }) || a.i - b.i;
    })
    .map((p) => p.s);
}

/**
 * Map the engine's index-derived letter back to the question's real stored
 * label. Returns null when the letter falls outside the option range.
 *
 * The grader MUST go through this rather than comparing the engine's letter to
 * `correct_answer` directly.
 */
export function engineLetterToLabel(letter: string, labels: string[]): string | null {
  const idx = ENGINE_LETTERS.indexOf(letter.trim().toUpperCase());
  if (idx < 0 || idx >= labels.length) return null;
  return labels[idx];
}

/**
 * Translate a whole engine answer — an MCQ letter, an MSQ letter list, or a NAT
 * value — into the label form stored in `correct_answer`. NAT passes through.
 *
 * Unmappable letters are dropped rather than guessed: a partially-understood
 * multi-answer is worse than a short one, and inventing a label could
 * accidentally match.
 */
export function engineAnswerToStored(
  userAnswer: string | null | undefined,
  questionType: string,
  labels: string[],
): string {
  const raw = (userAnswer ?? "").trim();
  if (!raw) return "";
  if (questionType === "NAT") return raw;

  return raw
    .split(/[;,]/)
    .map((piece) => engineLetterToLabel(piece, labels))
    .filter((l): l is string => Boolean(l))
    .join(";");
}

/** 2 minutes per question, capped at an hour — matches `SECS_PER_QUESTION` in
 *  lib/examConfigs.ts. Frozen into the run at start so display and grading agree
 *  even if this helper changes later. */
export function dppDurationSecs(questionCount: number): number {
  return Math.min(Math.max(questionCount, 1) * 120, 3600);
}
