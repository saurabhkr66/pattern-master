"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, IndianRupee, Wallet, AlertTriangle, Trash2, Receipt } from "lucide-react";
import {
  display,
  Btn,
  Card,
  Pill,
  PageHead,
  StatCard,
  Table,
  TRow,
  type Col,
} from "@/components/coaching/ui";
import VisibilityToggle from "@/components/coaching/VisibilityToggle";
import type { FeeDues, FeeDuesRow, FeeInstallmentRow } from "@/lib/coachingFeesData";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500";

type Batch = { id: string; name: string; students: number };
type StudentOpt = { id: string; name: string; batchName: string | null };
type TemplateRow = {
  id: string;
  title: string;
  batchName: string | null;
  totalAmount: number;
  plans: number;
};

// ── formatting ────────────────────────────────────────────────────────────────
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Row-level status pill: an overdue balance reads "Overdue" (danger) regardless of
// how much is partially paid; otherwise mirror the derived plan status.
function statusPill(row: FeeDuesRow) {
  if (row.overdueAmount > 0) return <Pill tone="danger">Overdue</Pill>;
  if (row.status === "paid") return <Pill tone="success">Paid</Pill>;
  if (row.status === "partial") return <Pill tone="amber">Partial</Pill>;
  return <Pill tone="slate">Pending</Pill>;
}

// Client-side page size for the dues list — it's fully loaded in memory, so this
// is purely to keep the table scannable for a coaching with hundreds of dues.
const DUES_PAGE_SIZE = 25;

const DUES_COLS: Col[] = [
  { label: "Student", w: "1.5fr" },
  { label: "Plan", w: "1.2fr" },
  { label: "Paid / Total", w: "1fr" },
  { label: "Status", w: "0.9fr" },
  { label: "Next due", w: "1fr" },
  { label: "", w: "auto", align: "right" },
];

export default function FeesClient({
  feesVisibleToStudents,
  initialDues,
  batches,
  students,
  initialTemplates,
}: {
  feesVisibleToStudents: boolean;
  initialDues: FeeDues;
  batches: Batch[];
  students: StudentOpt[];
  initialTemplates: TemplateRow[];
}) {
  const router = useRouter();
  const [dues, setDues] = useState<FeeDues>(initialDues);
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates);
  const [tab, setTab] = useState<"dues" | "plans">("dues");
  const [planModal, setPlanModal] = useState(false);
  const [payRow, setPayRow] = useState<FeeDuesRow | null>(null);

  const refreshDues = useCallback(async () => {
    const res = await fetch("/api/coaching/fees");
    if (res.ok) setDues(await res.json());
  }, []);

  const refreshTemplates = useCallback(async () => {
    const res = await fetch("/api/coaching/fees/templates");
    if (res.ok) {
      const d = await res.json();
      setTemplates(
        d.templates.map((t: { id: string; title: string; batchName: string | null; totalAmount: number; plans: number }) => ({
          id: t.id,
          title: t.title,
          batchName: t.batchName,
          totalAmount: t.totalAmount,
          plans: t.plans,
        }))
      );
    }
  }, []);

  const { totals, rows } = dues;
  // The dues view answers "who hasn't paid" — hide fully-settled plans.
  const unpaid = rows.filter((r) => r.due > 0);

  return (
    <div className="p-6 sm:p-8">
      <PageHead title="Fees" sub="Track fee plans, dues and payments" icon={<IndianRupee className="h-7 w-7" />}>
        <Btn onClick={() => setPlanModal(true)}>
          <Plus className="h-[18px] w-[18px]" /> New fee plan
        </Btn>
      </PageHead>

      {/* Summary */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row">
        <StatCard label="Collected" value={inr(totals.collected)} icon={<Wallet className="h-5 w-5" />} iconColor="#4ade80" />
        <StatCard label="Outstanding" value={inr(totals.outstanding)} icon={<IndianRupee className="h-5 w-5" />} iconColor="#f59e0b" accent />
        <StatCard label="Defaulters" value={totals.defaulters} sub="students past a due date" icon={<AlertTriangle className="h-5 w-5" />} iconColor="#f87171" />
      </div>

      {/* Student visibility toggle */}
      <VisibilityToggle
        initial={feesVisibleToStudents}
        endpoint="/api/coaching/fees/settings"
        title="Show fees to students"
        onLabel="Students can see their own fee plan and download receipts."
        offLabel="Fees stay private — only you and your team can see them."
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-2">
        <TabBtn on={tab === "dues"} onClick={() => setTab("dues")}>
          Dues
        </TabBtn>
        <TabBtn on={tab === "plans"} onClick={() => setTab("plans")}>
          Plans &amp; templates
        </TabBtn>
      </div>

      {tab === "dues" ? (
        <DuesView rows={unpaid} batches={batches} onRecord={(r) => setPayRow(r)} />
      ) : (
        <TemplatesView templates={templates} />
      )}

      {planModal && (
        <NewPlanModal
          batches={batches}
          students={students}
          onClose={() => setPlanModal(false)}
          onDone={async () => {
            setPlanModal(false);
            await Promise.all([refreshDues(), refreshTemplates()]);
          }}
        />
      )}

      {payRow && (
        <RecordPaymentModal
          row={payRow}
          onClose={() => setPayRow(null)}
          onPaid={(paymentId) => {
            // Jump straight to the printable receipt; returning re-renders fresh dues.
            router.push(`/coaching-admin/fees/receipt/${paymentId}`);
          }}
        />
      )}
    </div>
  );
}



function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-2 text-sm font-semibold transition"
      style={
        on
          ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
          : { background: "rgba(255,255,255,0.04)", color: "#c9ced8", border: "1px solid rgba(255,255,255,0.07)" }
      }
    >
      {children}
    </button>
  );
}

// ── Dues view ───────────────────────────────────────────────────────────────────
// Batch names are unique per coaching (@@unique([coaching_id, name])), so filtering
// dues rows by batchName is unambiguous; "" = all batches.
function DuesView({ rows, batches, onRecord }: { rows: FeeDuesRow[]; batches: Batch[]; onRecord: (r: FeeDuesRow) => void }) {
  const [batchFilter, setBatchFilter] = useState<string>("");
  const [page, setPage] = useState(0);

  if (rows.length === 0) {
    return (
      <Card>
        <div className="px-6 py-14 text-center text-slate-400">
          <Receipt className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          Nobody owes anything right now — all fees are settled.
        </div>
      </Card>
    );
  }

  const filtered = batchFilter ? rows.filter((r) => r.batchName === batchFilter) : rows;
  // Clamp the page in case the filter (or a refetch) shrank the list under it.
  const pageCount = Math.max(1, Math.ceil(filtered.length / DUES_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * DUES_PAGE_SIZE, (safePage + 1) * DUES_PAGE_SIZE);

  return (
    <>
      {batches.length > 0 && (
        <div className="mb-3 flex justify-end">
          <select
            value={batchFilter}
            onChange={(e) => {
              setBatchFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          >
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <div className="px-6 py-14 text-center text-slate-400">No dues in this batch.</div>
        </Card>
      ) : (
        <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table cols={DUES_COLS}>
          {paged.map((r, i) => (
            <TRow
              key={r.planId}
              cols={DUES_COLS}
              last={i === paged.length - 1}
              cells={[
                <div key="s">
                  <div className="font-semibold text-white">{r.studentName}</div>
                  {r.batchName && <div className="text-xs text-slate-500">{r.batchName}</div>}
                </div>,
                <div key="p" className="text-sm text-slate-300">
                  {r.title}
                </div>,
                <div key="a" className="text-sm">
                  <span className="font-semibold text-white">{inr(r.paid)}</span>
                  <span className="text-slate-500"> / {inr(r.total)}</span>
                  <div className="text-xs text-amber-400">{inr(r.due)} due</div>
                </div>,
                <div key="st">{statusPill(r)}</div>,
                <div key="d" className="text-sm text-slate-300">
                  {fmtDate(r.nextDueDate)}
                </div>,
                <div key="ac" className="flex justify-end">
                  {/* WhatsApp "Remind" seam goes here later — see lib/whatsappShare. */}
                  <Btn kind="soft" onClick={() => onRecord(r)}>
                    Record payment
                  </Btn>
                </div>,
              ]}
            />
          ))}
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {paged.map((r) => (
          <Card key={r.planId}>
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{r.studentName}</div>
                  <div className="text-xs text-slate-500">
                    {r.title}
                    {r.batchName ? ` · ${r.batchName}` : ""}
                  </div>
                </div>
                {statusPill(r)}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-sm">
                  <div>
                    <span className="font-semibold text-white">{inr(r.paid)}</span>
                    <span className="text-slate-500"> / {inr(r.total)}</span>
                  </div>
                  <div className="text-xs text-amber-400">{inr(r.due)} due · next {fmtDate(r.nextDueDate)}</div>
                </div>
                <Btn kind="soft" onClick={() => onRecord(r)}>
                  Record
                </Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Pager
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={DUES_PAGE_SIZE}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
      />
        </>
      )}
    </>
  );
}

// Prev/next pager for an in-memory list. Hidden when everything fits on one page.
function Pager({
  page,
  pageCount,
  total,
  pageSize,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (pageCount <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-xs text-slate-500">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex gap-2">
        <Btn kind="ghost" onClick={onPrev} disabled={page === 0}>
          Prev
        </Btn>
        <Btn kind="ghost" onClick={onNext} disabled={page >= pageCount - 1}>
          Next
        </Btn>
      </div>
    </div>
  );
}

// ── Templates view ───────────────────────────────────────────────────────────────
function TemplatesView({ templates }: { templates: TemplateRow[] }) {
  if (templates.length === 0) {
    return (
      <Card>
        <div className="px-6 py-14 text-center text-slate-400">
          No fee plans yet. Use <span className="text-amber-400">New fee plan</span> to define a fee structure and apply it
          to a batch.
        </div>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <Card key={t.id}>
          <div className="px-5 py-5">
            <div className="font-semibold text-white" style={{ fontFamily: display }}>
              {t.title}
            </div>
            <div className="mt-1 text-xs text-slate-500">{t.batchName ? t.batchName : "Whole coaching"}</div>
            <div className="mt-4 flex items-end justify-between">
              <div className="text-2xl font-extrabold text-white" style={{ fontFamily: display }}>
                {inr(t.totalAmount)}
              </div>
              <Pill tone="slate">{t.plans} students</Pill>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── New plan modal (batch template OR single student) ────────────────────────────
type DraftInstallment = { label: string; amount: string; dueDate: string };

function NewPlanModal({
  batches,
  students,
  onClose,
  onDone,
}: {
  batches: Batch[];
  students: StudentOpt[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [target, setTarget] = useState<"batch" | "student">("batch");
  const [batchId, setBatchId] = useState<string>(""); // "" = whole coaching
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [installments, setInstallments] = useState<DraftInstallment[]>([{ label: "Installment 1", amount: "", dueDate: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false); // synchronous double-submit guard (see RecordPaymentModal)

  const total = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const setRow = (idx: number, patch: Partial<DraftInstallment>) =>
    setInstallments((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () =>
    setInstallments((rows) => [...rows, { label: `Installment ${rows.length + 1}`, amount: "", dueDate: "" }]);
  const removeRow = (idx: number) => setInstallments((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setSaving(true);
    try {
      const payloadInstallments = installments.map((r) => ({
        label: r.label.trim(),
        amount: Number(r.amount),
        dueDate: r.dueDate,
      }));
      let res: Response;
      if (target === "student") {
        res = await fetch("/api/coaching/fees/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, title, installments: payloadInstallments }),
        });
      } else {
        res = await fetch("/api/coaching/fees/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, batchId: batchId || null, installments: payloadInstallments }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "could not save the plan");
        submitting.current = false;
        return;
      }
      onDone();
    } catch {
      setError("network error — try again");
      submitting.current = false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New fee plan" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Apply to">
          <div className="flex gap-2">
            <SegBtn on={target === "batch"} onClick={() => setTarget("batch")}>
              A batch
            </SegBtn>
            <SegBtn on={target === "student"} onClick={() => setTarget("student")}>
              One student
            </SegBtn>
          </div>
        </Field>

        {target === "batch" ? (
          <Field label="Batch">
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputCls}>
              <option value="">Whole coaching</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.students})
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Student">
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputCls} required>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.batchName ? ` · ${s.batchName}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Class 8 — 2026-27"
            required
            className={inputCls}
          />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm text-slate-300">Installments</label>
            <span className="text-xs text-slate-500">Total {inr(total)}</span>
          </div>
          <div className="space-y-2">
            {installments.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.label}
                  onChange={(e) => setRow(i, { label: e.target.value })}
                  placeholder="Label"
                  className={`${inputCls} flex-1`}
                />
                <input
                  value={r.amount}
                  onChange={(e) => setRow(i, { amount: e.target.value })}
                  placeholder="₹"
                  inputMode="numeric"
                  className={`${inputCls} w-24`}
                />
                <input
                  type="date"
                  value={r.dueDate}
                  onChange={(e) => setRow(i, { dueDate: e.target.value })}
                  className={`${inputCls} w-40`}
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.06] hover:text-red-400 disabled:opacity-30"
                  disabled={installments.length === 1}
                  aria-label="Remove installment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow} className="mt-2 text-sm font-semibold text-amber-400 hover:underline">
            + Add installment
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={saving}>
            {saving ? "Saving…" : target === "student" ? "Create plan" : "Create & apply"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function SegBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition"
      style={
        on
          ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
          : { background: "rgba(255,255,255,0.04)", color: "#c9ced8", border: "1px solid rgba(255,255,255,0.07)" }
      }
    >
      {children}
    </button>
  );
}

// ── Record payment modal ─────────────────────────────────────────────────────────
function RecordPaymentModal({
  row,
  onClose,
  onPaid,
}: {
  row: FeeDuesRow;
  onClose: () => void;
  onPaid: (paymentId: string) => void;
}) {
  // Default to the first installment that still has a balance.
  const firstDue = row.installments.find((i) => i.due > 0);
  const [installmentId, setInstallmentId] = useState<string>(firstDue?.id ?? "");
  const initialAmount = firstDue ? firstDue.due : row.due;
  const [amount, setAmount] = useState<string>(String(initialAmount || ""));
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Synchronous re-entrancy guard: `saving` only disables the button on the next
  // render, so a fast double-click can fire two POSTs (each issuing its own
  // receipt). The ref blocks the second call immediately.
  const submitting = useRef(false);

  function pickInstallment(id: string) {
    setInstallmentId(id);
    const inst = row.installments.find((i) => i.id === id);
    setAmount(String((inst ? inst.due : row.due) || ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/coaching/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: row.planId,
          installmentId: installmentId || null,
          amount: Number(amount),
          method,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "could not record the payment");
        submitting.current = false;
        return;
      }
      onPaid(data.paymentId); // navigates away; keep the guard latched
    } catch {
      setError("network error — try again");
      submitting.current = false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Record payment — ${row.studentName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Towards">
          <select value={installmentId} onChange={(e) => pickInstallment(e.target.value)} className={inputCls}>
            <option value="">General / advance</option>
            {row.installments.map((i: FeeInstallmentRow) => (
              <option key={i.id} value={i.id} disabled={i.due <= 0}>
                {i.label} — {inr(i.due)} left · due {fmtDate(i.due_date)}
                {i.due <= 0 ? " (paid)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              required
              className={inputCls}
            />
          </Field>
          <Field label="Method">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>

        <Field label="Note (optional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paid by father" className={inputCls} />
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={saving}>
            {saving ? "Saving…" : "Record & receipt"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── shared modal shell (mirrors StudentsClient) ──────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[18px] border p-6"
        style={{ background: "#0f1218", borderColor: "rgba(255,255,255,0.07)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: display }}>
            {title}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.06]">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
