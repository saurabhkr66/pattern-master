import "server-only";
import { prisma } from "@/lib/prisma";
import { planSummary, type FeeStatus } from "@/lib/coachingFees";

// Server-side dues payload, shared by the fees page (initial render) and the
// GET /api/coaching/fees route (client refetch after a mutation) so the "who
// hasn't paid" computation lives in exactly one place.

export type FeeInstallmentRow = {
  id: string;
  label: string;
  amount: number;
  paid: number;
  due: number;
  due_date: string;
  overdue: boolean;
  status: FeeStatus;
};

export type FeeDuesRow = {
  planId: string;
  title: string;
  studentId: string;
  studentName: string;
  phone: string;
  batchName: string | null;
  total: number;
  paid: number;
  due: number;
  status: FeeStatus;
  nextDueDate: string | null;
  overdueAmount: number;
  installments: FeeInstallmentRow[];
};

export type FeeDues = {
  rows: FeeDuesRow[];
  totals: { collected: number; outstanding: number; defaulters: number; plans: number };
};

export async function getFeeDues(coachingId: string): Promise<FeeDues> {
  const plans = await prisma.feePlan.findMany({
    where: { coaching_id: coachingId, status: "active" },
    select: {
      id: true,
      title: true,
      total_amount: true,
      student: { select: { id: true, name: true, phone: true, batch: { select: { name: true } } } },
      installments: {
        select: { id: true, label: true, amount: true, due_date: true },
        orderBy: { due_date: "asc" },
      },
      // Voided payments are reversed — never count toward paid/dues.
      payments: { where: { voided_at: null }, select: { amount: true, installment_id: true } },
    },
  });

  let collected = 0;
  let outstanding = 0;
  let defaulters = 0;

  const rows: FeeDuesRow[] = plans.map((p) => {
    const summary = planSummary(
      p.total_amount,
      p.installments.map((i) => ({ id: i.id, amount: i.amount, due_date: i.due_date })),
      p.payments.map((pay) => ({ amount: pay.amount, installment_id: pay.installment_id }))
    );
    collected += summary.paid;
    outstanding += summary.due;
    if (summary.overdueAmount > 0) defaulters++;

    const labelById = new Map(p.installments.map((i) => [i.id, i.label]));
    return {
      planId: p.id,
      title: p.title,
      studentId: p.student.id,
      studentName: p.student.name,
      phone: p.student.phone,
      batchName: p.student.batch?.name ?? null,
      total: summary.total,
      paid: summary.paid,
      due: summary.due,
      status: summary.status,
      nextDueDate: summary.nextDueDate,
      overdueAmount: summary.overdueAmount,
      installments: summary.installments.map((b) => ({ ...b, label: labelById.get(b.id) ?? "" })),
    };
  });

  // Defaulters (overdue) first, then largest remaining due — the dues view order.
  rows.sort((a, b) => b.overdueAmount - a.overdueAmount || b.due - a.due);

  return { rows, totals: { collected, outstanding, defaulters, plans: rows.length } };
}

// ─── Student-facing view ──────────────────────────────────────────────────────
// One student's own fee plans + payment history, for /c/[slug]/fees. Same
// planSummary derivation as the admin dues view, but scoped to a single student
// and WITHOUT the per-payment `note` (admin-internal). Gated by the coaching's
// fees_visible_to_students flag at the page level, not here.

export type StudentFeePayment = {
  id: string;
  receiptNo: number;
  amount: number;
  method: string;
  paidAt: string; // ISO
  towards: string; // installment label or "General / advance"
};

export type StudentFeePlan = {
  planId: string;
  title: string;
  total: number;
  paid: number;
  due: number;
  status: FeeStatus;
  nextDueDate: string | null;
  overdueAmount: number;
  installments: FeeInstallmentRow[];
  payments: StudentFeePayment[];
};

export async function getStudentFees(
  coachingId: string,
  studentId: string
): Promise<StudentFeePlan[]> {
  const plans = await prisma.feePlan.findMany({
    where: { coaching_id: coachingId, student_id: studentId, status: "active" },
    select: {
      id: true,
      title: true,
      total_amount: true,
      installments: {
        select: { id: true, label: true, amount: true, due_date: true },
        orderBy: { due_date: "asc" },
      },
      // Voided payments are hidden from the student and excluded from derivation.
      payments: {
        where: { voided_at: null },
        select: {
          id: true,
          amount: true,
          method: true,
          receipt_no: true,
          paid_at: true,
          installment_id: true,
          installment: { select: { label: true } },
        },
        orderBy: { paid_at: "desc" },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return plans.map((p) => {
    const summary = planSummary(
      p.total_amount,
      p.installments.map((i) => ({ id: i.id, amount: i.amount, due_date: i.due_date })),
      p.payments.map((pay) => ({ amount: pay.amount, installment_id: pay.installment_id }))
    );
    const labelById = new Map(p.installments.map((i) => [i.id, i.label]));
    return {
      planId: p.id,
      title: p.title,
      total: summary.total,
      paid: summary.paid,
      due: summary.due,
      status: summary.status,
      nextDueDate: summary.nextDueDate,
      overdueAmount: summary.overdueAmount,
      installments: summary.installments.map((b) => ({ ...b, label: labelById.get(b.id) ?? "" })),
      payments: p.payments.map((pay) => ({
        id: pay.id,
        receiptNo: pay.receipt_no,
        amount: pay.amount,
        method: pay.method,
        paidAt: pay.paid_at.toISOString(),
        towards: pay.installment?.label ?? "General / advance",
      })),
    };
  });
}
