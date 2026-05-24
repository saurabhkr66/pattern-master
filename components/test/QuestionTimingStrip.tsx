"use client";

import { useState } from "react";
import { BE } from "@/lib/theme";
import { fmtTime, plainPreview, type ResultData } from "./testAnalysisHelpers";

const CHART_H = 200;

// Distinct muted colors for up to 6 sections
const SECTION_COLORS = ["#f5a623", "#b8a0ff", "#6ee7a0", "#f47272", "#60c8ff", "#ffb86c"];

export default function QuestionTimingStrip({ questions }: { questions: ResultData["questions"] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!questions?.length) return null;

  const times = questions.map(q => q.timeSpentSecs || 0);
  const maxTime = Math.max(...times, 60);
  const avgTime = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  const sorted = [...times].sort((a, b) => a - b);
  const medianTime = sorted[Math.floor(sorted.length / 2)];
  const slowCount = times.filter(t => t > 180).length;
  const slowestIdx = times.indexOf(maxTime);

  const yMax = Math.ceil(maxTime / 60) * 60;
  const yTicks = [yMax, Math.round(yMax * 0.75), Math.round(yMax * 0.5), Math.round(yMax * 0.25), 0];

  // Build section index map for color coding
  const sectionOrder: string[] = [];
  questions.forEach(q => {
    if (!sectionOrder.includes(q.subject)) sectionOrder.push(q.subject);
  });

  const active = activeIdx !== null ? questions[activeIdx] : null;
  const activeStatus = active
    ? active.user_answer === null ? "skipped" : active.is_correct ? "correct" : "incorrect"
    : null;
  const activeColor = activeStatus === "correct" ? BE.good : activeStatus === "incorrect" ? BE.bad : "#6b635a";

  return (
    <section className="be-card qt-section" style={{ border: `1px solid ${BE.line}` }}>
      <style>{`
        .qt-section { padding: 28px 28px 24px; }
        .qt-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
        .qt-legend { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
        .qt-subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
        .qt-chart-wrap { display: flex; gap: 0; overflow: hidden; }
        .qt-yaxis {
          width: 36px; flex-shrink: 0;
          display: flex; flex-direction: column; justify-content: space-between;
          font-family: var(--font-mono, monospace); font-size: 10px;
          color: rgba(255,255,255,0.2); padding-bottom: 1px;
        }
        .qt-chart-col { flex: 1; min-width: 0; overflow: hidden; }
        .qt-bars {
          display: flex; align-items: flex-end; gap: 2px;
          border-bottom: 1px solid var(--border);
          position: relative; overflow: hidden;
        }
        .qt-xaxis {
          display: flex; padding-top: 5px;
          font-family: var(--font-mono, monospace); font-size: 10px;
          color: rgba(255,255,255,0.2); overflow: hidden;
        }
        .qt-section-strip {
          display: flex; margin-top: 8px; gap: 2px; overflow: hidden;
        }
        /* Mobile scroll container — no scrollbar */
        .qt-scroll-outer {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .qt-scroll-outer::-webkit-scrollbar { display: none; }
        .qt-scroll-inner { min-width: 100%; }
        .qt-section-label {
          font-family: var(--font-mono, monospace); font-size: 9px;
          letter-spacing: 0.08em; text-transform: uppercase;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          padding: 3px 0;
        }
        .qt-footer {
          display: flex; gap: 24px; margin-top: 20px; padding-top: 16px;
          border-top: 1px solid var(--border);
          font-family: var(--font-mono, monospace); font-size: 12px;
          color: var(--text-secondary); flex-wrap: wrap; align-items: center;
        }
        .qt-detail-card {
          margin-top: 12px; padding: 12px 14px;
          border: 1px solid var(--border); border-radius: 6px;
          background: rgba(255,255,255,0.02);
          display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center;
        }
        .qt-footer-k { display: none; }
        @media (max-width: 639px) {
          .qt-section { padding: 20px 16px 18px; }
          .qt-yaxis { display: none; }
          .qt-subtitle::after { content: ' Tap bars for details.'; }
          .qt-scroll-inner { min-width: 560px; }
          .qt-footer {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            font-size: 10.5px;
          }
          .qt-footer-spacer { display: none; }
          .qt-footer-pill { grid-column: 1 / -1; }
          .qt-footer-k {
            display: block;
            font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
            color: var(--text-muted, #79716a); margin-bottom: 2px;
          }
          .qt-footer > div { display: flex; flex-direction: column; }
        }
      `}</style>

      {/* Header */}
      <div className="qt-header">
        <div style={{ fontFamily: BE.serif, fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em" }}>
          Pacing · <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>time × result</em>
        </div>
        <div className="qt-legend" style={{ fontSize: 12, color: BE.textDim, fontFamily: BE.mono }}>
          {[{ color: BE.good, label: "Correct" }, { color: BE.bad, label: "Wrong" }, { color: "#6b635a", label: "Skipped" }].map(({ color, label }) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: color, display: "inline-block" }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="qt-subtitle" style={{ color: BE.textDim }}>
        Bar height = seconds spent. Color = result. Hover any bar for details.
      </div>

      {/* Chart — horizontally scrollable on mobile, no scrollbar */}
      <div className="qt-scroll-outer">
      <div className="qt-scroll-inner">
      <div className="qt-chart-wrap">
        <div className="qt-yaxis" style={{ height: CHART_H }}>
          {yTicks.map((t, i) => <span key={i}>{t > 0 ? `${t}s` : "0"}</span>)}
        </div>
        <div className="qt-chart-col">
          <div className="qt-bars" style={{ height: CHART_H }}>
            {[0.25, 0.5, 0.75].map(frac => (
              <div key={frac} style={{
                position: "absolute", left: 0, right: 0, bottom: `${frac * 100}%`,
                borderTop: `1px dashed rgba(255,255,255,0.05)`, pointerEvents: "none",
              }} />
            ))}
            {/* Section boundary markers */}
            {questions.map((q, i) => {
              const isFirstOfSection = i === 0 || q.subject !== questions[i - 1].subject;
              if (!isFirstOfSection) return null;
              const secIdx = sectionOrder.indexOf(q.subject);
              const pct = (i / questions.length) * 100;
              return (
                <div key={`sec-${i}`} style={{
                  position: "absolute", left: `${pct}%`, top: 0, bottom: 0,
                  width: 1, background: SECTION_COLORS[secIdx % SECTION_COLORS.length],
                  opacity: 0.3, pointerEvents: "none",
                }} />
              );
            })}
            {questions.map((q, i) => {
              const t = q.timeSpentSecs || 0;
              const h = t > 0 ? Math.max(3, (t / yMax) * CHART_H) : 3;
              const status = q.user_answer === null ? "skipped" : q.is_correct ? "correct" : "incorrect";
              const color = status === "correct" ? BE.good : status === "incorrect" ? BE.bad : "#6b635a";
              const baseOpacity = status === "skipped" ? 0.4 : 1;
              const isActive = activeIdx === i;
              const opacity = activeIdx === null ? baseOpacity : isActive ? 1 : baseOpacity * 0.25;
              return (
                <div
                  key={q.id}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx(isActive ? null : i)}
                  style={{
                    flex: "1 1 0", minWidth: 3, height: h,
                    background: color, opacity,
                    borderRadius: "2px 2px 0 0",
                    transition: "opacity 0.1s, filter 0.1s, transform 0.1s",
                    cursor: "pointer",
                    filter: isActive ? "brightness(1.4)" : "none",
                    transform: isActive ? "translateY(-2px)" : "none",
                    position: "relative",
                  }}
                />
              );
            })}
          </div>

          {/* X-axis */}
          <div className="qt-xaxis">
            {questions.map((_, i) => {
              const show = i === 0 || (i + 1) % 10 === 0 || i === questions.length - 1;
              return (
                <div key={i} style={{ flex: "1 1 0", minWidth: 3 }}>{show ? i + 1 : ""}</div>
              );
            })}
          </div>

          {/* Section strip — colored bars showing which section each question belongs to */}
          {sectionOrder.length > 1 && (
            <div className="qt-section-strip">
              {sectionOrder.map((sec, si) => {
                const secQs = questions.filter(q => q.subject === sec);
                const widthPct = (secQs.length / questions.length) * 100;
                const color = SECTION_COLORS[si % SECTION_COLORS.length];
                return (
                  <div key={sec} style={{ flex: `0 0 ${widthPct}%`, minWidth: 0 }}>
                    <div style={{ height: 3, background: color, opacity: 0.5, borderRadius: 1, marginBottom: 3 }} />
                    <div className="qt-section-label" style={{ color, fontSize: 9 }}>{sec}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
      </div>

      {/* Tapped/hovered detail card — shows on mobile tap, desktop hover */}
      {active && activeStatus && (
        <div className="qt-detail-card">
          <div style={{ fontFamily: BE.mono, fontWeight: 700, fontSize: 13, color: BE.text }}>Q{(activeIdx ?? 0) + 1}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: BE.textDim, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {plainPreview(active.question_text).slice(0, 90) || "—"}
            </div>
            <div style={{ fontSize: 11, color: BE.textMute, fontFamily: BE.mono, marginTop: 3 }}>{active.subject}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontFamily: BE.mono, fontSize: 13, fontWeight: 600, color: BE.text }}>{fmtTime(active.timeSpentSecs)}</span>
            <span style={{
              padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700,
              textTransform: "uppercase" as const, letterSpacing: 0.4,
              color: activeColor, background: activeColor + "22",
            }}>{activeStatus}</span>
          </div>
        </div>
      )}

      {/* Footer stats */}
      {!active && (
        <div className="qt-footer">
          <div><span className="qt-footer-k">Avg</span> <strong style={{ color: BE.text }}>{fmtTime(avgTime)}</strong></div>
          <div><span className="qt-footer-k">Median</span> <strong style={{ color: BE.text }}>{fmtTime(medianTime)}</strong></div>
          <div><span className="qt-footer-k">Slowest</span> <strong style={{ color: BE.text }}>{fmtTime(maxTime)}</strong>{slowestIdx >= 0 && <> (Q{slowestIdx + 1})</>}</div>
          <div className="qt-footer-spacer" style={{ flex: 1 }} />
          {slowCount > 0 && (
            <div className="qt-footer-pill" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", background: BE.bad + "18", border: `1px solid ${BE.bad}22`,
              borderRadius: 999, color: BE.bad, fontSize: 11,
            }}>
              Time leak: {slowCount} q over 3m
            </div>
          )}
        </div>
      )}
    </section>
  );
}
