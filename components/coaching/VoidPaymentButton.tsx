"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

// Admin-only reversal control on the receipt page. Confirms, calls the void
// endpoint, then refreshes the server component so the VOIDED stamp + recomputed
// balances show immediately. When already voided it renders a static notice.
export default function VoidPaymentButton({
  paymentId,
  voided,
}: {
  paymentId: string;
  voided: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (voided) {
    return (
      <p className="text-center text-sm font-semibold text-red-400">
        This payment was voided — it no longer counts toward the student’s dues.
      </p>
    );
  }

  async function voidPayment() {
    if (saving) return;
    if (!window.confirm("Void this payment? It will be reversed and excluded from the student’s dues. The receipt number is kept for the record.")) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/coaching/fees/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ void: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "could not void the payment");
        return;
      }
      router.refresh();
    } catch {
      setError("network error — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={voidPayment}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-red-400 transition hover:brightness-110 disabled:opacity-50"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
      >
        <Ban className="h-[18px] w-[18px] " /> {saving ? "Voiding…" : "Void payment"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
