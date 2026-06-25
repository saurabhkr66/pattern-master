import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

// PATCH /api/coaching/fees/payments/[id]  { void: true }
// Void (reverse) a recorded payment. We never delete it — the receipt number stays
// in the audit trail and is never reissued. Voided payments are excluded from every
// paid/balance derivation and hidden from the student. Idempotent guard: a payment
// already voided returns 409 so a double-tap doesn't read as success twice.
export const PATCH = withCoachingContext(async (req, { coachingId, actor }, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.void !== true) {
    return NextResponse.json({ error: "send { void: true } to reverse a payment" }, { status: 400 });
  }

  const payment = await prisma.feePayment.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true, voided_at: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "payment not found" }, { status: 404 });
  }
  if (payment.voided_at) {
    return NextResponse.json({ error: "this payment is already voided" }, { status: 409 });
  }

  await prisma.feePayment.update({
    where: { id },
    data: { voided_at: new Date(), voided_by: actor.adminId ?? null },
  });

  return NextResponse.json({ ok: true });
});
