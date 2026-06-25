// Fee-status derivation — the single place the paid/partial/pending rule lives,
// reused by the fees API routes and pages. Pure & dependency-free so it can run
// on the server (route handlers) or be unit-tested in isolation. Status is never
// stored: FeePayment rows are the source of truth and we derive everything here.

export type FeeStatus = "paid" | "partial" | "pending";

export interface InstallmentInput {
  id: string;
  amount: number;
  due_date: string | Date;
}

export interface PaymentInput {
  amount: number;
  installment_id: string | null;
}

export interface InstallmentBreakdown {
  id: string;
  amount: number;
  paid: number;
  due: number;
  due_date: string; // ISO
  overdue: boolean;
  status: FeeStatus;
}

export interface PlanSummary {
  total: number;
  paid: number;
  due: number;
  credit: number; // overpayment beyond the plan total (advance balance), 0 if none
  status: FeeStatus;
  nextDueDate: string | null; // ISO of the earliest still-unpaid installment
  overdueAmount: number; // unpaid balance of installments already past due
  installments: InstallmentBreakdown[];
}

// paid ≥ amount → paid; some-but-not-all → partial; nothing → pending. A zero
// (or negative) amount counts as paid so empty buckets don't read as "pending".
export function installmentStatus(amount: number, paid: number): FeeStatus {
  if (amount <= 0 || paid >= amount) return "paid";
  if (paid > 0) return "partial";
  return "pending";
}

function toIso(d: string | Date): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

export interface ParsedInstallment {
  label: string;
  amount: number; // integer rupees
  due_date: Date;
}

// Validate + normalize the installment schedule from a request body. Shared by
// the template and ad-hoc plan routes so the input rules live in one place.
// Returns a friendly error message or the cleaned rows.
export function parseInstallments(
  raw: unknown
): { error: string } | { ok: ParsedInstallment[] } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "add at least one installment" };
  }
  const out: ParsedInstallment[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = (raw[i] ?? {}) as { label?: unknown; amount?: unknown; dueDate?: unknown };
    const label = String(r.label ?? "").trim() || `Installment ${i + 1}`;
    const amount = Math.round(Number(r.amount));
    const due = new Date(String(r.dueDate ?? ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: `installment ${i + 1}: amount must be a positive number` };
    }
    if (isNaN(due.getTime())) {
      return { error: `installment ${i + 1}: a valid due date is required` };
    }
    out.push({ label, amount, due_date: due });
  }
  return { ok: out };
}

// Allocate payments to installments (oldest due-date first) and roll the result
// up into a plan-level summary. Installment-tagged payments apply to their own
// installment; untagged ("general"/advance) payments waterfall across remaining
// balances oldest-first, so an overpayment naturally clears later installments.
export function planSummary(
  totalAmount: number,
  installments: InstallmentInput[],
  payments: PaymentInput[],
  now: Date = new Date()
): PlanSummary {
  const ordered = [...installments].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  // Installments that currently exist on the plan. A payment tagged to one that's
  // since been deleted is treated as a general advance rather than dropped (the DB
  // SetNulls FeePayment.installment_id, but stay defensive if a stale id arrives).
  const knownIds = new Set(ordered.map((i) => i.id));

  const paidByInstallment = new Map<string, number>();
  let generalPool = 0;
  for (const p of payments) {
    const amt = Math.max(0, p.amount);
    if (p.installment_id && knownIds.has(p.installment_id)) {
      paidByInstallment.set(p.installment_id, (paidByInstallment.get(p.installment_id) ?? 0) + amt);
    } else {
      generalPool += amt;
    }
  }

  // A payment tagged to an installment for MORE than that installment owes spills
  // the overflow into the advance pool so it waterfalls onto the remaining
  // installments, instead of sitting trapped (and invisible) on its own. Without
  // this, plan-level `due` and the sum of per-installment `due` disagree.
  for (const inst of ordered) {
    const tagged = paidByInstallment.get(inst.id) ?? 0;
    if (tagged > inst.amount) {
      generalPool += tagged - inst.amount;
      paidByInstallment.set(inst.id, inst.amount);
    }
  }

  const nowMs = now.getTime();
  const breakdown: InstallmentBreakdown[] = ordered.map((inst) => {
    let paid = paidByInstallment.get(inst.id) ?? 0;
    const shortfall = inst.amount - paid;
    if (shortfall > 0 && generalPool > 0) {
      const take = Math.min(generalPool, shortfall);
      paid += take;
      generalPool -= take;
    }
    const due = Math.max(inst.amount - paid, 0);
    return {
      id: inst.id,
      amount: inst.amount,
      paid,
      due,
      due_date: toIso(inst.due_date),
      overdue: due > 0 && new Date(inst.due_date).getTime() < nowMs,
      status: installmentStatus(inst.amount, paid),
    };
  });

  const installmentsTotal = ordered.reduce((s, i) => s + i.amount, 0);
  const total = installmentsTotal > 0 ? installmentsTotal : totalAmount;
  const paid = payments.reduce((s, p) => s + Math.max(0, p.amount), 0);
  const due = Math.max(total - paid, 0);
  // Anything paid beyond the plan total is real credit (advance balance), surfaced
  // explicitly rather than only implied by paid > total.
  const credit = Math.max(paid - total, 0);
  const nextUnpaid = breakdown.find((b) => b.due > 0);

  return {
    total,
    paid,
    due,
    credit,
    status: installmentStatus(total, paid),
    nextDueDate: nextUnpaid ? nextUnpaid.due_date : null,
    overdueAmount: breakdown.reduce((s, b) => s + (b.overdue ? b.due : 0), 0),
    installments: breakdown,
  };
}
