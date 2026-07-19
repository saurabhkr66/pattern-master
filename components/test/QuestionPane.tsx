"use client";

import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";
import { getCloudinaryUrl } from "@/lib/imageUtils";
import { useLanguage } from "@/components/providers/LanguageProvider";
import SubjectiveAnswerInput from "./SubjectiveAnswerInput";
import { optionLetters, type TestQuestion } from "./testEngineTypes";

interface Props {
  question: TestQuestion;
  globalIdx: number;
  totalQuestions: number;
  curMcq: string | null;
  curMsq: string[];
  curNat: string;
  curSubj?: string[];
  isReviewed: boolean;
  isBookmarked: boolean;
  submitError: string | null;
  onMcq: (q: TestQuestion, letter: string) => void;
  onMsq: (q: TestQuestion, letter: string) => void;
  onNat: (q: TestQuestion, val: string) => void;
  onSubjPhotos?: (q: TestQuestion, keys: string[]) => void;
  // Present only for coaching tests with subjective questions.
  subjectiveUpload?: { endpoint: string; attemptId: string };
  onToggleBookmark: (q: TestQuestion) => void;
  onToggleReview: (q: TestQuestion) => void;
  onClearResponse: (q: TestQuestion) => void;
  onMarkReviewAndNext: (q: TestQuestion) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function QuestionPane({
  question: currentQ, globalIdx, totalQuestions,
  curMcq, curMsq, curNat, curSubj = [], isReviewed, isBookmarked, submitError,
  onMcq, onMsq, onNat, onSubjPhotos, subjectiveUpload,
  onToggleBookmark, onToggleReview, onClearResponse, onMarkReviewAndNext,
  onPrev, onNext,
}: Props) {
  const negMarking = currentQ.question_type === "MCQ"
    ? `−${(currentQ.marks / 3).toFixed(2)} if wrong`
    : null;

  // Bilingual: show the EN/हिन्दी toggle only when this question carries Hindi.
  // Empty Hindi fields fall back to English (mirrors QuestionViewer).
  const { language, setLanguage } = useLanguage();
  const useHi = language === "hi";
  const hasHindi = !!(
    currentQ.question_text_hindi ||
    (currentQ.options_hindi && currentQ.options_hindi.length)
  );
  const displayText =
    useHi && currentQ.question_text_hindi ? currentQ.question_text_hindi : currentQ.question_text;
  const displayOptions =
    useHi && currentQ.options_hindi && currentQ.options_hindi.length
      ? currentQ.options_hindi
      : currentQ.options;

  return (
    <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="qp-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "22px 28px" }}>
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
          {hasHindi && (
            <span style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 7, background: "rgba(255,255,255,0.05)", border: `1px solid ${BE.line}` }}>
              {(["en", "hi"] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => setLanguage(lng)}
                  style={{
                    padding: "2px 8px", fontSize: 10, fontWeight: 700, borderRadius: 5,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    background: language === lng ? BE.accent : "transparent",
                    color: language === lng ? "#fff" : BE.textDim,
                  }}
                >
                  {lng === "en" ? "EN" : "हिन्दी"}
                </button>
              ))}
            </span>
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
          {currentQ.images && Array.isArray(currentQ.images) && (currentQ.images as { type?: string }[]).some((img) => img?.type !== "explanation") && (
            <div className="mb-6 flex flex-col gap-4">
              {(currentQ.images as { index: number; filename: string; type?: string }[]).filter((img) => img?.type !== "explanation").map((img) => (
                <div
                  key={img.index}
                  className="flex justify-center rounded-xl p-3 border shadow-sm overflow-hidden"
                  style={{ background: BE.surface, borderColor: BE.line }}
                >
                  <img
                    src={getCloudinaryUrl(img.filename)}
                    alt=""
                    className="rounded-lg object-contain w-full"
                    style={{ maxHeight: 400, height: "auto" }}
                  />
                </div>
              ))}
            </div>
          )}
          <MathRenderer content={displayText} />
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
          {currentQ.question_type === "SUBJECTIVE" ? (
            subjectiveUpload && onSubjPhotos ? (
              <SubjectiveAnswerInput
                question={currentQ}
                attemptId={subjectiveUpload.attemptId}
                uploadEndpoint={subjectiveUpload.endpoint}
                keys={curSubj}
                onChange={onSubjPhotos}
              />
            ) : (
              <p style={{ fontSize: 13, color: BE.textMute }}>
                Written-answer question — answer on paper as instructed.
              </p>
            )
          ) : currentQ.question_type === "NAT" ? (
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
            displayOptions?.map((opt, oi) => {
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
      <div
        className="px-3 sm:px-7 gap-2 sm:gap-2.5"
        style={{
          borderTop: `1px solid ${BE.line}`, paddingTop: 12, paddingBottom: 12,
          background: "var(--bg-base)", display: "flex", alignItems: "center", flexShrink: 0,
        }}
      >
        <button
          onClick={onPrev}
          disabled={globalIdx === 0}
          className="be-btn"
          style={{ opacity: globalIdx === 0 ? 0.35 : 1, flexShrink: 0 }}
        >
          ←<span className="hidden sm:inline"> Previous</span>
        </button>
        <button onClick={() => onClearResponse(currentQ)} className="be-btn" style={{ flexShrink: 0 }}>
          Clear<span className="hidden sm:inline"> response</span>
        </button>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => onMarkReviewAndNext(currentQ)}
          className="be-btn"
          style={{ flexShrink: 0 }}
        >
          <span className="hidden sm:inline">Save &amp; mark for review</span>
          <span className="sm:hidden">Review</span>
        </button>
        <button
          onClick={onNext}
          disabled={globalIdx === totalQuestions - 1}
          className="be-btn be-btn-primary"
          style={{ padding: "8px 16px", opacity: globalIdx === totalQuestions - 1 ? 0.35 : 1, flexShrink: 0 }}
        >
          <span className="hidden sm:inline">Save &amp; next</span>
          <span className="sm:hidden">Next</span> →
        </button>
      </div>
    </main>
  );
}
