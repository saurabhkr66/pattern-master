"use client";

import Link from "next/link";
import { BE } from "@/lib/theme";
import type { ResultData } from "./testAnalysisHelpers";
import { fmtTime } from "./testAnalysisHelpers";

interface Props {
  result: ResultData;
  onRestart: () => void;
  /** Show the "Retake test" button. Default: true (consumer). Coaching sets false. */
  showRestart?: boolean;
}

export default function ScoreOverview({ result, onRestart, showRestart = true }: Props) {
  const scorePercent = result.maxScore > 0 ? (result.score / result.maxScore) * 100 : 0;
  const circleColor = scorePercent >= 66 ? BE.good : scorePercent >= 33 ? BE.warn : BE.bad;

  const correct = result.correct;
  const wrong = result.incorrect;
  const skipped = result.unattempted;
  const total = correct + wrong + skipped;

  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const correctPct = total > 0 ? correct / total : 0;
  const wrongPct   = total > 0 ? wrong / total : 0;
  const correctLen = CIRC * correctPct;
  const wrongLen   = CIRC * wrongPct;
  const skipLen    = CIRC * (total > 0 ? skipped / total : 0);
  const wrongOffset = -(correctLen);
  const skipOffset  = -(correctLen + wrongLen);

  const weakest = result.subjectBreakdown?.sort((a, b) => a.accuracy - b.accuracy)[0]?.subject ?? "N/A";
  const slowQs = result.questions.filter(q => q.timeSpentSecs > 180);

  // Marks gained/lost from the ACTUAL per-question awards, not from counts: a
  // count-based "-wrong" wrongly penalises NAT/MSQ wrongs (which have no negative
  // marking) and ignores per-question mark/penalty differences. When awarded
  // marks aren't available (legacy sessions) fall back to the count estimate.
  const trim = (n: number) => (Math.round(n * 100) / 100).toString();
  const hasAwarded = result.questions.length > 0 && result.questions.every(q => typeof q.awarded === "number");
  const marksGained = hasAwarded
    ? result.questions.reduce((s, q) => s + (q.awarded! > 0 ? q.awarded! : 0), 0)
    : correct * (result.questions[0]?.marks ?? 1);
  const marksLost = hasAwarded
    ? result.questions.reduce((s, q) => s + (q.awarded! < 0 ? q.awarded! : 0), 0) // ≤ 0
    : -wrong;

  return (
    <section>
      {/* Hero */}
      <div className="so-hero">
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", border: `1px solid ${BE.line}`, borderRadius: 999,
              fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" as const,
              color: BE.textDim, fontFamily: BE.mono,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: BE.good, boxShadow: `0 0 8px ${BE.good}`, display: "inline-block" }} />
              Completed
            </span>
            {result.examType && (
              <span style={{
                display: "inline-flex", padding: "5px 10px", border: `1px solid ${BE.line}`, borderRadius: 999,
                fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" as const,
                color: BE.textDim, fontFamily: BE.mono,
              }}>{result.examType}</span>
            )}
          </div>
          <h1 style={{
            fontFamily: BE.serif, fontWeight: 400, fontSize: "clamp(36px, 6vw, 48px)",
            lineHeight: 0.95, letterSpacing: "-0.025em", margin: "0 0 20px", color: BE.text,
          }}>
            Your <em style={{ fontStyle: "italic", color: "#fbcb6a", fontWeight: 300 }}>performance</em><br />
            report
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: BE.textDim, maxWidth: 520 }}>
            You scored <strong style={{ color: BE.text }}>{result.score.toFixed(1)} out of {result.maxScore}</strong> — {scorePercent.toFixed(1)}% conversion.
            {weakest !== "N/A" && <> <strong style={{ color: BE.text }}>{weakest}</strong> needs the most attention.</>}
          </p>
        </div>
        <div className="so-hero-score">
          <div style={{ fontFamily: BE.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: BE.textMute, marginBottom: 12 }}>
            Final score
          </div>
          <div style={{
            fontFamily: BE.serif, fontSize: "clamp(56px, 10vw, 120px)", lineHeight: 0.85,
            fontWeight: 500, letterSpacing: "-0.04em", color: BE.text,
            display: "inline-flex", alignItems: "baseline", gap: 4,
          }}>
            {result.score.toFixed(1)}
            <span style={{ fontSize: "clamp(18px, 3vw, 32px)", color: "var(--text-muted, #79716a)", fontWeight: 400 }}>/{result.maxScore}</span>
          </div>
          <div style={{ marginTop: 12, fontFamily: BE.mono, fontSize: 12, color: circleColor }}>
            {scorePercent.toFixed(1)}% conversion
          </div>
        </div>
      </div>

      {/* Mobile score band — hidden on desktop via CSS */}
      <div className="so-score-band" style={{ display: "none" }}>
        <div style={{ fontFamily: BE.mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: BE.textMute, marginBottom: 8 }}>
          Final score
        </div>
        <div style={{
          fontFamily: BE.serif, fontSize: 78, lineHeight: 0.85, fontWeight: 500,
          letterSpacing: "-0.04em", color: BE.text,
          display: "flex", alignItems: "baseline", gap: 4,
        }}>
          {result.score.toFixed(1)}
          <span style={{ fontSize: 22, color: "var(--text-muted, #4a443d)", fontWeight: 400 }}>/{result.maxScore}</span>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 14, fontFamily: BE.mono, fontSize: 11 }}>
          <span style={{ color: circleColor }}>{scorePercent.toFixed(1)}% conversion</span>
          {weakest !== "N/A" && <span style={{ color: BE.textDim }}>Weakest: <strong style={{ color: BE.text }}>{weakest}</strong></span>}
        </div>
      </div>

      {/* Stats row */}
      <div className="so-stats">
        {[
          { k: "Accuracy", v: `${result.accuracy?.toFixed(1) ?? 0}%`, sub: `${result.correct} of ${result.attempted} answered` },
          { k: "Time used", v: fmtTime(result.timeTakenSecs), sub: `${fmtTime(Math.round(result.timeTakenSecs / Math.max(result.questions.length, 1)))} avg / q` },
          { k: "Questions", v: `${result.correct}`, sub: `${result.incorrect} wrong · ${result.unattempted} skipped` },
          { k: "Score", v: `${scorePercent.toFixed(1)}`, unit: "%", sub: `${result.score.toFixed(1)} / ${result.maxScore} marks`, color: circleColor },
        ].map((s, i, arr) => (
          <div key={i} className="so-stat" style={{ borderRight: i < arr.length - 1 ? `1px solid ${BE.line}` : "none" }}>
            <div style={{ fontFamily: BE.mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: BE.textMute, marginBottom: 12 }}>
              {s.k}
            </div>
            <div style={{
              fontFamily: BE.serif, fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1, fontWeight: 400,
              letterSpacing: "-0.02em", color: (s as any).color ?? BE.text,
              display: "flex", alignItems: "baseline", gap: 4,
            }}>
              {s.v}
              {(s as any).unit && <span style={{ fontSize: 16, color: BE.textMute, fontWeight: 400 }}>{(s as any).unit}</span>}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: BE.textDim, fontFamily: BE.mono }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Donut + Insights */}
      <div className="so-panels">
        {/* Donut panel */}
        <div className="be-card" style={{ padding: 28, border: `1px solid ${BE.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
            <div style={{ fontFamily: BE.serif, fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em" }}>
              Where the <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>marks went</em>
            </div>
            <div style={{ fontFamily: BE.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: BE.textMute }}>
              {total} questions
            </div>
          </div>
          <div className="so-donut-row">
            <div className="so-donut-wrap">
              <svg viewBox="0 0 100 100" className="so-donut-svg" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                {correctLen > 0 && <circle cx="50" cy="50" r={R} fill="none" stroke={BE.good} strokeWidth="10" strokeDasharray={`${correctLen} ${CIRC}`} strokeDashoffset={0} />}
                {wrongLen > 0 && <circle cx="50" cy="50" r={R} fill="none" stroke={BE.bad} strokeWidth="10" strokeDasharray={`${wrongLen} ${CIRC}`} strokeDashoffset={wrongOffset} />}
                {skipLen > 0 && <circle cx="50" cy="50" r={R} fill="none" stroke="#6b635a" strokeWidth="10" strokeDasharray={`${skipLen} ${CIRC}`} strokeDashoffset={skipOffset} />}
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <div style={{ fontFamily: BE.serif, fontSize: 32, lineHeight: 1, fontWeight: 500, color: BE.text }}>
                    {total > 0 ? Math.round(correctPct * 100) : 0}<span style={{ fontSize: 16, color: BE.textMute }}>%</span>
                  </div>
                  <div style={{ fontFamily: BE.mono, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: BE.textMute, marginTop: 4 }}>Correct rate</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {[
                { color: BE.good, label: "Correct", sub: `marks gained`, count: correct, marks: `+${trim(marksGained)}` },
                { color: BE.bad, label: "Wrong", sub: "marks lost", count: wrong, marks: marksLost < 0 ? trim(marksLost) : "0" },
                { color: "#6b635a", label: "Skipped", sub: "No penalty", count: skipped, marks: "0" },
                { color: BE.warn, label: "Net score", sub: "", count: null, marks: `${result.score.toFixed(1)} / ${result.maxScore}`, isTotal: true },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "10px 1fr auto auto", gap: 10, alignItems: "center",
                  paddingBottom: 10, borderBottom: i < 3 ? `1px dashed ${BE.line}` : "none",
                  borderTop: (row as any).isTotal ? `1px solid ${BE.line}` : "none",
                  paddingTop: (row as any).isTotal ? 10 : 0,
                  marginTop: (row as any).isTotal ? 4 : 0,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: row.color, display: "block" }} />
                  <span style={{ fontSize: 13, color: BE.text }}>
                    {row.label}
                    {row.sub && <small style={{ display: "block", fontSize: 10, color: BE.textMute, fontFamily: BE.mono, marginTop: 2 }}>{row.sub}</small>}
                  </span>
                  {row.count !== null && <span style={{ fontFamily: BE.mono, fontSize: 18, fontWeight: 500, color: BE.text }}>{row.count}</span>}
                  <span style={{ fontFamily: BE.mono, fontSize: 11, color: (row as any).isTotal ? "#fbcb6a" : BE.textMute, textAlign: "right", minWidth: 44 }}>{row.marks}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Insights panel */}
        <div className="be-card" style={{ padding: 28, border: `1px solid ${BE.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
            <div style={{ fontFamily: BE.serif, fontSize: 20, fontWeight: 400 }}>
              <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>Insights</em>
            </div>
            <div style={{ fontFamily: BE.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: BE.textMute }}>Auto-generated</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {([
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>,
                iconColor: BE.bad, ttl: "Weakest topic", val: weakest,
                meta: `${result.subjectBreakdown?.sort((a, b) => a.accuracy - b.accuracy)[0]?.accuracy?.toFixed(0) ?? 0}%`, metaGood: false,
              },
              slowQs.length > 0 && {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
                iconColor: BE.warn, ttl: "Pacing alert",
                val: `${slowQs.length} question${slowQs.length > 1 ? "s" : ""} over 3 min`,
                meta: null, metaGood: false,
              },
              result.mockTestId && {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M6 4h12v8a6 6 0 0 1-12 0V4Z"/><path d="M8 22h8M10 22v-4M14 22v-4"/></svg>,
                iconColor: "#b8a0ff", ttl: "Live leaderboard",
                val: <Link href={`/mock/${result.mockTestId}/dashboard`} style={{ color: BE.accent, textDecoration: "underline" }}>View live rankings</Link>,
                meta: null, metaGood: true,
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
                iconColor: "#b8a0ff", ttl: "Track progress",
                val: <Link href="/dashboard" style={{ color: BE.accent, textDecoration: "underline" }}>View Dashboard</Link>,
                meta: null, metaGood: true,
              },
            ] as any[]).filter(Boolean).map((ins: any, i: number, arr: any[]) => (
              <div key={i} style={{
                padding: "14px 0", borderBottom: i < arr.length - 1 ? `1px solid ${BE.line}` : "none",
                display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 12, alignItems: "center",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, display: "grid", placeItems: "center", border: `1px solid ${BE.line}`, background: "rgba(255,255,255,0.03)", color: ins.iconColor }}>
                  {ins.icon}
                </div>
                <div>
                  <div style={{ fontFamily: BE.mono, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: BE.textMute, marginBottom: 3 }}>{ins.ttl}</div>
                  <div style={{ fontSize: 14, color: BE.text, fontWeight: 500 }}>{ins.val}</div>
                </div>
                {ins.meta && <div style={{ fontFamily: BE.mono, fontSize: 13, textAlign: "right", color: ins.metaGood ? BE.good : BE.bad, fontWeight: 500 }}>{ins.meta}</div>}
              </div>
            ))}
          </div>
          {showRestart && (
            <button onClick={onRestart} style={{
              marginTop: 20, width: "100%", padding: "10px 0",
              border: `1px solid ${BE.line}`, borderRadius: 4,
              background: "transparent", color: BE.textDim, fontSize: 13,
              fontFamily: BE.mono, cursor: "pointer", letterSpacing: "0.04em",
              transition: "background 0.15s, color 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = BE.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = BE.textDim; }}
            >
              ↺ Retake test
            </button>
          )}
        </div>
      </div>

      <style>{`
        .so-hero {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 48px;
          align-items: end;
          margin-bottom: 40px;
        }
        .so-score-band { display: none; }
        .so-hero-score { text-align: right; }
        .so-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          margin-bottom: 40px;
        }
        .so-stat { padding: 20px 24px 20px 0; }
        .so-stat:not(:first-child) { padding-left: 24px; }
        .so-panels {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
          margin-bottom: 40px;
        }
        .so-donut-row {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 28px;
          align-items: center;
        }
        .so-donut-wrap { position: relative; width: 160px; height: 160px; flex-shrink: 0; }
        .so-donut-svg { width: 160px; height: 160px; display: block; }
        @media (max-width: 768px) {
          .so-hero {
            grid-template-columns: 1fr;
            gap: 0;
            margin-bottom: 0;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--border);
          }
          .so-hero-score { display: none; }
          .so-score-band {
            display: flex !important;
            flex-direction: column;
            padding: 24px 0;
            margin-bottom: 28px;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, rgba(16,13,10,0.9) 0%, transparent 100%);
          }
          .so-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .so-stat {
            padding: 16px 16px 16px 0;
            border-bottom: 1px solid var(--border);
          }
          .so-stat:nth-child(even) { border-right: none !important; padding-left: 16px; }
          .so-stat:nth-last-child(-n+2) { border-bottom: none; }
          .so-panels {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .so-donut-row {
            grid-template-columns: 130px 1fr;
            gap: 18px;
            justify-items: start;
          }
          .so-donut-wrap { width: 130px; height: 130px; }
          .so-donut-svg { width: 130px; height: 130px; }
        }
      `}</style>
    </section>
  );
}
