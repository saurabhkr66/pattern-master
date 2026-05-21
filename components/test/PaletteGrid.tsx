"use client";

import { BE } from "@/lib/theme";
import { type QStatus, type TestQuestion } from "./testEngineTypes";

interface PalCountProps { n: number; l: string; c: string }

export function PalCount({ n, l, c }: PalCountProps) {
  return (
    <div style={{ padding: "6px 8px", border: `1px solid ${BE.line}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c, flexShrink: 0 }} />
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
        const bg = isCur ? BE.accent
          : st === "answered" ? BE.good + "38"
          : st === "review" ? BE.warn + "38"
          : st === "skipped" ? "rgba(255,255,255,0.08)"
          : "transparent";
        const borderColor = isCur ? BE.accent
          : st === "answered" ? BE.good + "88"
          : st === "review" ? BE.warn + "88"
          : BE.line;
        const color = isCur ? "#fff"
          : st === "answered" ? BE.good
          : st === "review" ? BE.warn
          : BE.textDim;
        return (
          <button
            key={q.id}
            onClick={() => onGoTo(q)}
            style={{
              height: 28, borderRadius: 5,
              fontFamily: BE.mono, fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", background: bg,
              border: `1px solid ${borderColor}`, color,
              transition: "all 0.15s",
            }}
          >
            {globalI + 1}
          </button>
        );
      })}
    </div>
  );
}
