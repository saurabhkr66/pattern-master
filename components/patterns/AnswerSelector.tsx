"use client";

import MathRenderer from "@/components/ui/MathRenderer";
import { getCloudinaryUrl } from "@/lib/imageUtils";
import { BE } from "@/lib/theme";

interface AnswerSelectorProps {
  question: any;
  language: string;
  selectedAnswer: string | null;
  msqSelections: string[];
  natValue: string;
  isRevealed: boolean;
  checkIsCorrect: () => boolean;
  onSelectAnswer: (letter: string) => void;
  onToggleMsq: (letter: string) => void;
  onNatChange: (val: string) => void;
  onNatSubmit: () => void;
}

export default function AnswerSelector({
  question, language, selectedAnswer, msqSelections, natValue,
  isRevealed, checkIsCorrect,
  onSelectAnswer, onToggleMsq, onNatChange, onNatSubmit,
}: AnswerSelectorProps) {
  const type = question.question_type;

  return (
    <>
      {/* Question Images */}
      {question.images && Array.isArray(question.images) && question.images.filter((img: any) => img.type !== "explanation").length > 0 && (
        <div className="flex flex-col gap-4 mb-8">
          {question.images.filter((img: any) => img.type !== "explanation").map((img: any, idx: number) => (
            <div key={idx} className="flex justify-center rounded-xl p-3 border shadow-sm overflow-hidden" style={{ background: BE.surface, borderColor: BE.line, maxHeight: 320, minHeight: 160 }}>
              <img src={getCloudinaryUrl(img.url || img.filename) || img.base64} alt="Question figure" className="max-w-full rounded-lg object-contain" style={{ maxHeight: 294, width: "auto" }} />
            </div>
          ))}
        </div>
      )}

      {/* MCQ / MSQ */}
      {(type === "MCQ" || type === "MSQ" || !type) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {question.options.map((option: string, i: number) => {
            const letter = option.trim().charAt(0).toUpperCase();
            const isSelected = type === "MSQ" ? msqSelections.includes(letter) : selectedAnswer === letter;
            const isActuallyCorrect = isRevealed && question.correct_answer.includes(letter);
            const isWrong = isRevealed && isSelected && !isActuallyCorrect;

            const bg = isActuallyCorrect ? BE.goodSoft : isWrong ? BE.badSoft : isSelected ? BE.accentSoft : BE.surface;
            const bd = isActuallyCorrect ? BE.good : isWrong ? BE.bad : isSelected ? BE.accent : BE.line;

            return (
              <div
                key={i}
                onClick={() => !isRevealed && (type === "MSQ" ? onToggleMsq(letter) : onSelectAnswer(letter))}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", border: `1.5px solid ${bd}`, borderRadius: 12,
                  background: bg, cursor: isRevealed ? "default" : "pointer",
                  transition: "all 0.15s ease", minWidth: 0,
                }}
                className={!isRevealed ? "hover:border-amber-500/50" : ""}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: isSelected || isActuallyCorrect ? bd : BE.lineSoft,
                  color: isSelected || isActuallyCorrect ? "#fff" : BE.textDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 900, fontFamily: BE.mono,
                }}>{letter}</div>
                <div style={{ fontSize: "clamp(13px, 3.5vw, 15px)", color: BE.text, flex: 1, minWidth: 0, overflowWrap: "break-word", wordBreak: "break-word" }}>
                  <MathRenderer content={option.includes(".") ? option.split(".").slice(1).join(".").trim() : option} />
                </div>
                {isActuallyCorrect && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={BE.good} strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M3 8l3.5 3.5L13 5"/></svg>}
                {isWrong && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={BE.bad} strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M4 4l8 8M12 4l-8 8"/></svg>}
              </div>
            );
          })}
        </div>
      )}

      {/* NAT */}
      {type === "NAT" && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter numerical answer…"
            value={natValue}
            onChange={(e) => onNatChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && natValue.trim() && !isRevealed) onNatSubmit();
            }}
            disabled={isRevealed}
            className="w-full p-5 border-2 rounded-2xl focus:border-amber-400 focus:outline-none font-black text-center text-xl"
            style={{ background: BE.lineSoft, borderColor: BE.line, color: BE.text }}
          />
          {isRevealed && (
            <div
              style={{ background: checkIsCorrect() ? BE.goodSoft : BE.badSoft, border: `1px solid ${checkIsCorrect() ? BE.good : BE.bad}`, color: checkIsCorrect() ? BE.good : BE.bad }}
              className="p-4 rounded-xl text-center font-bold text-sm"
            >
              Correct Answer: {question.correct_answer}
            </div>
          )}
        </div>
      )}
    </>
  );
}
