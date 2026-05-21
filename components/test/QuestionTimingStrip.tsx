"use client";

import { useState } from "react";
import { BE } from "@/lib/theme";
import { fmtTime, plainPreview, type ResultData } from "./testAnalysisHelpers";

export default function QuestionTimingStrip({ questions }: { questions: ResultData["questions"] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!questions?.length) return null;

  const times = questions.map(q => q.timeSpentSecs || 0);
  const maxTime = Math.max(...times, 1);
  const sqrtMax = Math.sqrt(maxTime) || 1;
  const MAX_H = 84;
  const avgTime = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  const medianTime = [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)];

  const hovered = hoverIdx !== null ? questions[hoverIdx] : null;
  const hoveredStatus = hovered
    ? hovered.user_answer === null ? "skipped" : hovered.is_correct ? "correct" : "incorrect"
    : null;
  const hoveredStatusColor = hoveredStatus === "correct" ? BE.good
    : hoveredStatus === "incorrect" ? BE.bad : BE.textMute;

  return (
    <section className="be-card p-6 md:p-8 border" style={{ borderColor: BE.line }}>
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-5">
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pacing · Time × Result
          </div>
          <div style={{ fontSize: 12, color: BE.textDim, marginTop: 4 }}>
            Bar height = time spent. Color = result. Hover for details.
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 11, color: BE.textMute }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: BE.good, display: "inline-block" }} />
            Correct
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: BE.bad, display: "inline-block" }} />
            Wrong
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: BE.textMute, opacity: 0.5, display: "inline-block" }} />
            Skipped
          </span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: Math.max(questions.length * 8, 320) }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: MAX_H }}>
            {questions.map((q, i) => {
              const t = q.timeSpentSecs || 0;
              const h = t > 0 ? Math.max(3, (Math.sqrt(t) / sqrtMax) * MAX_H) : 3;
              const status = q.user_answer === null ? "skipped" : q.is_correct ? "correct" : "incorrect";
              const color = status === "correct" ? BE.good : status === "incorrect" ? BE.bad : BE.textMute;
              const baseOpacity = status === "skipped" ? 0.35 : 1;
              const opacity = hoverIdx === null ? baseOpacity : hoverIdx === i ? 1 : baseOpacity * 0.4;

              return (
                <div
                  key={q.id}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  style={{
                    flex: "1 1 0",
                    minWidth: 6,
                    height: h,
                    background: color,
                    opacity,
                    borderRadius: "2px 2px 0 0",
                    transition: "opacity 0.12s",
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 2, marginTop: 6, fontSize: 10, color: BE.textMute, fontFamily: BE.mono }}>
            {questions.map((_, i) => {
              const showTick = i === 0 || (i + 1) % 5 === 0 || i === questions.length - 1;
              return (
                <div key={i} style={{ flex: "1 1 0", minWidth: 6, textAlign: "center" }}>
                  {showTick ? i + 1 : ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-5 pt-4 border-t flex items-center gap-4 flex-wrap"
        style={{ borderColor: BE.line, fontSize: 11.5, color: BE.textMute, minHeight: 28 }}
      >
        {hovered && hoveredStatus ? (
          <>
            <span style={{ fontFamily: BE.mono, color: BE.text, fontWeight: 700 }}>Q{(hoverIdx ?? 0) + 1}</span>
            <span style={{
              flex: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              color: BE.textDim,
            }}>
              {plainPreview(hovered.question_text).slice(0, 110) || "—"}
            </span>
            <span style={{ fontFamily: BE.mono, color: BE.text, fontWeight: 600 }}>{fmtTime(hovered.timeSpentSecs)}</span>
            <span style={{
              fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4,
              padding: "3px 8px", borderRadius: 4,
              color: hoveredStatusColor, background: hoveredStatusColor + "22",
            }}>
              {hoveredStatus}
            </span>
          </>
        ) : (
          <>
            <span>Avg <span style={{ color: BE.text, fontFamily: BE.mono, fontWeight: 600 }}>{fmtTime(avgTime)}</span></span>
            <span>Median <span style={{ color: BE.text, fontFamily: BE.mono, fontWeight: 600 }}>{fmtTime(medianTime)}</span></span>
            <span>Slowest <span style={{ color: BE.text, fontFamily: BE.mono, fontWeight: 600 }}>{fmtTime(maxTime)}</span></span>
          </>
        )}
      </div>
    </section>
  );
}
