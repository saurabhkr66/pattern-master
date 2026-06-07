"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Bill = {
  period: string;
  submissions: number;
  amount: number;
  status: "due" | "paid";
  paid_at: string | null;
};

type Pricing = {
  billing_mode: "per_test" | "monthly";
  price: number;
  monthly_fee: number;
};

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

const MONTH_FMT = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function BillsClient({
  coachingId,
  coachingName,
}: {
  coachingId: string;
  coachingName: string;
}) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/coachings/${coachingId}/bills`);
    const data = await res.json();
    if (res.ok) {
      setBills(data.bills);
      setPricing({
        billing_mode: data.coaching.billing_mode,
        price: data.coaching.price,
        monthly_fee: data.coaching.monthly_fee,
      });
    }
    setLoading(false);
  }, [coachingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(period: string, status: "due" | "paid") {
    setBusy(period);
    const res = await fetch(`/api/admin/coachings/${coachingId}/bills`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, status }),
    });
    setBusy(null);
    if (res.ok) {
      setBills((prev) => prev.map((b) => (b.period === period ? { ...b, status } : b)));
    }
  }

  async function savePricing(next: Pricing) {
    setSavingPricing(true);
    const res = await fetch(`/api/admin/coachings/${coachingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billingMode: next.billing_mode,
        pricePerTest: next.price,
        monthlyFee: next.monthly_fee,
      }),
    });
    setSavingPricing(false);
    if (res.ok) {
      setEditing(false);
      setLoading(true);
      await load(); // amounts depend on mode/price → re-derive from the server
    }
  }

  const totalDue = bills.filter((b) => b.status === "due").reduce((s, b) => s + b.amount, 0);

  return (
    <div className="p-8">
      <Link
        href="/admin/coachings"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to coachings
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Bills — {coachingName}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Outstanding (due):{" "}
            <span className="font-semibold text-amber-400">₹{totalDue}</span>
          </p>
        </div>
      </div>

      {pricing && (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
          {editing ? (
            <PricingEditor
              initial={pricing}
              saving={savingPricing}
              onCancel={() => setEditing(false)}
              onSave={savePricing}
            />
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-slate-500">Billing: </span>
                <span className="font-semibold text-white">
                  {pricing.billing_mode === "monthly"
                    ? `Flat ₹${pricing.monthly_fee}/month`
                    : `₹${pricing.price} per submitted test`}
                </span>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-sm font-semibold text-amber-400 hover:underline"
              >
                Edit pricing
              </button>
            </div>
          )}
        </div>
      )}

      {/* Desktop: table. Mobile: stacked cards (below). */}
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 font-medium">Submissions</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No submissions billed yet.
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b.period} className="text-slate-200">
                  <td className="px-4 py-3">{MONTH_FMT.format(new Date(b.period))}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{b.submissions}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-white">₹{b.amount}</td>
                  <td className="px-4 py-3">
                    {b.status === "paid" ? (
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        Paid
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        Due
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "due" ? (
                      <button
                        disabled={busy === b.period}
                        onClick={() => setStatus(b.period, "paid")}
                        className="text-sm font-semibold text-emerald-400 hover:underline disabled:opacity-50"
                      >
                        Mark paid
                      </button>
                    ) : (
                      <button
                        disabled={busy === b.period}
                        onClick={() => setStatus(b.period, "due")}
                        className="text-sm font-semibold text-amber-400 hover:underline disabled:opacity-50"
                      >
                        Mark due
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 md:hidden">
        {loading ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">Loading…</p>
        ) : bills.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">
            No submissions billed yet.
          </p>
        ) : (
          bills.map((b) => (
            <div key={b.period} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{MONTH_FMT.format(new Date(b.period))}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">
                    {b.submissions} submissions · <span className="font-semibold text-white">₹{b.amount}</span>
                  </p>
                </div>
                {b.status === "paid" ? (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">Paid</span>
                ) : (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">Due</span>
                )}
              </div>
              <div className="mt-3 text-right">
                {b.status === "due" ? (
                  <button
                    disabled={busy === b.period}
                    onClick={() => setStatus(b.period, "paid")}
                    className="text-sm font-semibold text-emerald-400 hover:underline disabled:opacity-50"
                  >
                    Mark paid
                  </button>
                ) : (
                  <button
                    disabled={busy === b.period}
                    onClick={() => setStatus(b.period, "due")}
                    className="text-sm font-semibold text-amber-400 hover:underline disabled:opacity-50"
                  >
                    Mark due
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PricingEditor({
  initial,
  saving,
  onCancel,
  onSave,
}: {
  initial: Pricing;
  saving: boolean;
  onCancel: () => void;
  onSave: (p: Pricing) => void;
}) {
  const [mode, setMode] = useState<"per_test" | "monthly">(initial.billing_mode);
  const [price, setPrice] = useState(String(initial.price));
  const [monthlyFee, setMonthlyFee] = useState(String(initial.monthly_fee));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="block flex-1">
        <span className="text-sm text-slate-300">Billing mode</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "per_test" | "monthly")}
          className={`mt-1 ${inputCls}`}
        >
          <option value="per_test">Per submitted test</option>
          <option value="monthly">Flat monthly fee</option>
        </select>
      </label>
      <label className="block flex-1">
        <span className="text-sm text-slate-300">{mode === "monthly" ? "₹ per month" : "₹ per test"}</span>
        <input
          type="number"
          min={0}
          value={mode === "monthly" ? monthlyFee : price}
          onChange={(e) => (mode === "monthly" ? setMonthlyFee(e.target.value) : setPrice(e.target.value))}
          className={`mt-1 ${inputCls}`}
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          disabled={saving}
          onClick={() =>
            onSave({ billing_mode: mode, price: Number(price), monthly_fee: Number(monthlyFee) })
          }
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
