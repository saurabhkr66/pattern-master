"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, ExternalLink, Trash2, FileQuestion } from "lucide-react";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

type Coaching = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  owner_email: string | null;
  join_code: string;
  status: string; // "pending" | "approved" | "rejected"
  applicant_name: string | null;
  applicant_phone: string | null;
  billing_mode: string; // "per_test" | "monthly"
  price_per_test: number;
  monthly_fee: number;
  active: boolean;
  created_at: string;
  _count: { students: number; tests: number };
};

// How a coaching is billed, shown in the list. e.g. "₹15/test" or "₹500/mo".
function priceLabel(c: Coaching): string {
  return c.billing_mode === "monthly" ? `₹${c.monthly_fee}/mo` : `₹${c.price_per_test}/test`;
}

export default function AdminCoachingsClient({
  initialCoachings,
}: {
  initialCoachings: Coaching[];
}) {
  const router = useRouter();
  const [coachings, setCoachings] = useState(initialCoachings);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Coaching | null>(null);
  const [approving, setApproving] = useState<Coaching | null>(null);

  const pending = coachings.filter((c) => c.status === "pending");
  const live = coachings.filter((c) => c.status !== "pending");

  async function manage(id: string) {
    setBusy(id);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coachingId: id }),
    });
    setBusy(null);
    if (res.ok) router.push("/coaching-admin");
  }

  async function deleteCoaching(c: Coaching) {
    setBusy(c.id);
    const res = await fetch(`/api/admin/coachings/${c.id}`, { method: "DELETE" });
    setBusy(null);
    setConfirmDelete(null);
    if (res.ok) {
      setCoachings((prev) => prev.filter((x) => x.id !== c.id));
    }
  }

  async function approve(
    c: Coaching,
    pricing: { billingMode: "per_test" | "monthly"; pricePerTest: number; monthlyFee: number }
  ) {
    setBusy(c.id);
    const res = await fetch(`/api/admin/coachings/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", ...pricing }),
    });
    setBusy(null);
    if (res.ok) {
      setApproving(null);
      setCoachings((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? {
                ...x,
                status: "approved",
                active: true,
                billing_mode: pricing.billingMode,
                price_per_test: pricing.pricePerTest,
                monthly_fee: pricing.monthlyFee,
              }
            : x
        )
      );
    }
  }

  async function reject(c: Coaching) {
    setBusy(c.id);
    const res = await fetch(`/api/admin/coachings/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    setBusy(null);
    if (res.ok) {
      setCoachings((prev) => prev.filter((x) => x.id !== c.id));
    }
  }

  async function toggleActive(c: Coaching) {
    const res = await fetch(`/api/admin/coachings/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    if (res.ok) {
      setCoachings((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x))
      );
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Coachings</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/questions"
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            <FileQuestion className="h-4 w-4" /> All questions
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            <Plus className="h-4 w-4" /> New Coaching
          </button>
        </div>
      </div>

      {/* Pending applications — self-serve signups awaiting approval */}
      {pending.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
          <h2 className="mb-3 text-sm font-semibold text-amber-400">
            Pending applications ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <div className="font-semibold text-white">{c.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {c.applicant_name ? `${c.applicant_name} · ` : ""}
                    {c.owner_email}
                    {c.applicant_phone ? ` · ${c.applicant_phone}` : ""}
                    {c.city ? ` · ${c.city}` : ""}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Applied {new Date(c.created_at).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    disabled={busy === c.id}
                    onClick={() => reject(c)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    disabled={busy === c.id}
                    onClick={() => setApproving(c)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Join code</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Students</th>
              <th className="px-4 py-3 font-medium">Pricing</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {live.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No coachings yet. Create one to get started.
                </td>
              </tr>
            ) : (
              live.map((c) => (
                <tr key={c.id} className="text-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <a
                      href={`/c/${c.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400"
                    >
                      /c/{c.slug} <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{c.join_code}</td>
                  <td className="px-4 py-3 text-slate-400">{c.owner_email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{c._count.students}</td>
                  <td className="px-4 py-3 text-slate-400">{priceLabel(c)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        c.active
                          ? "bg-green-900/50 text-green-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {c.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-4">
                      <Link
                        href={`/admin/coachings/${c.id}/bills`}
                        className="text-sm text-slate-300 hover:text-amber-400 hover:underline"
                      >
                        Bills
                      </Link>
                      <button
                        disabled={busy === c.id}
                        onClick={() => manage(c.id)}
                        className="text-sm text-amber-400 hover:underline disabled:opacity-50"
                      >
                        Manage →
                      </button>
                      <button
                        disabled={busy === c.id}
                        onClick={() => setConfirmDelete(c)}
                        className="text-slate-500 hover:text-red-400 disabled:opacity-50"
                        title="Delete coaching"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="mt-6 space-y-3 md:hidden">
        {live.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-sm text-slate-500">
            No coachings yet. Create one to get started.
          </div>
        ) : (
          live.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-white">{c.name}</div>
                  <a
                    href={`/c/${c.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400"
                  >
                    /c/{c.slug} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <button
                  onClick={() => toggleActive(c)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    c.active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-slate-400"
                  }`}
                >
                  {c.active ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-slate-500">Join code</div>
                <div className="text-right font-mono text-slate-300">{c.join_code}</div>
                <div className="text-slate-500">Owner</div>
                <div className="truncate text-right text-slate-300">{c.owner_email ?? "—"}</div>
                <div className="text-slate-500">Students</div>
                <div className="text-right text-slate-300">{c._count.students}</div>
                <div className="text-slate-500">Pricing</div>
                <div className="text-right text-slate-300">{priceLabel(c)}</div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
                <button
                  disabled={busy === c.id}
                  onClick={() => setConfirmDelete(c)}
                  className="text-slate-500 hover:text-red-400 disabled:opacity-50"
                  title="Delete coaching"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-5">
                  <Link
                    href={`/admin/coachings/${c.id}/bills`}
                    className="text-sm font-medium text-slate-300 hover:text-amber-400"
                  >
                    Bills
                  </Link>
                  <button
                    disabled={busy === c.id}
                    onClick={() => manage(c.id)}
                    className="text-sm font-semibold text-amber-400 disabled:opacity-50"
                  >
                    Manage →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <CreateCoachingModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Delete coaching?</h2>
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-medium text-white">{confirmDelete.name}</span> and all its
              students, tests, and billing data will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={busy === confirmDelete.id}
                onClick={() => deleteCoaching(confirmDelete)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {busy === confirmDelete.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {approving && (
        <ApproveModal
          coaching={approving}
          busy={busy === approving.id}
          onClose={() => setApproving(null)}
          onApprove={(pricing) => approve(approving, pricing)}
        />
      )}
    </div>
  );
}

function ApproveModal({
  coaching,
  busy,
  onClose,
  onApprove,
}: {
  coaching: Coaching;
  busy: boolean;
  onClose: () => void;
  onApprove: (p: { billingMode: "per_test" | "monthly"; pricePerTest: number; monthlyFee: number }) => void;
}) {
  const [billingMode, setBillingMode] = useState<"per_test" | "monthly">("per_test");
  const [price, setPrice] = useState("15");
  const [monthlyFee, setMonthlyFee] = useState("500");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Approve coaching</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          Set pricing for <span className="font-medium text-white">{coaching.name}</span>. This
          activates the coaching so {coaching.owner_email} can sign in and claim it.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-slate-300">Billing mode</span>
            <select
              value={billingMode}
              onChange={(e) => setBillingMode(e.target.value as "per_test" | "monthly")}
              className={`mt-1 ${inputCls}`}
            >
              <option value="per_test">Per submitted test</option>
              <option value="monthly">Flat monthly fee</option>
            </select>
          </label>
          {billingMode === "monthly" ? (
            <label className="block">
              <span className="text-sm text-slate-300">₹ per month</span>
              <input type="number" min={0} value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} className={`mt-1 ${inputCls}`} />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm text-slate-300">₹ per test</span>
              <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={`mt-1 ${inputCls}`} />
            </label>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() =>
              onApprove({ billingMode, pricePerTest: Number(price), monthlyFee: Number(monthlyFee) })
            }
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Approving…" : "Approve & activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateCoachingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [city, setCity] = useState("");
  const [billingMode, setBillingMode] = useState<"per_test" | "monthly">("per_test");
  const [price, setPrice] = useState("15");
  const [monthlyFee, setMonthlyFee] = useState("500");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ slug: string; join_code: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/coachings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ownerEmail,
          city,
          billingMode,
          pricePerTest: Number(price),
          monthlyFee: Number(monthlyFee),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create");
        return;
      }
      setCreated(data.coaching);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">New Coaching</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {created ? (
          <div className="space-y-3 text-sm text-slate-200">
            <p className="text-green-400">Coaching created.</p>
            <p>
              Public page: <span className="font-mono">/c/{created.slug}</span>
            </p>
            <p>
              Join code: <span className="font-mono text-lg">{created.join_code}</span>
            </p>
            <p className="text-slate-400">
              Share the join code with students. The owner can sign in at{" "}
              <span className="font-mono">/coaching-admin/login</span> using the owner email.
            </p>
            <button
              onClick={onCreated}
              className="mt-2 w-full rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-500"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-300">Coaching name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Owner email</span>
              <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required className={`mt-1 ${inputCls}`} />
              <span className="mt-1 block text-xs text-slate-500">
                They claim the coaching on first sign-in with this email.
              </span>
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">City (optional)</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={`mt-1 ${inputCls}`} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-slate-300">Billing mode</span>
                <select
                  value={billingMode}
                  onChange={(e) => setBillingMode(e.target.value as "per_test" | "monthly")}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="per_test">Per submitted test</option>
                  <option value="monthly">Flat monthly fee</option>
                </select>
              </label>
              {billingMode === "monthly" ? (
                <label className="block">
                  <span className="text-sm text-slate-300">₹ per month</span>
                  <input type="number" min={0} value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} className={`mt-1 ${inputCls}`} />
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm text-slate-300">₹ per test</span>
                  <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={`mt-1 ${inputCls}`} />
                </label>
              )}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create coaching"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
