"use client";

import Image from "next/image";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";
import { getCloudinaryUrl } from "@/lib/imageUtils";
import { optionLetters, type TestQuestion } from "./testEngineTypes";

interface Props {
  question: TestQuestion;
  globalIdx: number;
  totalQuestions: number;
  curMcq: string | null;
  curMsq: string[];
  curNat: string;
  isReviewed: boolean;
  isBookmarked: boolean;
  submitError: string | null;
  currentIdx: number;
  sectionQsLength: number;
  onMcq: (q: TestQuestion, letter: string) => void;
  onMsq: (q: TestQuestion, letter: string) => void;
  onNat: (q: TestQuestion, val: string) => void;
  onToggleBookmark: (q: TestQuestion) => void;
  onToggleReview: (q: TestQuestion) => void;
  onClearResponse: (q: TestQuestion) => void;
  onMarkReviewAndNext: (q: TestQuestion) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function QuestionPane({
  question: currentQ, globalIdx, totalQuestions,
  curMcq, curMsq, curNat, isReviewed, isBookmarked, submitError,
  currentIdx, sectionQsLength,
  onMcq, onMsq, onNat,
  onToggleBookmark, onToggleReview, onClearResponse, onMarkReviewAndNext,
  onPrev, onNext,
}: Props) {
  const negMarking = currentQ.question_type === "MCQ"
    ? `−${(currentQ.marks / 3).toFixed(2)} if wrong`
    : null;

  return (
    <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="qp-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", padding: "22px 28px" }}>
        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontFamily: BE.mono, fontSize: 12, color: BE.textDim }}>
            Q {globalIdx + 1} / {totalQuestions}
          </span>
          <span style={{
            fontSize: 11, padding: "3px 7px", borderRadius: 5,
            background: BE.accentSoft, color: BE.accent,
            fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            {currentQ.question_type} · {currentQ.marks} marks
          </span>
          {negMarking && (
            <span style={{ fontSize: 11, color: BE.textMute }}>{negMarking}</span>
          )}
          <span style={{ flex: 1 }} />
          <button
            onClick={() => onToggleBookmark(currentQ)}
            className="be-btn"
            style={{ padding: "4px 9px", fontSize: 11 }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill={isBookmarked ? BE.warn : "none"} stroke={BE.warn} strokeWidth="1.4" style={{ marginRight: 4, display: "inline" }}>
              <path d="M3 1v10l3-2 3 2V1z" />
            </svg>
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </button>
          <button
            onClick={() => onToggleReview(currentQ)}
            className="be-btn"
            style={{
              padding: "4px 9px", fontSize: 11,
              background: isReviewed ? BE.warn + "18" : undefined,
              borderColor: isReviewed ? BE.warn + "55" : undefined,
              color: isReviewed ? BE.warn : undefined,
            }}
          >
            {isReviewed ? "Unmark review" : "Mark for review"}
          </button>
        </div>

        {/* Question text */}
        <div className="qp-qtext" style={{ fontFamily: BE.serif, fontSize: 19, lineHeight: 1.55, color: BE.text, marginBottom: 22 }}>
          {currentQ.images && Array.isArray(currentQ.images) && currentQ.images.length > 0 && (
            <div className="mb-6 flex flex-col gap-4">
              {(currentQ.images as { index: number; filename: string }[]).map((img) => (
                <div
                  key={img.index}
                  className="flex justify-center rounded-xl p-3 border shadow-sm overflow-hidden"
                  style={{ background: BE.surface, borderColor: BE.line, maxHeight: 320, minHeight: 160 }}
                >
                  <Image
                    src={getCloudinaryUrl(img.filename)}
                    alt=""
                    width={800}
                    height={600}
                    sizes="(max-width: 768px) 100vw, 800px"
                    className="rounded-lg object-contain"
                    style={{ maxHeight: 294, width: "auto", height: "auto" }}
                  />
                </div>
              ))}
            </div>
          )}
          <MathRenderer content={currentQ.question_text} />
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
          {currentQ.question_type === "NAT" ? (
            <div className="max-w-[200px]">
              <input
                type="number" step="any" autoFocus
                value={curNat} onChange={(e) => onNat(currentQ, e.target.value)}
                placeholder="Value…"
                className="w-full px-4 py-3 rounded-xl border text-lg font-bold focus:outline-none"
                style={{ background: BE.surface, borderColor: curNat ? BE.accent : BE.line, color: BE.text, fontFamily: BE.mono }}
              />
              <div className="mt-2 text-[11px]" style={{ color: BE.textMute }}>Enter exact numeric value.</div>
            </div>
          ) : (
            currentQ.options?.map((opt, oi) => {
              const letter = optionLetters[oi];
              const isMSQ = currentQ.question_type === "MSQ";
              const selected = isMSQ ? curMsq.includes(letter) : curMcq === letter;
              return (
                <div
                  key={oi}
                  onClick={() => isMSQ ? onMsq(currentQ, letter) : onMcq(currentQ, letter)}
                  style={{
                    display: "flex", gap: 12, padding: "12px 14px", borderRadius: 9,
                    border: `1px solid ${selected ? BE.accent : BE.line}`,
                    background: selected ? BE.accentSoft : BE.surface,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: BE.mono, fontSize: 12, fontWeight: 700,
                    background: selected ? BE.accent : "rgba(255,255,255,0.05)",
                    color: selected ? "#fff" : BE.textDim,
                    border: `1px solid ${selected ? BE.accent : BE.line}`,
                  }}>
                    {letter}
                  </div>
                  <div style={{ fontSize: 14, color: selected ? BE.text : BE.textDim, paddingTop: 3 }}>
                    <MathRenderer content={typeof opt === "string" ? opt.replace(/^[A-E]\.\s*/, "") : String(opt)} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {submitError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-xs border border-red-500/30">{submitError}</div>
        )}
      </div>

      {/* Bottom action bar */}
      <div style={{
        borderTop: `1px solid ${BE.line}`, padding: "12px 28px",
        background: "var(--bg-base)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <button
          onClick={onPrev}
          disabled={currentIdx === 0}
          className="be-btn"
          style={{ opacity: currentIdx === 0 ? 0.35 : 1 }}
        >
          ← Previous
        </button>
        <button onClick={() => onClearResponse(currentQ)} className="be-btn">
          Clear response
        </button>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => onMarkReviewAndNext(currentQ)}
          className="be-btn"
        >
          Save &amp; mark for review
        </button>
        <button
          onClick={onNext}
          disabled={currentIdx === sectionQsLength - 1}
          className="be-btn be-btn-primary"
          style={{ padding: "8px 16px", opacity: currentIdx === sectionQsLength - 1 ? 0.35 : 1 }}
        >
          Save &amp; next →
        </button>
      </div>
    </main>
  );
}
