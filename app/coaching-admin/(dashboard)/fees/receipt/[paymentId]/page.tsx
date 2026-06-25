import { notFound } from "next/navigation";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import ReceiptActions from "@/components/coaching/ReceiptActions";
import FeeReceipt from "@/components/coaching/FeeReceipt";
import VoidPaymentButton from "@/components/coaching/VoidPaymentButton";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank transfer",
  other: "Other",
};

export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const actor = await resolveCoachingAdmin();
  const coachingId = actor?.coachingId;
  if (!coachingId) notFound();

  // Scoped to the actor's coaching — a receipt id from another tenant 404s.
  const payment = await prisma.feePayment.findFirst({
    where: { id: paymentId, coaching_id: coachingId },
    select: {
      receipt_no: true,
      amount: true,
      method: true,
      note: true,
      paid_at: true,
      voided_at: true,
      student: { select: { name: true, phone: true } },
      installment: { select: { label: true } },
      plan: { select: { id: true, title: true, total_amount: true } },
      coaching: { select: { name: true } },
    },
  });
  if (!payment) notFound();

  // Running balance across the whole plan (live payments only — voided are reversed).
  const agg = await prisma.feePayment.aggregate({
    where: { plan_id: payment.plan.id, voided_at: null },
    _sum: { amount: true },
  });
  const paidTotal = agg._sum.amount ?? 0;
  const balance = Math.max(payment.plan.total_amount - paidTotal, 0);

  const receiptNo = String(payment.receipt_no).padStart(5, "0");
  const dateStr = new Date(payment.paid_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto max-w-lg">
        <ReceiptActions />
        <FeeReceipt
          coachingName={payment.coaching.name}
          receiptNo={receiptNo}
          dateStr={dateStr}
          studentName={payment.student.name}
          phone={payment.student.phone}
          planTitle={payment.plan.title}
          towards={payment.installment?.label ?? "General / advance"}
          method={METHOD_LABEL[payment.method] ?? payment.method}
          amount={payment.amount}
          balance={balance}
          note={payment.note}
          voided={payment.voided_at !== null}
        />
        {/* Reversal control — hidden in print. Once voided, the row stays for the
            audit trail but is excluded from every balance. */}
        <div className="no-print mt-5">
          <VoidPaymentButton paymentId={paymentId} voided={payment.voided_at !== null} />
        </div>
      </div>
    </div>
  );
}
