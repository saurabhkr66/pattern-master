"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, AlertCircle, RotateCcw, Target, Brain, TrendingUp, Trophy } from "lucide-react";
import { BE } from "@/lib/theme";
import type { ResultData } from "./testAnalysisHelpers";

interface Props {
  result: ResultData;
  onRestart: () => void;
}

export default function ScoreOverview({ result, onRestart }: Props) {
  const scorePercent = result.maxScore > 0 ? (result.score / result.maxScore) * 100 : 0;
  const circleColor = scorePercent >= 66 ? BE.good : scorePercent >= 33 ? BE.warn : BE.bad;

  const stats = [
    { label: "Score", val: `${result.score.toFixed(1)} / ${result.maxScore}`, icon: <Target size={16} />, color: circleColor },
    { label: "Correct", val: result.correct, icon: <CheckCircle2 size={16} />, color: BE.good },
    { label: "Wrong", val: result.incorrect, icon: <XCircle size={16} />, color: BE.bad },
    { label: "Skipped", val: result.unattempted, icon: <AlertCircle size={16} />, color: BE.textMute },
  ];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 be-card p-8 flex flex-col md:flex-row items-center gap-10">
        <div className="relative w-48 h-48 shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle cx="96" cy="96" r="88" fill="none" stroke={BE.line} strokeWidth="12" />
            <circle cx="96" cy="96" r="88" fill="none" stroke={circleColor} strokeWidth="12"
              strokeDasharray={552} strokeDashoffset={552 - (552 * result.score) / result.maxScore} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div style={{ fontSize: 42, fontWeight: 800, color: BE.text, fontFamily: BE.mono }}>{result.score.toFixed(1)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: BE.textMute }}>OUT OF {result.maxScore}</div>
          </div>
        </div>
        <div className="flex-1 space-y-6 text-center md:text-left w-full">
          <div>
            <h1 style={{ fontFamily: BE.serif, fontSize: 32, fontWeight: 700, color: BE.text }}>Test Performance</h1>
            <p style={{ fontSize: 14, color: BE.textDim }}>Completed. Here&apos;s a breakdown of your knowledge gaps.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BE.line, background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2 mb-1" style={{ color: s.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: BE.text, fontFamily: BE.mono }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="be-card p-8 flex flex-col justify-between">
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", marginBottom: 16 }}>Insights</div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: BE.accentSoft, color: BE.accent }}><Brain size={20} /></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>Weakest Subject</div>
                <p style={{ fontSize: 12, color: BE.textDim }}>{result.subjectBreakdown.sort((a, b) => a.accuracy - b.accuracy)[0]?.subject || "N/A"}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: BE.good + "22", color: BE.good }}><TrendingUp size={20} /></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>Track Progress</div>
                <p style={{ fontSize: 12, color: BE.textDim }}>
                  See history in your{" "}
                  <Link href="/dashboard" style={{ color: BE.accent, textDecoration: "underline" }}>Dashboard</Link>.
                </p>
              </div>
            </div>
            {result.mockTestId && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: BE.accentSoft, color: BE.accent }}><Trophy size={20} /></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>Live Leaderboard</div>
                  <p style={{ fontSize: 12, color: BE.textDim }}>
                    See how you rank against everyone on this mock —{" "}
                    <Link href={`/mock/${result.mockTestId}/dashboard`} style={{ color: BE.accent, textDecoration: "underline" }}>view live</Link>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <button onClick={onRestart} className="be-btn w-full flex items-center justify-center gap-2 mt-8">
          <RotateCcw size={16} /> Retake Test
        </button>
      </div>
    </section>
  );
}
