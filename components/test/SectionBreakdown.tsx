"use client";

import { useState } from "react";
import { BE } from "@/lib/theme";
import { fmtTime, type ResultData } from "./testAnalysisHelpers";

interface Props {
  sections: NonNullable<ResultData["sectionBreakdown"]>;
  questions?: ResultData["questions"];
}

export default function SectionBreakdown({ sections, questions = [] }: Props) {
  const [expandedSec, setExpandedSec] = useState<string | null>(null);

  // Show marks with their real precision — subjective partial credit produces
  // halves (2.5). toFixed(0) was rounding 2.5 → "3", so the section header read
  // "3/3" while the question card correctly showed 2.5/3. Trim trailing zeros so
  // integers still render clean (3, not 3.00).
  const fmtMarks = (n: number | undefined) =>
    typeof n === "number" ? n.toFixed(2).replace(/\.?0+$/, "") : String(n ?? "");

  if (!sections?.length) return null;

  return (
    <section>
      <style>{`
        .sb-row {
          display: grid;
          grid-template-columns: auto 1fr auto auto auto auto;
          gap: 24px;
          align-items: center;
        }
        .sb-row-score { display: none; }
        .sb-expanded {
          margin-top: 24px;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
        }
        @media (min-width: 769px) {
          .sb-row-r1 { display: contents; }
          .sb-row-meta { display: contents; }
        }
        @media (max-width: 768px) {
          .sb-row {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .sb-row-r1 { display: flex; justify-content: space-between; align-items: baseline; }
          .sb-row-bar { width: 100%; }
          .sb-row-meta {
            display: flex; gap: 12px; align-items: center;
            font-family: var(--font-mono, monospace); font-size: 10.5px;
          }
          .sb-row-score { display: block; }
          .sb-row-meta > div:nth-child(3) { display: none; }
          .sb-expanded {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .sb-summary-border {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid var(--border);
            padding-top: 16px;
          }
        }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <h2 style={{ fontFamily: BE.serif, fontSize: 26, fontWeight: 400, margin: 0, letterSpacing: "-0.015em" }}>
          Paper <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>sections</em>
        </h2>
        <div style={{ fontFamily: BE.mono, fontSize: 11, color: BE.textMute }}>
          Click to expand topic breakdown
        </div>
      </div>

      <div>
        {sections.map((sec, i) => {
          const accColor = sec.accuracy > 70 ? BE.good : sec.accuracy > 40 ? BE.warn : BE.bad;
          const isExpanded = expandedSec === sec.name;
          const correctPct = sec.total > 0 ? (sec.correct / sec.total) * 100 : 0;
          // Count actual wrong (answered incorrectly), NOT counting skipped.
          // Prefer the builder's per-section count; otherwise derive from the
          // question rows; only as a last resort use total-correct (which would
          // otherwise lump skipped in with wrong).
          const secQs = questions.filter(q => {
            const name = (q as any).sectionName || q.subject;
            return name === sec.name;
          });
          const wrongCount =
            typeof sec.wrong === "number"
              ? sec.wrong
              : secQs.length > 0
              ? secQs.filter(q => q.is_correct === false && q.user_answer !== null).length
              : sec.total - sec.correct; // fallback if no question-level data
          const wrongPct = sec.total > 0 ? (wrongCount / sec.total) * 100 : 0;

          return (
            <div key={i} style={{
              borderTop: `1px solid ${BE.line}`,
              ...(i === sections.length - 1 ? { borderBottom: `1px solid ${BE.line}` } : {}),
              padding: "24px 0",
            }}>
              {/* Section header row */}
              <div
                style={{ cursor: "pointer" }}
                onClick={() => setExpandedSec(isExpanded ? null : sec.name)}
              >
                <div className="sb-row">
                  {/* Row 1: name + score (mobile: flex row; desktop: display:contents) */}
                  <div className="sb-row-r1">
                    {/* Number + Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 180 }}>
                      <div style={{ fontFamily: BE.serif, fontSize: 24, color: "rgba(255,255,255,0.2)", fontWeight: 300, width: 28 }}>
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em", color: BE.text }}>
                        {sec.name}
                      </div>
                    </div>
                    {/* Score — visible on mobile in r1, hidden in desktop grid position */}
                    <div className="sb-row-score" style={{ fontFamily: BE.serif, fontSize: 24, fontWeight: 500, color: accColor, letterSpacing: "-0.02em" }}>
                      {fmtMarks(sec.score)}
                      <span style={{ fontSize: 13, color: BE.textMute, fontFamily: BE.mono }}>/{sec.max}</span>
                    </div>
                  </div>

                  {/* Bar — desktop grid item 2 (1fr); on mobile full-width */}
                  <div className="sb-row-bar" style={{ position: "relative", height: 7, background: BE.line, borderRadius: 999, overflow: "hidden", minWidth: 160 }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: `${correctPct}%`, background: BE.good,
                    }} />
                    <div style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: `${correctPct}%`,
                      width: `${Math.min(wrongPct, 100 - correctPct)}%`,
                      background: BE.bad,
                    }} />
                  </div>

                  {/* Meta row (mobile: flex row; desktop: display:contents) */}
                  <div className="sb-row-meta">
                    {/* C/W counts */}
                    <div style={{ fontFamily: BE.mono, fontSize: 12, color: BE.textDim, whiteSpace: "nowrap" }}>
                      <strong style={{ color: BE.text }}>{sec.correct}</strong>C ·{" "}
                      <strong style={{ color: BE.text }}>{wrongCount}</strong>W
                    </div>
                    {/* Q count + time */}
                    <div style={{ fontFamily: BE.mono, fontSize: 12, color: BE.textDim, whiteSpace: "nowrap" }}>
                      {sec.total} Q · {fmtTime(sec.timeSpentSecs)}
                    </div>
                    {/* Score — desktop grid item */}
                    <div style={{ fontFamily: BE.serif, fontSize: 24, fontWeight: 500, color: accColor, minWidth: 64, textAlign: "right", letterSpacing: "-0.02em" }}>
                      {fmtMarks(sec.score)}
                      <span style={{ fontSize: 13, color: BE.textMute, fontFamily: BE.mono }}>/{sec.max}</span>
                    </div>
                    {/* Toggle chevron */}
                    <div style={{
                      width: 26, height: 26, border: `1px solid ${BE.line}`, borderRadius: 4,
                      display: "grid", placeItems: "center", color: BE.textMute,
                      transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(180deg)" : "none",
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded body: topics + summary */}
              {isExpanded && (
                <div className="sb-expanded">
                  {/* Topics */}
                  <div>
                    {sec.topics?.length > 0 ? sec.topics.map((t, j) => {
                      const tColor = t.accuracy > 70 ? BE.good : t.accuracy > 40 ? BE.warn : BE.bad;
                      return (
                        <div key={j} style={{
                          display: "grid", gridTemplateColumns: "1.2fr 1fr auto auto",
                          gap: 20, alignItems: "center",
                          padding: "12px 0",
                          borderBottom: j < sec.topics.length - 1 ? `1px dashed ${BE.line}` : "none",
                        }}>
                          <div style={{ fontSize: 13, color: BE.text }}>{t.topic}</div>
                          <div style={{ height: 4, background: BE.line, borderRadius: 999, overflow: "hidden", position: "relative" }}>
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${t.accuracy}%`, background: tColor }} />
                          </div>
                          <div style={{ fontFamily: BE.mono, fontSize: 12, color: BE.textDim, minWidth: 44, textAlign: "right" }}>
                            <strong style={{ color: BE.text }}>{t.accuracy?.toFixed(0)}%</strong>
                          </div>
                          <div style={{ fontFamily: BE.mono, fontSize: 11, color: BE.textMute, minWidth: 44, textAlign: "right" }}>
                            {fmtTime(t.timeSpentSecs)}
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{ color: BE.textMute, fontSize: 13, fontFamily: BE.mono }}>No topic breakdown available.</div>
                    )}
                  </div>

                  {/* Summary sidebar */}
                  <div className="sb-summary-border" style={{ borderLeft: `1px solid ${BE.line}`, paddingLeft: 28 }}>
                    {[
                      { k: "Marks", v: `${fmtMarks(sec.score)} / ${sec.max}` },
                      { k: "Accuracy", v: `${sec.accuracy?.toFixed(1)}%` },
                      { k: "Avg time / Q", v: fmtTime(Math.round(sec.timeSpentSecs / Math.max(sec.total, 1))) },
                      { k: "Time spent", v: fmtTime(sec.timeSpentSecs) },
                    ].map((row, idx, arr) => (
                      <div key={idx} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "9px 0",
                        borderBottom: idx < arr.length - 1 ? `1px dashed ${BE.line}` : "none",
                        fontSize: 13,
                      }}>
                        <span style={{ color: BE.textMute, fontFamily: BE.mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{row.k}</span>
                        <span style={{ color: BE.text, fontFamily: BE.mono }}>{row.v}</span>
                      </div>
                    ))}
                    {sec.accuracy < 50 && (
                      <div style={{
                        marginTop: 16, padding: 12,
                        background: BE.warn + "12", borderRadius: 4,
                        borderLeft: `2px solid ${BE.warn}`,
                        fontSize: 12, lineHeight: 1.55, color: BE.text,
                      }}>
                        <span style={{ fontFamily: BE.mono, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#fbcb6a", display: "block", marginBottom: 4 }}>
                          Recommendation
                        </span>
                        Low accuracy in {sec.name}. Review topic-level breakdowns and focus on your weakest topics before the next attempt.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
