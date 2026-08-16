// Unit tests for the DPP question adapter — the one place in the feature where
// a bug corrupts content invisibly. Pure module, no DB / network.
//
// Run:  npx tsx --test lib/dppAdapter.test.ts
//
// The rule under test: every stored option string must START with its own
// label, because six renderers derive the letter via charAt(0) (AnswerSelector,
// PracticeButton, PractiseTest, FlashcardDeck, MistakeCard) rather than from
// the array index. Store bare text and every question renders as wrong.

import { test } from "node:test";
import assert from "node:assert/strict";
import { adaptToDppQuestion, resolveStoredAnswer } from "./dppAdapter";

const opt = (label: string, text: string) => ({ label, text });

const mcq = (over: Record<string, unknown> = {}) => ({
  question_type: "mcq",
  question_text: "What is the SI unit of force?",
  options: [opt("A", "newton"), opt("B", "joule"), opt("C", "watt"), opt("D", "pascal")],
  correct_answer: "A",
  max_marks: 1,
  solution: "Force is measured in newtons.",
  ...over,
});

test("every option is prefixed with its own label", () => {
  const { data, error } = adaptToDppQuestion(mcq());
  assert.equal(error, undefined);
  assert.deepEqual(data!.options, ["A. newton", "B. joule", "C. watt", "D. pascal"]);
  // The charAt(0) contract the renderers depend on.
  for (const o of data!.options as unknown as string[]) {
    assert.match(o, /^[A-D]\./);
  }
});

test("options out of label order keep their labels — the answer cannot invert", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options: [opt("B", "joule"), opt("A", "newton")], correct_answer: "A" }),
  );
  // Array order is preserved, but "newton" still carries "A", so charAt(0)
  // resolves it correctly regardless of position.
  assert.deepEqual(data!.options, ["B. joule", "A. newton"]);
  assert.equal(data!.correct_answer, "A");
  const answerText = (data!.options as unknown as string[]).find((o) => o.charAt(0) === "A");
  assert.equal(answerText, "A. newton");
});

test("an already-prefixed option is not double-labelled", () => {
  for (const raw of ["A) newton", "(A) newton", "A. newton", "A - newton"]) {
    const { data } = adaptToDppQuestion(
      mcq({ options: [opt("A", raw), opt("B", "joule")], correct_answer: "A" }),
    );
    assert.deepEqual((data!.options as unknown as string[])[0], "A. newton", `input: ${raw}`);
  }
});

test("a leading parenthetical that is NOT the label survives", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options: [opt("A", "(2x + 1) metres"), opt("B", "joule")], correct_answer: "A" }),
  );
  assert.equal((data!.options as unknown as string[])[0], "A. (2x + 1) metres");
});

test("numeric labels work the same way", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options: [opt("1", "newton"), opt("2", "joule")], correct_answer: "2" }),
  );
  assert.deepEqual(data!.options, ["1. newton", "2. joule"]);
  assert.equal(data!.correct_answer, "2");
});

test("correct_answer is normalized from free-form input", () => {
  for (const raw of ["A", "a", "(A)", "A.", "Option A", "Ans: A", "newton"]) {
    const { data, error } = adaptToDppQuestion(mcq({ correct_answer: raw }));
    assert.equal(error, undefined, `input: ${raw}`);
    assert.equal(data!.correct_answer, "A", `input: ${raw}`);
  }
});

test("an unresolvable answer is rejected, not stored", () => {
  const { data, error } = adaptToDppQuestion(mcq({ correct_answer: "Z" }));
  assert.equal(data, undefined);
  assert.ok(error);
});

test("question_type is uppercased", () => {
  assert.equal(adaptToDppQuestion(mcq()).data!.question_type, "MCQ");
  assert.equal(
    adaptToDppQuestion({
      question_type: "nat",
      question_text: "Value of g?",
      correct_answer: "9.8",
      max_marks: 2,
      solution: "9.8 m/s^2",
    }).data!.question_type,
    "NAT",
  );
});

test("subjective is rejected outright", () => {
  const { data, error } = adaptToDppQuestion({
    question_type: "subjective",
    question_text: "Derive the expression.",
    solution: "…",
    max_marks: 5,
  });
  assert.equal(data, undefined);
  assert.match(error!, /subjective/i);
});

test("duplicate or empty option labels are rejected", () => {
  assert.ok(adaptToDppQuestion(mcq({ options: [opt("A", "x"), opt("A", "y")] })).error);
  assert.ok(
    adaptToDppQuestion(mcq({ options: [opt("", "x"), opt("B", "y")], correct_answer: "B" })).error,
  );
});

test("solution maps to explanation, and null becomes an empty string", () => {
  assert.equal(adaptToDppQuestion(mcq()).data!.explanation, "Force is measured in newtons.");
  // explanation is a required column — a lenient import must not write null.
  assert.equal(adaptToDppQuestion(mcq({ solution: null })).data!.explanation, "");
});

test("max_marks maps to marks", () => {
  assert.equal(adaptToDppQuestion(mcq({ max_marks: 4 })).data!.marks, 4);
});

test("hindi options are aligned by label, not by position", () => {
  const { data } = adaptToDppQuestion(
    mcq({
      question_text_hindi: "बल का SI मात्रक क्या है?",
      // Deliberately shuffled relative to the English array.
      options_hindi: [opt("B", "जूल"), opt("A", "न्यूटन"), opt("C", "वाट"), opt("D", "पास्कल")],
    }),
  );
  assert.deepEqual(data!.options_hindi, ["A. न्यूटन", "B. जूल", "C. वाट", "D. पास्कल"]);
});

test("mismatched hindi options are dropped, never misaligned", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options_hindi: [opt("A", "न्यूटन"), opt("B", "जूल")] }), // only 2 of 4
  );
  assert.equal(data!.options_hindi, undefined);
});

test("images pass through; absent images omit the key", () => {
  const imgs = [{ index: 0, filename: "q1.png", type: "figure" }];
  assert.deepEqual(adaptToDppQuestion(mcq({ images: imgs })).data!.images, imgs);
  assert.equal(adaptToDppQuestion(mcq()).data!.images, undefined);
});

test("extractor review flags are carried; a pasted question gets nulls", () => {
  const withFlags = adaptToDppQuestion(
    mcq({
      answer_disputed: true,
      blind_answer: "B",
      verify_answer: "C",
      figure_missing: false,
    }),
  ).data!;
  assert.equal(withFlags.answer_disputed, true);
  assert.equal(withFlags.blind_answer, "B");
  // verify_answer is what answer_disputed is RAISED from — dropping it leaves the
  // editor showing "disputed" with nothing to compare against.
  assert.equal(withFlags.verify_answer, "C");
  assert.equal(withFlags.figure_missing, false);

  const pasted = adaptToDppQuestion(mcq()).data!;
  assert.equal(pasted.answer_disputed, null);
  assert.equal(pasted.blind_answer, null);
  assert.equal(pasted.verify_answer, null);
  assert.equal(pasted.figure_missing, null);
});

test("review flags survive the loose-key coercion path", () => {
  // A bulk-pasted question uses alternate key names; the flags must not be lost
  // just because the surrounding keys needed normalizing.
  const { data } = adaptToDppQuestion({
    question: "SI unit of force?",
    options: ["A. newton", "B. joule"],
    answer: "A",
    explanation: "…",
    answer_disputed: true,
    verify_answer: "B",
    blind_answer: "B",
  });
  assert.equal(data!.answer_disputed, true);
  assert.equal(data!.verify_answer, "B");
  assert.equal(data!.blind_answer, "B");
});

// ── Bulk-paste coercion ───────────────────────────────────────────────────────
// Hand-pasted JSON comes from scripts, other banks or an LLM and rarely uses the
// canonical key names or option encoding. These cover the shapes that actually
// turn up; all must land on the same stored row.

test("options as flat label-prefixed strings", () => {
  const { data, error } = adaptToDppQuestion({
    question: "SI unit of force?",
    options: ["A. newton", "B. joule", "C. watt", "D. pascal"],
    answer: "A",
    solution: "newton",
  });
  assert.equal(error, undefined);
  assert.deepEqual(data!.options, ["A. newton", "B. joule", "C. watt", "D. pascal"]);
  assert.equal(data!.correct_answer, "A");
});

test("options as bare strings get labels by position", () => {
  const { data } = adaptToDppQuestion({
    question_text: "SI unit of force?",
    options: ["newton", "joule", "watt", "pascal"],
    correct_answer: "newton", // resolved by option TEXT
    solution: "newton",
  });
  assert.deepEqual(data!.options, ["A. newton", "B. joule", "C. watt", "D. pascal"]);
  assert.equal(data!.correct_answer, "A");
});

test("options as an object map keep their declared letters", () => {
  const { data } = adaptToDppQuestion({
    question_text: "SI unit of force?",
    options: { A: "newton", B: "joule", C: "watt", D: "pascal" },
    correct_answer: "B",
    solution: "…",
  });
  assert.deepEqual(data!.options, ["A. newton", "B. joule", "C. watt", "D. pascal"]);
  assert.equal(data!.correct_answer, "B");
});

test("alternate key names are accepted", () => {
  const { data, error } = adaptToDppQuestion({
    type: "mcq",
    text: "SI unit of force?",
    choices: [{ key: "A", value: "newton" }, { key: "B", value: "joule" }],
    correct: "A",
    explanation: "newton it is",
    marks: 3,
  });
  assert.equal(error, undefined);
  assert.deepEqual(data!.options, ["A. newton", "B. joule"]);
  assert.equal(data!.explanation, "newton it is");
  assert.equal(data!.marks, 3);
});

test("an array answer is accepted for MSQ", () => {
  const { data } = adaptToDppQuestion({
    question_type: "msq",
    question_text: "Which are symmetric ciphers?",
    options: ["A. AES", "B. DES", "C. RSA"],
    correct_answer: ["A", "B"],
    solution: "…",
  });
  assert.equal(data!.correct_answer, "A;B");
});

test("missing question_type defaults to mcq", () => {
  const { data } = adaptToDppQuestion({
    question_text: "SI unit of force?",
    options: ["A. newton", "B. joule"],
    correct_answer: "A",
    solution: "…",
  });
  assert.equal(data!.question_type, "MCQ");
});

const nat = (over: Record<string, unknown> = {}) => ({
  question_type: "nat",
  question_text: "Value of g in m/s^2?",
  correct_answer: "9.8",
  max_marks: 2,
  solution: "9.8",
  ...over,
});

test("NAT tolerance is folded into correct_answer as a range", () => {
  // Nothing downstream reads a tolerance column; PracticeButton:281 parses
  // "lo:hi" out of correct_answer, and 1194 PYQ NAT rows already use it.
  const { data } = adaptToDppQuestion(nat({ nat_tolerance: 0.05 }));
  assert.equal(data!.correct_answer, "9.75:9.85");
});

test("NAT without tolerance stays an exact value", () => {
  assert.equal(adaptToDppQuestion(nat()).data!.correct_answer, "9.8");
  assert.equal(adaptToDppQuestion(nat({ nat_tolerance: 0 })).data!.correct_answer, "9.8");
});

test("NAT range has no binary-float noise", () => {
  // 9.8 - 0.05 is 9.750000000000002 in IEEE754; the stored string must not be.
  const { data } = adaptToDppQuestion(nat({ correct_answer: "0.3", nat_tolerance: 0.1 }));
  assert.equal(data!.correct_answer, "0.2:0.4");
});

test("a NAT range round-trips through PracticeButton's parser", () => {
  const { data } = adaptToDppQuestion(nat({ nat_tolerance: 0.05 }));
  const m = data!.correct_answer.match(/^([\d.-]+)\s*(?::|to)\s*([\d.-]+)$/i);
  assert.ok(m, "must match the range regex at PracticeButton.tsx:281");
  const [lo, hi] = [parseFloat(m![1]), parseFloat(m![2])];
  assert.ok(9.81 >= lo && 9.81 <= hi, "9.81 should be accepted within 9.8 ± 0.05");
  assert.ok(!(9.9 >= lo && 9.9 <= hi), "9.9 should be rejected");
});

test("MSQ answers stay a ';'-joined label list", () => {
  const { data } = adaptToDppQuestion(
    mcq({ question_type: "msq", correct_answer: "A and C" }),
  );
  assert.equal(data!.question_type, "MSQ");
  assert.equal(data!.correct_answer, "A;C");
});

// ── Adjudicating a disputed answer ────────────────────────────────────────────
// Adopting the verifier's or blind solver's answer must never write a letter
// that matches no option — that renders as "no correct answer" to every student.

const STORED = ["A. newton", "B. joule", "C. watt", "D. pascal"];

test("adopting a valid answer normalizes it to a bare label", () => {
  for (const raw of ["B", "b", "(B)", "Option B", "B. joule"]) {
    assert.equal(resolveStoredAnswer(raw, STORED, "MCQ"), "B", `input: ${raw}`);
  }
});

test("an answer matching no option is refused", () => {
  assert.equal(resolveStoredAnswer("Z", STORED, "MCQ"), null);
  assert.equal(resolveStoredAnswer("", STORED, "MCQ"), null);
  assert.equal(resolveStoredAnswer("the second one", STORED, "MCQ"), null);
});

test("MSQ answers are accepted in any separator or order, output is canonical", () => {
  assert.equal(resolveStoredAnswer("C;A", STORED, "MSQ"), "A;C");
  assert.equal(resolveStoredAnswer("A, C", STORED, "MSQ"), "A;C");
  assert.equal(resolveStoredAnswer("c , a", STORED, "MSQ"), "A;C");
});

test("an MSQ answer with one bad letter is refused entirely", () => {
  // Partially-understood is worse than rejected — it would silently drop a choice.
  assert.equal(resolveStoredAnswer("A;Z", STORED, "MSQ"), null);
});

test("NAT accepts a number or a tolerance range, rejects prose", () => {
  assert.equal(resolveStoredAnswer("9.8", [], "NAT"), "9.8");
  assert.equal(resolveStoredAnswer("9.75:9.85", [], "NAT"), "9.75:9.85");
  assert.equal(resolveStoredAnswer("about ten", [], "NAT"), null);
});

test("a question with no stored options cannot be adjudicated as MCQ", () => {
  assert.equal(resolveStoredAnswer("A", [], "MCQ"), null);
});

// ── Bare LaTeX ────────────────────────────────────────────────────────────────
// A real import stored option text as `-1 \text{ to } \frac{1}{2}` with no
// delimiters, which MathRenderer printed literally (backslashes and all).
// transformMathContent converts \(…\) and \[…\] but never invents a delimiter.

test("bare LaTeX in an option is wrapped so KaTeX renders it", () => {
  const { data } = adaptToDppQuestion(
    mcq({
      options: [
        opt("A", "-1 \\text{ to } \\frac{1}{2}"),
        opt("B", "-\\frac{3}{4} \\text{ to } -\\frac{1}{2}"),
      ],
      correct_answer: "A",
    }),
  );
  assert.deepEqual(data!.options, [
    "A. $-1 \\text{ to } \\frac{1}{2}$",
    "B. $-\\frac{3}{4} \\text{ to } -\\frac{1}{2}$",
  ]);
});

test("the label is never swallowed into the maths", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options: [opt("A", "\\frac{1}{2}"), opt("B", "2")], correct_answer: "A" }),
  );
  // "A. $…$", not "$A. …$"
  assert.equal((data!.options as unknown as string[])[0], "A. $\\frac{1}{2}$");
});

test("already-delimited maths is left alone", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options: [opt("A", "$\\frac{1}{2}$"), opt("B", "2")], correct_answer: "A" }),
  );
  assert.equal((data!.options as unknown as string[])[0], "A. $\\frac{1}{2}$");
});

test("prose containing a command is NOT wrapped", () => {
  // Wrapping this whole string would render the words mashed together in maths
  // mode — worse than the raw backslash it replaces.
  const { data } = adaptToDppQuestion(
    mcq({
      options: [opt("A", "Take \\alpha as the angle of twist"), opt("B", "2")],
      correct_answer: "A",
    }),
  );
  assert.equal(
    (data!.options as unknown as string[])[0],
    "A. Take \\alpha as the angle of twist",
  );
});

test("short variables alongside maths are still wrapped", () => {
  // Banning letters outright left these rendering as raw backslashes.
  const { data } = adaptToDppQuestion(
    mcq({
      options: [opt("A", "F = \\frac{k}{l}"), opt("B", "\\frac{8}{7} P")],
      correct_answer: "A",
    }),
  );
  assert.deepEqual(data!.options, ["A. $F = \\frac{k}{l}$", "B. $\\frac{8}{7} P$"]);
});

test("a unit abbreviation does not block wrapping", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options: [opt("A", "\\frac{1}{2} kg"), opt("B", "2")], correct_answer: "A" }),
  );
  assert.equal((data!.options as unknown as string[])[0], "A. $\\frac{1}{2} kg$");
});

test("plain text and plain numbers are untouched", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options: [opt("A", "newton"), opt("B", "9.8")], correct_answer: "A" }),
  );
  assert.deepEqual(data!.options, ["A. newton", "B. 9.8"]);
});

test("\\(…\\) delimited maths is left for transformMathContent", () => {
  const { data } = adaptToDppQuestion(
    mcq({ options: [opt("A", "\\(x^2\\)"), opt("B", "2")], correct_answer: "A" }),
  );
  assert.equal((data!.options as unknown as string[])[0], "A. \\(x^2\\)");
});
