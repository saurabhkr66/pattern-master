"use client";

import { BE } from "@/lib/theme";
import { type ExamConfig } from "@/lib/examConfigs";
import PaletteGrid, { PalCount } from "./PaletteGrid";
import { sectionQuestions, type QStatus, type TestQuestion } from "./testEngineTypes";

interface Counts {
  answered: number;
  review: number;
  visited: number;
  notVisited: number;
}

interface Props {
  config: ExamConfig;
  questions: TestQuestion[];
  statuses: Record<string, QStatus>;
  currentQId: string;
  currentQSubject: string;
  branch?: string;
  userName?: string;
  userInitials: string;
  counts: Counts;
  onGoTo: (q: TestQuestion) => void;
  onSubmitClick: () => void;
}

export default function PalettePanel({
  config, questions, statuses, currentQId, currentQSubject, branch,
  userName, userInitials, counts, onGoTo, onSubmitClick,
}: Props) {
  const sections = config.sections;
  const multiSection = sections.length > 1;

  return (
    <aside
      className="hidden lg:flex flex-col"
      style={{
        width: 280, minHeight: 0, borderLeft: `1px solid ${BE.line}`,
        background: BE.surface, overflow: "hidden",
      }}
    >
      {/* Pinned top: user info + counts + label */}
      <div style={{ flexShrink: 0, padding: "20px 16px 12px", display: "flex", flexDirection: "column", gap: 14, borderBottom: `1px solid ${BE.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16, background: BE.accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 600, fontSize: 13, flexShrink: 0,
          }}>
            {userInitials}
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: BE.text }}>{userName ?? "Student"}</div>
            <div style={{ fontSize: 10.5, color: BE.textMute }}>Subject · {branch ?? currentQSubject}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          <PalCount n={counts.answered} l="Answered" c={BE.good} />
          <PalCount n={counts.review} l="Review" c={BE.warn} />
          <PalCount n={counts.visited} l="Visited" c={BE.textDim} />
          <PalCount n={counts.notVisited} l="Not visited" c={BE.textMute} />
        </div>

        <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
          All questions
        </div>
      </div>

      {/* Scrollable question grid */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px" }}>
        {multiSection
          ? sections.map((sec, si) => (
            <div key={si} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: BE.textMute, fontWeight: 700, marginBottom: 6, opacity: 0.7 }}>{sec.name}</div>
              <PaletteGrid
                questions={sectionQuestions(questions, si)}
                allQuestions={questions}
                statuses={statuses}
                currentQId={currentQId}
                onGoTo={onGoTo}
              />
            </div>
          ))
          : <PaletteGrid
              questions={questions}
              allQuestions={questions}
              statuses={statuses}
              currentQId={currentQId}
              onGoTo={onGoTo}
            />
        }
      </div>

      {/* Pinned bottom: submit */}
      <div style={{ flexShrink: 0, padding: "12px 16px 20px", borderTop: `1px solid ${BE.line}` }}>
        <button
          onClick={onSubmitClick}
          className="be-btn be-btn-primary"
          style={{ width: "100%", padding: "10px 12px", fontSize: 13, justifyContent: "center", display: "flex" }}
        >
          Submit test
        </button>
      </div>
    </aside>
  );
}
