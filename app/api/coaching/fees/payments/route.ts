import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

const METHODS = new Set(["cash", "upi", "bank", "other"]);

// POST /api/coaching/fees/payments
//   { planId, installmentId?, amount, method?, note?, paidAt? }
// Record a payment and issue a sequential per-coaching receipt number. Returns the
// new payment id so the client can open the printable receipt.
export const POST = withCoachingContext(async (req, { coachingId, actor }) => {
  const body = await req.json();
  const planId = String(body.planId ?? "");
  const installmentId = body.installmentId ? String(body.installmentId) : null;
  const amount = Math.round(Number(body.amount));
  const method = typeof body.method === "string" && METHODS.has(body.method) ? body.method : "cash";
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!planId) {
    return NextResponse.json({ error: "a plan is required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  // Plan must belong to this coaching; pull the student for denormalization.
  const plan = await prisma.feePlan.findFirst({
    where: { id: planId, coaching_id: coachingId },
    select: { id: true, student_id: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "plan not found" }, { status: 404 });
  }

  // If targeting an installment, it must belong to this plan.
  if (installmentId) {
    const inst = await prisma.feeInstallment.findFirst({
      where: { id: installmentId, plan_id: planId, coaching_id: coachingId },
      select: { id: true },
    });
    if (!inst) {
      return NextResponse.json({ error: "installment not found" }, { status: 404 });
    }
  }

  let paidAt: Date | undefined;
  if (body.paidAt) {
    const d = new Date(String(body.paidAt));
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "invalid payment date" }, { status: 400 });
    }
    paidAt = d;
  }

  // Allocate the receipt number atomically. A single raw UPDATE ... RETURNING is
  // safe on both the Neon HTTP adapter and the standard driver (no interactive
  // transaction needed) and stays correct under concurrent admins. See the
  // project_neon_http_no_updatemany memory.
  const seq = await prisma.$queryRaw<{ fee_receipt_seq: number }[]>`
    UPDATE "Coaching" SET fee_receipt_seq = fee_receipt_seq + 1
    WHERE id = ${coachingId} RETURNING fee_receipt_seq`;
  const receiptNo = seq[0]?.fee_receipt_seq;
  if (!receiptNo) {
    return NextResponse.json({ error: "could not issue a receipt number" }, { status: 500 });
  }

  const payment = await prisma.feePayment.create({
    data: {
      coaching_id: coachingId,
      student_id: plan.student_id,
      plan_id: planId,
      installment_id: installmentId,
      amount,
      method,
      note,
      receipt_no: receiptNo,
      recorded_by: actor.adminId ?? null,
      ...(paidAt ? { paid_at: paidAt } : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, paymentId: payment.id, receiptNo });
});
