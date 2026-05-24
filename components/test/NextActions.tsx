"use client";

import React from "react";
import Link from "next/link";
import { BE } from "@/lib/theme";
import { fmtTime, type ResultData } from "./testAnalysisHelpers";

interface Props {
  result: ResultData;
  onRestart: () => void;
}

export default function NextActions({ result, onRestart }: Props) {
  const wrongCount = result.incorrect;
  const wrongQs = result.questions.filter(q => q.is_correct === false && q.user_answer !== null);
  const slowQs  = result.questions.filter(q => q.timeSpentSecs > 180);
  // Use server-reported wrong count as source of truth; fall back to filtered array
  const displayWrong = wrongCount > 0 ? wrongCount : wrongQs.length;
  const weakest = result.subjectBreakdown?.sort((a, b) => a.accuracy - b.accuracy)[0]?.subject;

  // Always show retake + review + one more (slow or weakest), always exactly 3 cols
  const cards: {
    k: string;
    h: React.ReactNode;
    d: string;
    action: string;
    href: string | null;
    onClick?: () => void;
    primary?: boolean;
  }[] = [
    {
      k: "Next attempt",
      h: <>Retake <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>this test</em></>,
      d: "Same question set. See how your score improves with a fresh attempt.",
      action: "Start now →",
      href: null,
      onClick: onRestart,
      primary: true,
    },
    {
      k: "Review",
      h: displayWrong > 0
        ? <><em style={{ fontStyle: "italic", color: "#fbcb6a" }}>{displayWrong} wrong</em> answers</>
        : <>Review <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>all answers</em></>,
      d: displayWrong > 0
        ? "Walk through your errors with full solutions and the concept page for each."
        : "Review all questions with full solutions and concept pages.",
      action: "Review now →",
      href: "/review",
    },
    slowQs.length > 0 ? {
      k: "Speed practice",
      h: <>Drill <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>slow questions</em></>,
      d: `${slowQs.length} question${slowQs.length > 1 ? "s" : ""} took over 3 minutes. Avg ${fmtTime(Math.round(slowQs.reduce((s, q) => s + q.timeSpentSecs, 0) / slowQs.length))} — aim for under 3m.`,
      action: "Speed drill →",
      href: "/practice",
    } : {
      k: "Targeted practice",
      h: <>Drill <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>{weakest ?? "weak topics"}</em></>,
      d: "Focus on your weakest subject from this paper to close the gap before your next attempt.",
      action: "Open set →",
      href: "/practice",
    },
  ];

  if (cards.length === 0) return null;

  return (
    <>
      <style>{`
        .na-band {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
          background: var(--bg-surface);
        }
        .na-card { border-right-width: 1px; border-right-style: solid; border-right-color: var(--border); }
        .na-card:last-child { border-right: none; }
        @media (max-width: 768px) {
          .na-band { grid-template-columns: 1fr; }
          .na-card { border-right: none !important; border-bottom: 1px solid var(--border); }
          .na-card:last-child { border-bottom: none; }
        }
      `}</style>
      <div className="na-band">
      {cards.map((card, i) => (
        <div
          key={i}
          className="na-card"
          style={{
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: card.primary ? "linear-gradient(140deg, rgba(245,166,35,0.07) 0%, transparent 60%)" : "transparent",
            cursor: card.href ? "default" : "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { if (!card.primary) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
          onMouseLeave={e => { if (!card.primary) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
        >
          <div style={{ fontFamily: BE.mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: BE.textMute }}>
            {card.k}
          </div>
          <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.2, color: BE.text }}>
            {card.h}
          </div>
          <div style={{ fontSize: 13, color: BE.textDim, lineHeight: 1.55, flex: 1 }}>
            {card.d}
          </div>
          {card.href ? (
            <Link href={card.href} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: BE.accent, fontWeight: 500, marginTop: 4 }}>
              {card.action}
            </Link>
          ) : (
            <button
              onClick={card.onClick}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: card.primary ? "#fbcb6a" : BE.accent, fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}
            >
              {card.action}
            </button>
          )}
        </div>
      ))}
      </div>
    </>
  );
}
