"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  X,
  ExternalLink,
  Trash2,
  FileQuestion,
  Copy,
  Check,
  Users,
  List,
  FileText,
  UserPlus,
  Mail,
  MapPin,
  Wallet,
  IndianRupee,
  PlusCircle,
  ChevronDown,
} from "lucide-react";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

// Neutral (no blue tint) field input matching the coaching module surfaces.
const ccInput =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-500/60";

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
  subjective_enabled: boolean;
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
  const [copied, setCopied] = useState<string | null>(null);

  function copyJoinCode(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  }

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

  // Grant/revoke subjective (photo-answer, AI-graded) tests for a coaching. Off
  // by default; flip on only for coachings that ask, since each subjective
  // submission costs paid Gemini grading.
  async function toggleSubjective(c: Coaching) {
    const res = await fetch(`/api/admin/coachings/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectiveEnabled: !c.subjective_enabled }),
    });
    if (res.ok) {
      setCoachings((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, subjective_enabled: !c.subjective_enabled } : x))
      );
    }
  }

  return (
    <div className="min-h-screen bg-black p-8 md:min-h-[125vh] md:[zoom:0.80]">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-4 text-4xl font-bold tracking-tight text-white">
          <span className="h-9 w-1.5 rounded-full bg-amber-500" />
          Coachings
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/questions"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/[0.06]"
          >
            <FileQuestion className="h-4 w-4 text-slate-400" /> All questions
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400"
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
      <div className="mt-6 hidden overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent md:block">
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr className="border-b border-white/[0.07]">
                <th className="px-6 py-5 font-medium">Name</th>
                <th className="px-6 py-5 font-medium">Join Code</th>
                <th className="px-6 py-5 font-medium">Owner</th>
                <th className="px-6 py-5 font-medium">Students</th>
                <th className="px-6 py-5 font-medium">Pricing</th>
                <th className="px-6 py-5 font-medium">Status</th>
                <th className="px-6 py-5 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {live.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No coachings yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                live.map((c) => (
                  <tr key={c.id} className="text-slate-200 transition-colors hover:bg-white/[0.02]">
                    {/* Name + avatar */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20">
                          <Users className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-white">{c.name}</div>
                          <a
                            href={`/c/${c.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400"
                          >
                            /c/{c.slug} <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Join code */}
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                        <span className="font-mono text-sm font-semibold tracking-wide text-amber-400">
                          {c.join_code}
                        </span>
                        <button
                          onClick={() => copyJoinCode(c.join_code)}
                          className="text-slate-500 hover:text-slate-200"
                          title="Copy join code"
                        >
                          {copied === c.join_code ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-6 py-5 text-slate-300">{c.owner_email ?? "—"}</td>

                    {/* Students */}
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-slate-200">
                        <Users className="h-4 w-4 text-slate-400" />
                        {c._count.students}
                      </span>
                    </td>

                    {/* Pricing */}
                    <td className="px-6 py-5 font-semibold text-white">{priceLabel(c)}</td>

                    {/* Status */}
                    <td className="px-6 py-5">
                      <button
                        onClick={() => toggleActive(c)}
                        className="inline-flex items-center gap-2 text-sm font-medium"
                        title={c.active ? "Active — click to deactivate" : "Inactive — click to activate"}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            c.active ? "bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/60" : "bg-slate-500"
                          }`}
                        />
                        <span className={c.active ? "text-emerald-400" : "text-slate-400"}>
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleSubjective(c)}
                          title={c.subjective_enabled ? "Subjective grading enabled — click to disable" : "Enable subjective (AI-graded) tests for this coaching"}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                            c.subjective_enabled
                              ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-400 hover:bg-amber-500/[0.14]"
                              : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                          }`}
                        >
                          <List className="h-4 w-4" />
                          Subjective {c.subjective_enabled ? "on" : "off"}
                        </button>
                        <Link
                          href={`/admin/coachings/${c.id}/bills`}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/[0.06]"
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          Bills
                        </Link>
                        <button
                          disabled={busy === c.id}
                          onClick={() => manage(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm font-semibold text-amber-400 hover:bg-white/[0.06] disabled:opacity-50"
                        >
                          Manage →
                        </button>
                        <button
                          disabled={busy === c.id}
                          onClick={() => setConfirmDelete(c)}
                          className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 text-slate-500 hover:bg-white/[0.06] hover:text-red-400 disabled:opacity-50"
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
                <div className="text-slate-500">Subjective</div>
                <div className="text-right">
                  <button
                    onClick={() => toggleSubjective(c)}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.subjective_enabled ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.06] text-slate-400"
                    }`}
                  >
                    {c.subjective_enabled ? "On" : "Off"}
                  </button>
                </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-6 w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#08090d] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400">
              <UserPlus className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">New Coaching</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-400 hover:bg-white/[0.07] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Create a new coaching to start assigning tests and managing students.
        </p>

        {created ? (
          <div className="mt-5 space-y-3 text-sm text-slate-200">
            <p className="font-semibold text-emerald-400">Coaching created.</p>
            <p>
              Public page: <span className="font-mono">/c/{created.slug}</span>
            </p>
            <p>
              Join code: <span className="font-mono text-lg text-amber-400">{created.join_code}</span>
            </p>
            <p className="text-slate-400">
              Share the join code with students. The owner can sign in at{" "}
              <span className="font-mono">/coaching-admin/login</span> using the owner email.
            </p>
            <button
              onClick={onCreated}
              className="mt-2 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 py-3 font-bold text-black hover:from-amber-300 hover:to-amber-400"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            {/* Coaching name */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <label className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <UserPlus className="h-4 w-4 text-amber-400" /> Coaching name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter coaching name"
                className={`mt-2.5 ${ccInput}`}
              />
            </div>

            {/* Owner email */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <label className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <Mail className="h-4 w-4 text-amber-400" /> Owner email
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
                placeholder="Enter owner email"
                className={`mt-2.5 ${ccInput}`}
              />
              <p className="mt-2 text-xs text-slate-500">
                They claim the coaching on first sign-in with this email.
              </p>
            </div>

            {/* City */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <label className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <MapPin className="h-4 w-4 text-amber-400" /> City (optional)
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city (optional)"
                className={`mt-2.5 ${ccInput}`}
              />
            </div>

            {/* Billing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <label className="flex items-center gap-2 text-[15px] font-semibold text-white">
                  <Wallet className="h-4 w-4 text-amber-400" /> Billing mode
                </label>
                <div className="relative mt-2.5">
                  <select
                    value={billingMode}
                    onChange={(e) => setBillingMode(e.target.value as "per_test" | "monthly")}
                    className={`${ccInput} appearance-none pr-9`}
                  >
                    <option value="per_test">Per submitted test</option>
                    <option value="monthly">Flat monthly fee</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              {billingMode === "monthly" ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <label className="flex items-center gap-2 text-[15px] font-semibold text-white">
                    <IndianRupee className="h-4 w-4 text-amber-400" /> per month
                  </label>
                  <input type="number" min={0} value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} className={`mt-2.5 ${ccInput}`} />
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <label className="flex items-center gap-2 text-[15px] font-semibold text-white">
                    <IndianRupee className="h-4 w-4 text-amber-400" /> per test
                  </label>
                  <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={`mt-2.5 ${ccInput}`} />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 py-3.5 text-base font-bold text-black shadow-lg shadow-amber-500/25 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50"
            >
              <PlusCircle className="h-5 w-5" /> {saving ? "Creating…" : "Create coaching"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
