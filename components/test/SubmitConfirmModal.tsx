"use client";

import { Loader2 } from "lucide-react";
import { BE } from "@/lib/theme";

interface Props {
  totalQuestions: number;
  answeredCount: number;
  reviewCount: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function SubmitConfirmModal({
  totalQuestions, answeredCount, reviewCount, submitting, onCancel, onConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-8 border" style={{ background: BE.surface, borderColor: BE.line }}>
        <div style={{ fontFamily: BE.serif, fontSize: 24, fontWeight: 600, marginBottom: 6, color: BE.text }}>Submit your test?</div>
        <div style={{ fontSize: 14, color: BE.textDim, marginBottom: 24 }}>
          You have {totalQuestions - answeredCount - reviewCount} questions remaining. You cannot change your answers after submitting.
        </div>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-4 rounded-xl border text-center" style={{ borderColor: BE.line }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: BE.good, fontFamily: BE.mono }}>{answeredCount}</div>
            <div style={{ fontSize: 11, color: BE.textMute }}>Answered</div>
          </div>
          <div className="p-4 rounded-xl border text-center" style={{ borderColor: BE.line }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: BE.warn, fontFamily: BE.mono }}>{reviewCount}</div>
            <div style={{ fontSize: 11, color: BE.textMute }}>Flagged</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 be-btn" style={{ height: 48 }}>Resume</button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 be-btn be-btn-primary flex items-center justify-center gap-2"
            style={{ height: 48, background: BE.bad, borderColor: BE.bad }}
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : "Yes, Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
