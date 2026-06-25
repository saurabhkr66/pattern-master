// The printable white receipt sheet, shared by the admin receipt page and the
// student-facing one. The `note` field is admin-only (it may hold internal
// remarks like "waived ₹200, parent disputed"), so the student view simply
// omits it by not passing the prop.

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export type FeeReceiptProps = {
  coachingName: string;
  receiptNo: string; // already zero-padded, e.g. "00042"
  dateStr: string; // localized date
  studentName: string;
  phone?: string | null;
  planTitle: string;
  towards: string;
  method: string; // already humanized ("Cash", "UPI", …)
  amount: number;
  balance: number;
  note?: string | null; // admin-only; never passed from the student view
  voided?: boolean; // admin-only; stamps the sheet VOIDED (students never see voided receipts)
};

export default function FeeReceipt({
  coachingName,
  receiptNo,
  dateStr,
  studentName,
  phone,
  planTitle,
  towards,
  method,
  amount,
  balance,
  note,
  voided = false,
}: FeeReceiptProps) {
  return (
    <>
      {/* Print rules: hide everything but the receipt sheet, reset to light ink. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            body * { visibility: hidden !important; }
            #fee-receipt, #fee-receipt * { visibility: visible !important; }
            #fee-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
            .no-print { display: none !important; }
          }`,
        }}
      />

      <div
        id="fee-receipt"
        className="relative overflow-hidden rounded-2xl bg-white p-8 text-slate-900 shadow-2xl"
        // print-color-adjust keeps the (light grey) watermark from being stripped
        // when the browser prints / saves to PDF, which drops backgrounds by default.
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        {/* Diagonal tiled watermark — cosmetic deterrent / authenticity mark, NOT
            copy protection. Sits behind the content; aria-hidden + non-selectable. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 flex flex-col gap-7"
            style={{ width: "150%", transform: "translate(-50%,-50%) rotate(-30deg)", opacity: 0.05 }}
          >
            {Array.from({ length: 10 }).map((_, r) => (
              <div key={r} className="whitespace-nowrap text-center text-2xl font-extrabold uppercase tracking-[0.3em] text-slate-900">
                {Array.from({ length: 6 }).map((_, c) => (
                  <span key={c} className="mx-5">
                    {coachingName}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* VOIDED stamp — admin-only (the student view never renders a voided
            receipt). Diagonal red overlay so a printed copy is clearly reversed. */}
        {voided && (
          <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <span
              className="select-none rounded-xl border-4 px-8 py-2 text-5xl font-extrabold uppercase tracking-[0.2em]"
              style={{ color: "rgba(220,38,38,0.55)", borderColor: "rgba(220,38,38,0.55)", transform: "rotate(-18deg)" }}
            >
              Voided
            </span>
          </div>
        )}

        <div className="relative">
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div>
            <div className="text-xl font-extrabold tracking-tight">{coachingName}</div>
            <div className="mt-0.5 text-sm text-slate-500">Fee Receipt</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-400">Receipt No.</div>
            <div className="font-mono text-lg font-bold">#{receiptNo}</div>
            <div className="mt-1 text-sm text-slate-500">{dateStr}</div>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <Line label="Received from" value={studentName} />
          {phone && <Line label="Phone" value={phone} />}
          <Line label="Fee plan" value={planTitle} />
          <Line label="Towards" value={towards} />
          <Line label="Payment method" value={method} />
          {note && <Line label="Note" value={note} />}
        </dl>

        <div className="mt-6 rounded-xl bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Amount received</span>
            <span className="text-2xl font-extrabold text-slate-900">{inr(amount)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Balance remaining</span>
            <span className="font-semibold text-slate-700">{inr(balance)}</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          This is a computer-generated receipt and does not require a signature.
        </p>
        </div>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
