"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

// Print + back controls for the receipt page. Marked `.no-print` so they vanish
// from the printed sheet (see the print CSS in FeeReceipt). The back link is
// configurable so the same controls serve the admin receipt (back to the fees
// dashboard) and the student receipt (back to /c/[slug]/fees).
export default function ReceiptActions({
  backHref = "/coaching-admin/fees",
  backLabel = "Back to fees",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="no-print mb-6 flex items-center justify-between">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
        style={{ background: "linear-gradient(135deg,#fb923c 0%,#f59e0b 100%)", color: "#1a1205" }}
      >
        <Printer className="h-[18px] w-[18px]" /> Print / Save PDF
      </button>
    </div>
  );
}
