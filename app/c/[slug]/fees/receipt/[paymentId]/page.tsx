import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import ReceiptActions from "@/components/coaching/ReceiptActions";
import FeeReceipt from "@/components/coaching/FeeReceipt";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank transfer",
  other: "Other",
};

export default async function StudentReceiptPage({
  params,
}: {
  params: Promise<{ slug: string; paymentId: string }>;
}) {
  const { slug, paymentId } = await params;

  const coaching = await getCachedCoachingBySlug(slug);
  if (!coaching || !coaching.active) notFound();
  if (!coaching.fees_visible_to_students) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);
  if (student.status !== "approved") redirect(`/c/${slug}/dashboard`);

  // Scoped to THIS student in THIS coaching — a receipt id belonging to anyone
  // else (or another tenant) 404s. `note` is deliberately not selected: it may
  // hold admin-internal remarks and must never reach the student.
  const payment = await prisma.feePayment.findFirst({
    // voided_at: null → a reversed payment's receipt no longer exists for the student.
    where: { id: paymentId, coaching_id: coaching.id, student_id: student.id, voided_at: null },
    select: {
      receipt_no: true,
      amount: true,
      method: true,
      paid_at: true,
      installment: { select: { label: true } },
      plan: { select: { id: true, title: true, total_amount: true } },
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
    <div className="min-h-screen p-6 sm:p-8" style={{ background: "#06060c" }}>
      <div className="mx-auto max-w-lg">
        <ReceiptActions backHref={`/c/${slug}/fees`} backLabel="Back to fees" />
        <FeeReceipt
          coachingName={coaching.name}
          receiptNo={receiptNo}
          dateStr={dateStr}
          studentName={student.name}
          phone={student.phone}
          planTitle={payment.plan.title}
          towards={payment.installment?.label ?? "General / advance"}
          method={METHOD_LABEL[payment.method] ?? payment.method}
          amount={payment.amount}
          balance={balance}
        />
      </div>
    </div>
  );
}
