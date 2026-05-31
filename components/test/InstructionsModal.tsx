"use client";

import { X } from "lucide-react";
import { BE } from "@/lib/theme";
import { type ExamConfig } from "@/lib/examConfigs";
import { getMarkingRows } from "./mockTestUtils";
import type { ExamType } from "@/lib/examConfigs";

interface Props {
  config: ExamConfig;
  examType: ExamType | null;
  onClose: () => void;
}

export default function InstructionsModal({ config, examType, onClose }: Props) {
  const markingRows = getMarkingRows(config, examType);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border flex flex-col"
        style={{ background: BE.surface, borderColor: BE.line, maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: BE.line }}
        >
          <div style={{ fontFamily: BE.serif, fontSize: 20, fontWeight: 600, color: BE.text }}>
            Instructions
          </div>
          <button
            onClick={onClose}
            className="be-btn"
            style={{ padding: "5px 8px" }}
            aria-label="Close instructions"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Marking scheme */}
          {markingRows.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Marking scheme
              </div>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: BE.line }}>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: "1fr 1fr 1.4fr",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.03)",
                    fontFamily: BE.mono, fontSize: 10, fontWeight: 700,
                    color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.06em",
                  }}
                >
                  <div>Type</div>
                  <div>Correct</div>
                  <div>Wrong</div>
                </div>
                {markingRows.map((row) => (
                  <div
                    key={row.type}
                    className="grid"
                    style={{
                      gridTemplateColumns: "1fr 1fr 1.4fr",
                      padding: "9px 12px",
                      borderTop: `1px solid ${BE.line}`,
                      fontFamily: BE.mono, fontSize: 12, color: BE.text,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{row.type}</div>
                    <div style={{ color: BE.good }}>{row.marks}</div>
                    <div style={{ color: row.neg.startsWith("−") ? BE.bad : BE.textDim }}>{row.neg}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Palette legend */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Question palette
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { c: BE.good, l: "Answered", dot: false },
                { c: BE.text, l: "Not answered (visited)", dot: false },
                { c: BE.warn, l: "Marked for review", dot: false },
                { c: BE.warn, l: "Answered & marked for review (counted)", dot: true },
                { c: BE.textMute, l: "Not visited", dot: false },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: BE.textDim }}>
                  <span style={{ position: "relative", width: 12, height: 12, flexShrink: 0 }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: 3, background: row.c, opacity: 0.55 }} />
                    {row.dot && (
                      <span style={{ position: "absolute", top: -3, right: -3, width: 6, height: 6, borderRadius: 3, background: BE.good, border: `1px solid ${BE.surface}` }} />
                    )}
                  </span>
                  {row.l}
                </div>
              ))}
            </div>
          </div>

          {/* General instructions */}
          {config.instructions?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                General
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 0, listStyle: "none" }}>
                {config.instructions.map((ins, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.5, color: BE.textDim }}>
                    <span style={{ color: BE.accent, flexShrink: 0 }}>•</span>
                    {ins}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: BE.line }}>
          <button
            onClick={onClose}
            className="be-btn be-btn-primary w-full"
            style={{ justifyContent: "center", display: "flex", padding: "10px" }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
