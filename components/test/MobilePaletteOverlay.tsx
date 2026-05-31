"use client";

import { BE } from "@/lib/theme";
import PaletteGrid, { PalCount } from "./PaletteGrid";
import { type QStatus, type TestQuestion } from "./testEngineTypes";

interface Counts {
  answered: number;
  answeredReview: number;
  review: number;
  notAnswered: number;
  notVisited: number;
}

interface Props {
  questions: TestQuestion[];
  statuses: Record<string, QStatus>;
  currentQId: string;
  counts: Counts;
  onGoTo: (q: TestQuestion) => void;
  onClose: () => void;
  onSubmitClick: () => void;
}

export default function MobilePaletteOverlay({
  questions, statuses, currentQId, counts, onGoTo, onClose, onSubmitClick,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-72 h-full p-5 flex flex-col gap-4 overflow-y-auto"
        style={{ background: BE.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          All Questions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          <PalCount n={counts.answered} l="Answered" c={BE.good} />
          <PalCount n={counts.notAnswered} l="Not answered" c={BE.text} />
          <PalCount n={counts.review} l="Marked" c={BE.warn} />
          <PalCount n={counts.answeredReview} l="Ans + marked" c={BE.warn} dot />
          <PalCount n={counts.notVisited} l="Not visited" c={BE.textMute} />
        </div>
        <PaletteGrid
          questions={questions}
          allQuestions={questions}
          statuses={statuses}
          currentQId={currentQId}
          onGoTo={onGoTo}
        />
        <button
          onClick={() => { onClose(); onSubmitClick(); }}
          className="be-btn be-btn-primary w-full"
          style={{ justifyContent: "center", display: "flex" }}
        >
          Submit test
        </button>
        <button onClick={onClose} className="be-btn w-full" style={{ justifyContent: "center", display: "flex" }}>Close</button>
      </div>
    </div>
  );
}
