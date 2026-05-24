"use client";

import { Clock, BarChart3, Loader2, CheckCircle2, CloudOff } from "lucide-react";
import { fmtTimer, type ExamConfig } from "@/lib/examConfigs";
import { BE } from "@/lib/theme";
import { sectionQuestions, type TestQuestion } from "./testEngineTypes";

interface Props {
  mockTestTitle: string;
  config: ExamConfig;
  branch?: string;
  questions: TestQuestion[];
  activeSectionIdx: number;
  onSectionChange: (idx: number, firstQId: string | null) => void;
  draftId: string | null;
  saveStatus: "saved" | "saving" | "error" | null;
  timeLeft: number;
  onTogglePalette: () => void;
}

export default function TestHeaderBar({
  mockTestTitle, config, branch, questions,
  activeSectionIdx, onSectionChange,
  draftId, saveStatus, timeLeft, onTogglePalette,
}: Props) {
  const sections = config.sections;
  const multiSection = sections.length > 1;
  const timerColor = timeLeft < 600 ? BE.bad : timeLeft < 1800 ? BE.warn : BE.text;

  return (
    <header style={{ height: 56, borderBottom: `1px solid ${BE.line}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 8, background: BE.surface, flexShrink: 0, minWidth: 0 }}>
      {/* Title — hidden on mobile to save space */}
      <div className="hidden sm:block" style={{ fontFamily: BE.serif, fontSize: 15, fontWeight: 600, color: BE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
        {mockTestTitle} · {config.label}{branch ? ` ${branch}` : ""}
      </div>

      {multiSection && (
        <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--bg-base)", borderRadius: 7, border: `1px solid ${BE.line}`, flexShrink: 0 }}>
          {sections.map((sec, i) => {
            const active = i === activeSectionIdx;
            return (
              <button
                key={i}
                onClick={() => {
                  const firstQ = sectionQuestions(questions, i)[0];
                  onSectionChange(i, firstQ?.id ?? null);
                }}
                style={{ padding: "4px 10px", fontSize: 11.5, borderRadius: 5, color: active ? BE.text : BE.textDim, background: active ? "rgba(255,255,255,0.08)" : "transparent", cursor: "pointer", fontWeight: 500, border: "none" }}
              >
                {sec.name}
              </button>
            );
          })}
        </div>
      )}

      <span style={{ flex: 1 }} />

      {draftId && (
        <div className="hidden sm:flex items-center gap-1.5" style={{ fontSize: 11, color: saveStatus === "error" ? BE.bad : BE.textMute }}>
          {saveStatus === "saving" && <Loader2 size={11} className="animate-spin" />}
          {saveStatus === "saved" && <CheckCircle2 size={11} style={{ color: BE.good }} />}
          {saveStatus === "error" && <CloudOff size={11} />}
          <span>{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : ""}</span>
        </div>
      )}

      <button className="be-btn hidden sm:flex" style={{ padding: "5px 10px", fontSize: 11.5 }}>Calculator</button>
      <button className="be-btn hidden sm:flex" style={{ padding: "5px 10px", fontSize: 11.5 }}>Instructions</button>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: `${timerColor}15`, border: `1px solid ${timerColor}33`, borderRadius: 8, flexShrink: 0 }}>
        <Clock size={12} style={{ color: timerColor }} />
        <span style={{ fontFamily: BE.mono, fontSize: 13, fontWeight: 600, color: timerColor }}>{fmtTimer(timeLeft)}</span>
      </div>

      {/* Palette toggle — mobile only, always visible */}
      <button
        onClick={onTogglePalette}
        className="lg:hidden"
        style={{ padding: "7px 8px", borderRadius: 8, border: `1px solid ${BE.line}`, background: "transparent", color: BE.textDim, flexShrink: 0, display: "flex", alignItems: "center" }}
      >
        <BarChart3 size={18} />
      </button>
    </header>
  );
}
