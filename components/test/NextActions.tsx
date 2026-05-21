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
  const wrongQs = result.questions.filter(q => q.is_correct === false && q.user_answer !== null);
  const slowQs  = result.questions.filter(q => q.timeSpentSecs > 180);
  const wrongPatterns = new Set(wrongQs.map(q => q.topic || q.subject)).size;
  const avgSlowSecs   = slowQs.length > 0
    ? Math.round(slowQs.reduce((s, q) => s + q.timeSpentSecs, 0) / slowQs.length)
    : 0;

  const cards = [
    wrongQs.length > 0 && {
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <path d="M9 1l2.5 5.5L17 7.5l-4 3.9 1 5.6L9 14.4l-5 2.6 1-5.6L1 7.5l5.5-1L9 1z"/>
        </svg>
      ),
      iconBg: BE.bad + "22",
      iconColor: BE.bad,
      title: `Add ${wrongQs.length} wrong question${wrongQs.length !== 1 ? "s" : ""} to mistake log`,
      sub: `Auto-grouped into ${wrongPatterns} pattern${wrongPatterns !== 1 ? "s" : ""}`,
      action: "Review patterns →",
      href: "/mistakes",
    },
    slowQs.length > 0 && {
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="9" cy="9" r="7.5"/><path d="M9 5v4l2.5 2"/>
        </svg>
      ),
      iconBg: BE.warn + "22",
      iconColor: BE.warn,
      title: `Drill ${slowQs.length} slow question${slowQs.length !== 1 ? "s" : ""}`,
      sub: `Avg ${fmtTime(avgSlowSecs)} · aim for under 3m`,
      action: "Speed practice →",
      href: "/practice",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <path d="M9 1l2.5 5.5L17 7.5l-4 3.9 1 5.6L9 14.4l-5 2.6 1-5.6L1 7.5l5.5-1L9 1z"/>
        </svg>
      ),
      iconBg: BE.accent + "22",
      iconColor: BE.accent,
      title: "Take the next mock test",
      sub: "Same series · keep the streak going",
      action: "Start →",
      href: null,
      onClick: onRestart,
    },
  ].filter(Boolean) as {
    icon: React.ReactNode; iconBg: string; iconColor: string;
    title: string; sub: string; action: string;
    href: string | null; onClick?: () => void;
  }[];

  if (cards.length === 0) return null;

  return (
    <section>
      <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
        What to do next
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="be-card p-5 flex flex-col gap-3"
            style={{ borderColor: BE.line }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: card.iconBg, color: card.iconColor,
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: BE.text, lineHeight: 1.4 }}>{card.title}</div>
                <div style={{ fontSize: 11.5, color: BE.textMute, marginTop: 3 }}>{card.sub}</div>
              </div>
            </div>
            {card.href ? (
              <Link
                href={card.href}
                style={{ fontSize: 12.5, fontWeight: 700, color: BE.accent, marginTop: "auto" }}
              >
                {card.action}
              </Link>
            ) : (
              <button
                onClick={card.onClick}
                style={{ fontSize: 12.5, fontWeight: 700, color: BE.accent, textAlign: "left", marginTop: "auto", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {card.action}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
