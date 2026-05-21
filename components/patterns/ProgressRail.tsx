"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { BE } from "@/lib/theme";

interface ProgressRailProps {
  questionHistory: any[];
  questionQueue: any[];
  seconds: number;
  isFullscreen: boolean;
  onBack: () => void;
  onToggleFullscreen: () => void;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ProgressRail({
  questionHistory, questionQueue, seconds, isFullscreen,
  onBack, onToggleFullscreen,
}: ProgressRailProps) {
  const total = questionHistory.length + questionQueue.length + 1;
  const current = questionHistory.length + 1;

  return (
    <div style={{
      borderBottom: `1px solid ${BE.line}`,
      padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 10,
      background: isFullscreen ? "transparent" : BE.lineSoft,
      flexWrap: "nowrap", minWidth: 0,
    }}>
      <div
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 5, color: BE.textDim, fontSize: 12, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3L5 7l4 4"/></svg>
        <span className="hidden sm:inline">Back</span>
      </div>
      <div style={{ width: 1, height: 14, background: BE.line, flexShrink: 0 }} />

      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: BE.textDim, fontFamily: BE.mono, flexShrink: 0 }}>{current}/{total}</div>
        <div style={{ flex: 1, height: 3, background: BE.lineSoft, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${(current / total) * 100}%`, height: "100%", background: BE.accent, transition: "width 0.3s ease" }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: BE.textDim, fontFamily: BE.mono }}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7.5" r="5"/><path d="M7 4.5v3l2 1.5M7 1v1.5"/></svg>
          {formatTime(seconds)}
        </div>
        <div style={{ width: 1, height: 14, background: BE.line }} />
        <button
          onClick={onToggleFullscreen}
          className="hover:text-amber-500 transition-colors p-1"
          style={{ fontSize: 11, fontWeight: 700, color: BE.textDim, display: "flex", alignItems: "center", gap: 3 }}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span className="hidden md:inline" style={{ fontSize: 10 }}>{isFullscreen ? "Exit" : "Focus"}</span>
        </button>
      </div>
    </div>
  );
}
