"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";

const inputCls =
  "w-full rounded-xl border bg-[var(--bg-surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-amber-500";
const labelCls = "block text-sm font-medium text-[var(--text-secondary)]";

export default function ApplyForm() {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/coaching/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactName, ownerEmail, phone, city }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h3 className="mt-3 text-lg font-bold text-[var(--text-primary)]">Application received</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          We review every coaching personally. Once approved, sign in at{" "}
          <span className="font-mono text-[var(--text-primary)]">/coaching-admin/login</span> with{" "}
          <span className="font-semibold text-[var(--text-primary)]">{ownerEmail}</span> to set up your batches and tests.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
      <label className="block">
        <span className={labelCls}>Coaching name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={`mt-1.5 ${inputCls}`} placeholder="e.g. Sharma Classes" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Your name</span>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={`mt-1.5 ${inputCls}`} placeholder="Contact person" />
        </label>
        <label className="block">
          <span className={labelCls}>City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={`mt-1.5 ${inputCls}`} placeholder="Optional" />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Email</span>
        <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required className={`mt-1.5 ${inputCls}`} placeholder="you@example.com" />
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          You&apos;ll sign in with this email once approved.
        </span>
      </label>
      <label className="block">
        <span className={labelCls}>Phone</span>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={`mt-1.5 ${inputCls}`} placeholder="WhatsApp number works best" />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white transition-all hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? "Submitting…" : "Apply for access"}
        {!saving && <ArrowRight size={15} />}
      </button>
    </form>
  );
}
