"use client";

import { useState } from "react";

interface ReportModalProps {
  questionId: string;
  isPyq?: boolean;
  isSubjectPyq?: boolean;
  onClose: () => void;
  onReported: () => void;
  onRequireSignIn: () => void;
  isSignedIn: boolean;
}

const REPORT_REASONS = ["Incorrect Answer", "Typo / Formatting Issue", "Explanation is wrong", "Other"] as const;

export default function ReportModal({ questionId, isPyq, isSubjectPyq, onClose, onReported, onRequireSignIn, isSignedIn }: ReportModalProps) {
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const handleSubmit = async () => {
    if (!reportReason) return;
    if (!isSignedIn) { onClose(); onRequireSignIn(); return; }
    setIsReporting(true);
    try {
      await fetch("/api/questions/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, isPyq, isSubjectPyq, reason: reportReason, details: reportDetails }),
      });
      onReported();
      onClose();
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" x2="4" y1="22" y2="15"></line>
            </svg>
          </div>
          <h3 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Report Issue</h3>
        </div>

        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>What seems to be the problem with this question?</p>

        <div className="flex flex-col gap-2 mb-4">
          {REPORT_REASONS.map(r => (
            <label key={r} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ border: `1px solid ${reportReason === r ? "var(--accent)" : "transparent"}`, background: reportReason === r ? "var(--bg-surface-2)" : "transparent" }}>
              <input type="radio" name="report_reason" checked={reportReason === r} onChange={() => setReportReason(r)} className="accent-amber-500 w-4 h-4" />
              <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: reportReason === r ? 600 : 500 }}>{r}</span>
            </label>
          ))}
        </div>

        {reportReason === "Other" && (
          <textarea
            placeholder="Please describe the issue (optional)..."
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            className="w-full p-3 rounded-xl mb-4 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
            rows={3}
          />
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!reportReason || isReporting}
            className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-50 transition-transform active:scale-95 flex justify-center items-center"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
          >
            {isReporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
