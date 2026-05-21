"use client";

import { BE } from "@/lib/theme";

const kbdStyle = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  minWidth: 18, height: 18, padding: "0 5px",
  border: `1.2px solid ${BE.line}`, borderRadius: 4,
  background: BE.lineSoft, color: BE.textDim,
  fontFamily: BE.mono, fontSize: 10, fontWeight: 800,
};

interface ActionRowProps {
  question: any;
  isRevealed: boolean;
  selectedAnswer: string | null;
  msqSelections: string[];
  natValue: string;
  questionHistory: any[];
  questionQueue: any[];
  onPrevious: () => void;
  onSkip: () => void;
  onSubmit: () => void;
  onNext: () => void;
}

export default function ActionRow({
  question, isRevealed,
  selectedAnswer, msqSelections, natValue,
  questionHistory, questionQueue,
  onPrevious, onSkip, onSubmit, onNext,
}: ActionRowProps) {
  const type = question.question_type || "MCQ";

  const submitDisabled =
    type === "MCQ" ? !selectedAnswer :
    type === "MSQ" ? msqSelections.length === 0 :
    !natValue.trim();

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BE.line}` }}>
      {!isRevealed ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: BE.textMute, fontWeight: 700, textTransform: "uppercase" }} className="hidden md:flex mr-auto">
            <kbd style={kbdStyle}>A</kbd><kbd style={kbdStyle}>B</kbd><kbd style={kbdStyle}>C</kbd><kbd style={kbdStyle}>D</kbd>
            <span style={{ marginLeft: 4 }}>Select</span>
            <kbd style={{ ...kbdStyle, minWidth: 32 }}>ENTER</kbd>
            <span style={{ marginLeft: 4 }}>Submit</span>
          </div>
          <div className="hidden md:block flex-1" />
          <button onClick={onPrevious} disabled={questionHistory.length === 0} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30">Prev</button>
          <button onClick={onSkip} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Skip</button>
          {(type === "MCQ" || type === "MSQ" || type === "NAT") && (
            <button
              onClick={onSubmit}
              disabled={submitDisabled}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          )}
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider bg-amber-600 text-white shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
          >
            {questionQueue.length > 0 ? "Next Question" : "Finish Review"}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 10l3-3-3-3"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
