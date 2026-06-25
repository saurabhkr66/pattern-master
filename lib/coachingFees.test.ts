// Unit tests for the fee payment-allocation logic — the one piece where a bug
// means real money shown wrong to a real parent. Pure module, no DB / network.
//
// Run:  npx tsx --test lib/coachingFees.test.ts
//
// Covers the nasty corners of money allocation: overpayment beyond the plan
// total, a payment tagged to an installment larger than that installment,
// partials summing to exactly one installment, deleted/orphaned tags, and the
// invariant that plan-level `due` always equals the sum of per-installment `due`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { planSummary, installmentStatus, type InstallmentInput, type PaymentInput } from "./coachingFees";

// A fixed "now" so overdue flags are deterministic. Installments below are dated
// well in the past, so they're overdue when still owed.
const NOW = new Date("2026-06-25T00:00:00Z");

function inst(id: string, amount: number, due: string): InstallmentInput {
  return { id, amount, due_date: new Date(due) };
}
function pay(amount: number, installment_id: string | null = null): PaymentInput {
  return { amount, installment_id };
}

// The core invariant: whatever the inputs, the sum of per-installment `due` must
// equal the plan-level `due`. If these ever drift, the parent sees two numbers.
function assertConsistent(s: ReturnType<typeof planSummary>) {
  const sumInstallmentDue = s.installments.reduce((acc, b) => acc + b.due, 0);
  assert.equal(sumInstallmentDue, s.due, "sum of installment due must equal plan due");
  // paid + due should reconcile to total whenever not overpaid.
  if (s.credit === 0) assert.equal(s.paid + s.due, s.total);
}

test("installmentStatus: zero/over → paid, partial, pending", () => {
  assert.equal(installmentStatus(0, 0), "paid");
  assert.equal(installmentStatus(500, 500), "paid");
  assert.equal(installmentStatus(500, 600), "paid");
  assert.equal(installmentStatus(500, 200), "partial");
  assert.equal(installmentStatus(500, 0), "pending");
});

test("plain pending: one installment, nothing paid", () => {
  const s = planSummary(1000, [inst("a", 1000, "2026-01-01")], [], NOW);
  assert.equal(s.total, 1000);
  assert.equal(s.paid, 0);
  assert.equal(s.due, 1000);
  assert.equal(s.credit, 0);
  assert.equal(s.status, "pending");
  assert.equal(s.installments[0].overdue, true);
  assertConsistent(s);
});

test("Case A: overpayment beyond plan total surfaces as credit, due is 0", () => {
  // total 1000, pay 1500 (general). Extra 500 must show as credit, not vanish.
  const s = planSummary(1000, [inst("a", 1000, "2026-01-01")], [pay(1500)], NOW);
  assert.equal(s.total, 1000);
  assert.equal(s.paid, 1500);
  assert.equal(s.due, 0);
  assert.equal(s.credit, 500);
  assert.equal(s.status, "paid");
  assert.equal(s.installments[0].due, 0);
  assertConsistent(s);
});

test("Case B: payment tagged ABOVE its installment waterfalls the overflow", () => {
  // X=500 (early), Y=500 (late). Pay 800 tagged to X.
  // The 300 overflow must spill onto Y, not stay trapped on X.
  const installments = [inst("x", 500, "2026-01-01"), inst("y", 500, "2026-03-01")];
  const s = planSummary(1000, installments, [pay(800, "x")], NOW);

  const x = s.installments.find((b) => b.id === "x")!;
  const y = s.installments.find((b) => b.id === "y")!;
  assert.equal(x.paid, 500);
  assert.equal(x.due, 0);
  assert.equal(y.paid, 300, "overflow from X must reach Y");
  assert.equal(y.due, 200);

  assert.equal(s.paid, 800);
  assert.equal(s.due, 200); // <-- before the fix this disagreed with the schedule (500)
  assert.equal(s.credit, 0);
  assertConsistent(s);
});

test("Case B extreme: tag overflow beyond ALL installments becomes credit", () => {
  const installments = [inst("x", 500, "2026-01-01"), inst("y", 500, "2026-03-01")];
  const s = planSummary(1000, installments, [pay(1300, "x")], NOW);
  assert.equal(s.installments.find((b) => b.id === "x")!.due, 0);
  assert.equal(s.installments.find((b) => b.id === "y")!.due, 0);
  assert.equal(s.due, 0);
  assert.equal(s.credit, 300);
  assertConsistent(s);
});

test("Case C: partials summing to exactly one installment clear the oldest", () => {
  const installments = [inst("x", 500, "2026-01-01"), inst("y", 500, "2026-03-01")];
  // Two general payments of 250 → 500 total, should fully clear X (oldest), not Y.
  const s = planSummary(1000, installments, [pay(250), pay(250)], NOW);
  assert.equal(s.installments.find((b) => b.id === "x")!.due, 0);
  assert.equal(s.installments.find((b) => b.id === "y")!.due, 500);
  assert.equal(s.due, 500);
  assert.equal(s.status, "partial");
  assertConsistent(s);
});

test("Case C tagged: partials tagged to each installment stay put", () => {
  const installments = [inst("x", 500, "2026-01-01"), inst("y", 500, "2026-03-01")];
  const s = planSummary(1000, installments, [pay(250, "x"), pay(250, "y")], NOW);
  assert.equal(s.installments.find((b) => b.id === "x")!.due, 250);
  assert.equal(s.installments.find((b) => b.id === "y")!.due, 250);
  assert.equal(s.due, 500);
  assertConsistent(s);
});

test("Case D: payment tagged to a now-deleted installment is treated as advance", () => {
  // Simulates editing the schedule after a payment: the old installment id "gone"
  // is no longer in the installments list. Its money must waterfall, not vanish.
  const installments = [inst("x", 500, "2026-01-01"), inst("y", 500, "2026-03-01")];
  const s = planSummary(1000, installments, [pay(500, "gone")], NOW);
  assert.equal(s.paid, 500);
  assert.equal(s.installments.find((b) => b.id === "x")!.due, 0, "advance clears oldest first");
  assert.equal(s.installments.find((b) => b.id === "y")!.due, 500);
  assert.equal(s.due, 500);
  assertConsistent(s);
});

test("waterfall respects due-date order regardless of input order", () => {
  // Late installment listed first; a general payment must still hit the earlier due.
  const installments = [inst("late", 500, "2026-05-01"), inst("early", 500, "2026-01-01")];
  const s = planSummary(1000, installments, [pay(500)], NOW);
  assert.equal(s.installments.find((b) => b.id === "early")!.due, 0);
  assert.equal(s.installments.find((b) => b.id === "late")!.due, 500);
  assertConsistent(s);
});

test("negative payment amounts are ignored (no void-by-negative today)", () => {
  // Documents current behaviour: a -200 reversal entry is clamped to 0, so it does
  // NOT reduce paid. If we ever add voids, this test should change deliberately.
  const s = planSummary(1000, [inst("a", 1000, "2026-01-01")], [pay(500), pay(-200, "a")], NOW);
  assert.equal(s.paid, 500);
  assert.equal(s.due, 500);
  assertConsistent(s);
});
