// Tests for the DPP paper's option normalisation — the single place where a bug
// silently mis-grades every question. Pure functions, no DB / network.
//
// Run:  npx tsx --test lib/dppPaper.test.ts
//
// The hazard: TestEngine/QuestionPane derive an option's letter from the ARRAY
// INDEX, while DppQuestion stores label-prefixed strings and grades against a
// LABEL. orderedOptions makes index and label agree; engineAnswerToStored maps
// the engine's letter back to the real label so the two can never drift.

import { test } from "node:test";
import assert from "node:assert/strict";
// Imported from lib/dppOptions (pure) rather than lib/dppPaper (server-only) —
// `import "server-only"` throws outside a server component, including here.
import {
  orderedOptions,
  engineLetterToLabel,
  engineAnswerToStored,
  dppDurationSecs,
  sortStoredOptions,
} from "./dppOptions";

test("in-order options pass through unchanged", () => {
  const { options, labels } = orderedOptions(["A. newton", "B. joule", "C. watt"]);
  assert.deepEqual(options, ["A. newton", "B. joule", "C. watt"]);
  assert.deepEqual(labels, ["A", "B", "C"]);
});

test("out-of-order options are sorted, and labels record the original order", () => {
  // The exact shape the e2e run produced, and the bug this function exists for.
  const { options, labels } = orderedOptions([
    "B. Control Unit",
    "A. ALU",
    "C. Cache",
    "D. MAR",
  ]);
  assert.deepEqual(options, ["A. ALU", "B. Control Unit", "C. Cache", "D. MAR"]);
  assert.deepEqual(labels, ["A", "B", "C", "D"]);
  // Index now equals label — the engine's assumption holds.
  assert.equal(options[0].charAt(0), labels[0]);
});

test("the engine's letter maps back to the stored label", () => {
  // Stored out of order with NON-sequential labels, so index != label naively.
  const { options, labels } = orderedOptions(["C. watt", "A. newton"]);
  assert.deepEqual(options, ["A. newton", "B. watt"]);
  assert.deepEqual(labels, ["A", "C"]);
  // Engine says the student picked its second option ("B") = "watt", whose real
  // stored label is "C". Comparing "B" to correct_answer would be wrong.
  assert.equal(engineLetterToLabel("B", labels), "C");
  assert.equal(engineLetterToLabel("A", labels), "A");
});

test("numeric labels sort numerically, not lexically", () => {
  const { options, labels } = orderedOptions(["10. ten", "2. two", "1. one"]);
  assert.deepEqual(labels, ["1", "2", "10"]);
  assert.deepEqual(options, ["A. one", "B. two", "C. ten"]);
  assert.equal(engineLetterToLabel("C", labels), "10");
});

test("prefix is renormalised so QuestionPane's ^[A-E]\\. strip works", () => {
  // Numeric and F+ labels would otherwise survive the strip and show as
  // duplicated text next to the badge.
  const { options } = orderedOptions(["1. one", "2. two"]);
  for (const o of options) assert.match(o, /^[A-Z]\. /);

  const six = orderedOptions(["A. a", "B. b", "C. c", "D. d", "E. e", "F. f"]);
  assert.equal(six.options[5], "F. f");
});

test("every decorated prefix form is recognised", () => {
  for (const raw of ["A) newton", "(A) newton", "A. newton", "A - newton", "A: newton"]) {
    const { options, labels } = orderedOptions([raw, "B. joule"]);
    assert.deepEqual(labels, ["A", "B"], `input: ${raw}`);
    assert.equal(options[0], "A. newton", `input: ${raw}`);
  }
});

test("options with no parseable label fall back to position", () => {
  const { options, labels } = orderedOptions(["newton", "joule"]);
  assert.deepEqual(labels, ["A", "B"]);
  assert.deepEqual(options, ["A. newton", "B. joule"]);
});

test("a leading parenthetical that is not a label survives", () => {
  const { options } = orderedOptions(["A. (2x + 1) metres", "B. joule"]);
  assert.equal(options[0], "A. (2x + 1) metres");
});

test("empty and non-array input are safe", () => {
  assert.deepEqual(orderedOptions([]), { options: [], labels: [] });
  assert.deepEqual(orderedOptions(null), { options: [], labels: [] });
  assert.deepEqual(orderedOptions(undefined), { options: [], labels: [] });
});

test("duplicate labels keep input order rather than shuffling", () => {
  const { labels } = orderedOptions(["A. first", "A. second", "B. third"]);
  assert.deepEqual(labels, ["A", "A", "B"]);
});

test("engineLetterToLabel rejects out-of-range letters", () => {
  assert.equal(engineLetterToLabel("Z", ["A", "B"]), null);
  assert.equal(engineLetterToLabel("C", ["A", "B"]), null);
  assert.equal(engineLetterToLabel("", ["A", "B"]), null);
});

test("MSQ answers are mapped element-wise and rejoined", () => {
  const labels = ["A", "C", "D"]; // stored labels after sorting
  // Engine letters A,B,C → stored labels A,C,D
  assert.equal(engineAnswerToStored("A;B", "MSQ", labels), "A;C");
  assert.equal(engineAnswerToStored("A, C", "MSQ", labels), "A;D");
  assert.equal(engineAnswerToStored("C", "MSQ", labels), "D");
});

test("MSQ drops unmappable letters rather than inventing one", () => {
  assert.equal(engineAnswerToStored("A;Z", "MSQ", ["A", "B"]), "A");
  assert.equal(engineAnswerToStored("Z", "MSQ", ["A", "B"]), "");
});

test("NAT answers pass through untouched", () => {
  assert.equal(engineAnswerToStored("9.8", "NAT", []), "9.8");
  assert.equal(engineAnswerToStored(" 42 ", "NAT", []), "42");
});

test("a blank answer stays blank", () => {
  assert.equal(engineAnswerToStored("", "MCQ", ["A"]), "");
  assert.equal(engineAnswerToStored(null, "MCQ", ["A"]), "");
  assert.equal(engineAnswerToStored(undefined, "NAT", []), "");
});

test("the full round trip grades an out-of-order question correctly", () => {
  // Stored: options out of label order, correct answer is the label "A" (= ALU).
  const stored = ["B. Control Unit", "A. ALU", "C. Cache", "D. MAR"];
  const correctAnswer = "A";
  const { options, labels } = orderedOptions(stored);

  // The student sees the sorted list and clicks the option reading "ALU".
  const clickedIndex = options.findIndex((o) => o.includes("ALU"));
  const engineLetter = ["A", "B", "C", "D"][clickedIndex];

  const submitted = engineAnswerToStored(engineLetter, "MCQ", labels);
  assert.equal(submitted, correctAnswer, "picking ALU must grade as correct");
});

test("duration is 2 min/question, capped at an hour", () => {
  assert.equal(dppDurationSecs(10), 1200);
  assert.equal(dppDurationSecs(1), 120);
  assert.equal(dppDurationSecs(0), 120); // never zero
  assert.equal(dppDurationSecs(100), 3600);
});

// ─── sortStoredOptions: display order for the charAt(0) family ────────────────
//
// The invariant that matters: it may PERMUTE the array but must never REWRITE a
// string. Any rewrite would separate a label from its text and invert answers in
// AnswerSelector / PracticeButton / FlashcardDeck / MistakeCard at once.

test("out-of-order stored options are displayed in label order", () => {
  const stored = ["B. Control Unit", "A. ALU", "D. MAR", "C. Cache"];
  assert.deepEqual(sortStoredOptions(stored), [
    "A. ALU",
    "B. Control Unit",
    "C. Cache",
    "D. MAR",
  ]);
});

test("strings are permuted, never rewritten — the label stays with its text", () => {
  const stored = ["B. Control Unit", "A. ALU"];
  const out = sortStoredOptions(stored);
  // Every output string is an input string, unchanged and unduplicated.
  assert.deepEqual([...out].sort(), [...stored].sort());
  // And the letter still leads the text it belongs to.
  assert.ok(out[0].startsWith("A.") && out[0].includes("ALU"));
  assert.ok(out[1].startsWith("B.") && out[1].includes("Control Unit"));
});

test("the answer cannot invert: the correct label still selects the same text", () => {
  const stored = ["B. Control Unit", "A. ALU", "C. Cache"];
  const correctAnswer = "A"; // = ALU
  const before = stored.find((o) => o.trim().charAt(0) === correctAnswer);
  const after = sortStoredOptions(stored).find((o) => o.trim().charAt(0) === correctAnswer);
  assert.equal(after, before);
  assert.ok(after!.includes("ALU"));
});

test("already-ordered options are left as they are", () => {
  const stored = ["A. one", "B. two", "C. three"];
  assert.deepEqual(sortStoredOptions(stored), stored);
});

test("numeric labels sort numerically, not lexically", () => {
  assert.deepEqual(sortStoredOptions(["10. ten", "2. two", "1. one"]), [
    "1. one",
    "2. two",
    "10. ten",
  ]);
});

test("unlabelled options keep their position rather than being guessed at", () => {
  const stored = ["just text", "more text"];
  assert.deepEqual(sortStoredOptions(stored), stored);
});

test("empty and non-array input are safe", () => {
  assert.deepEqual(sortStoredOptions([]), []);
  assert.deepEqual(sortStoredOptions(null), []);
  assert.deepEqual(sortStoredOptions(undefined), []);
  assert.deepEqual(sortStoredOptions("A. nope"), []);
});
