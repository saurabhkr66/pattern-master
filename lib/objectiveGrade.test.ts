// Tests for the shared objective grader. Pure module, no DB / network.
//
// Run:  npx tsx --test lib/objectiveGrade.test.ts
//
// These now grade BOTH live mock submissions and DPP runs, so a regression here
// silently rescores real tests. The NAT range cases are the reason DPP cannot
// use scoreQuestion() from lib/resolveQuestions.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMcq, checkMsq, checkNat, isAnswerCorrect } from "./objectiveGrade";

test("MCQ is case-insensitive label equality", () => {
  assert.equal(checkMcq("A", "A"), true);
  assert.equal(checkMcq("a", "A"), true);
  assert.equal(checkMcq(" a ", "A"), true);
  assert.equal(checkMcq("B", "A"), false);
  assert.equal(checkMcq("", "A"), false);
});

test("MSQ ignores order and separator", () => {
  assert.equal(checkMsq("A;C", "A;C"), true);
  assert.equal(checkMsq("C;A", "A;C"), true);
  assert.equal(checkMsq("A, C", "A;C"), true);
  assert.equal(checkMsq("a,c", "A;C"), true);
  // Partial and superset are both wrong — no partial credit at this layer.
  assert.equal(checkMsq("A", "A;C"), false);
  assert.equal(checkMsq("A;B;C", "A;C"), false);
  assert.equal(checkMsq("", "A;C"), false);
});

test("NAT accepts an exact string match", () => {
  assert.equal(checkNat("8", "8"), true);
  assert.equal(checkNat(" 8 ", "8"), true);
  assert.equal(checkNat("9", "8"), false);
});

test("NAT accepts a colon range — the form lib/dppAdapter writes", () => {
  // dppAdapter folds `correct_answer: "9.8", nat_tolerance: 0.05` into this.
  assert.equal(checkNat("9.8", "9.75:9.85"), true);
  assert.equal(checkNat("9.75", "9.75:9.85"), true);
  assert.equal(checkNat("9.85", "9.75:9.85"), true);
  assert.equal(checkNat("9.9", "9.75:9.85"), false);
  assert.equal(checkNat("9.7", "9.75:9.85"), false);
});

test("NAT accepts a 'to' range — the form some PYQ answers use", () => {
  assert.equal(checkNat("9.8", "9.75 to 9.85"), true);
  assert.equal(checkNat("9.9", "9.75 to 9.85"), false);
});

test("NAT rejects non-numeric input against a range", () => {
  assert.equal(checkNat("about ten", "9.75:9.85"), false);
  assert.equal(checkNat("", "9.75:9.85"), false);
});

test("NAT handles negative bounds", () => {
  assert.equal(checkNat("-3", "-5:-1"), true);
  assert.equal(checkNat("0", "-5:-1"), false);
});

test("isAnswerCorrect dispatches by type and rejects unknown types", () => {
  assert.equal(isAnswerCorrect("MCQ", "A", "A"), true);
  assert.equal(isAnswerCorrect("MSQ", "C;A", "A;C"), true);
  assert.equal(isAnswerCorrect("NAT", "9.8", "9.75:9.85"), true);
  // SUBJECTIVE has no automatic answer — must never grade as correct here.
  assert.equal(isAnswerCorrect("SUBJECTIVE", "anything", "anything"), false);
  assert.equal(isAnswerCorrect("", "A", "A"), false);
});
