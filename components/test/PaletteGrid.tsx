"use client";

import { BE } from "@/lib/theme";
import { type QStatus, type TestQuestion } from "./testEngineTypes";

const STATUS_LABEL: Record<QStatus, string> = {
  unseen: "Not visited",
  skipped: "Not answered",
  answered: "Answered",
  review: "Marked for review",
  answeredReview: "Answered & marked for review",
};

interface PalCountProps { n: number; l: string; c: string; dot?: boolean }

export function PalCount({ n, l, c, dot }: PalCountProps) {
  return (
    <div style={{ padding: "6px 8px", border: `1px solid ${BE.line}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: 4, background: c }} />
        {dot && (
          <span style={{ position: "absolute", top: -2, right: -2, width: 5, height: 5, borderRadius: 3, background: BE.good, border: `1px solid ${BE.surface}` }} />
        )}
      </span>
      <span style={{ fontFamily: BE.mono, fontWeight: 600, fontSize: 12, color: BE.text }}>{n}</span>
      <span style={{ color: BE.textDim, fontSize: 10.5 }}>{l}</span>
    </div>
  );
}

interface Props {
  questions: TestQuestion[];
  allQuestions: TestQuestion[];
  statuses: Record<string, QStatus>;
  currentQId: string;
  onGoTo: (q: TestQuestion) => void;
}

export default function PaletteGrid({ questions, allQuestions, statuses, currentQId, onGoTo }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {questions.map((q) => {
        const globalI = allQuestions.findIndex((x) => x.id === q.id);
        const st = statuses[q.id];
        const isCur = q.id === currentQId;
        const reviewLike = st === "review" || st === "answeredReview";
        const bg = isCur ? BE.accent
          : reviewLike ? BE.warn + "38"
          : st === "answered" ? BE.good + "38"
          : st === "skipped" ? "rgba(255,255,255,0.08)"
          : "transparent";
        const borderColor = isCur ? BE.accent
          : reviewLike ? BE.warn + "88"
          : st === "answered" ? BE.good + "88"
          : BE.line;
        const color = isCur ? "#fff"
          : reviewLike ? BE.warn
          : st === "answered" ? BE.good
          : st === "skipped" ? BE.text
          : BE.textDim;
        return (
          <button
            key={q.id}
            onClick={() => onGoTo(q)}
            title={STATUS_LABEL[st ?? "unseen"]}
            style={{
              position: "relative",
              height: 28, borderRadius: 5,
              fontFamily: BE.mono, fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", background: bg,
              border: `1px solid ${borderColor}`, color,
              transition: "all 0.15s",
            }}
          >
            {globalI + 1}
            {/* Green dot = answered AND flagged for review (counted for evaluation) */}
            {st === "answeredReview" && (
              <span style={{
                position: "absolute", top: -3, right: -3,
                width: 8, height: 8, borderRadius: 4,
                background: BE.good, border: `1.5px solid ${BE.surface}`,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
