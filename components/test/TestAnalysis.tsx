"use client";
import React, { useState, useMemo } from "react";
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, RotateCcw, Target, Brain, TrendingUp, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";

/* ─────────────── Types ─────────────── */
export interface ResultData {
  examType?: string;
  mockTestId?: string | null;
  score: number;
  maxScore: number;
  accuracy: number;
  timeTakenSecs: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  sectionBreakdown?: {
    name: string; score: number; max: number; correct: number; total: number;
    accuracy: number; timeSpentSecs: number;
    topics: { topic: string; score: number; max: number; correct: number; total: number; accuracy: number; timeSpentSecs: number; }[];
  }[];
  subjectBreakdown: {
    subject: string; score: number; max: number; correct: number; total: number; accuracy: number; timeSpentSecs: number;
  }[];
  questions: {
    id: string; question_text: string; options: string[] | null; question_type: string;
    correct_answer: string; user_answer: string | null; is_correct: boolean | null;
    marks: number; subject: string; topic?: string; explanation?: string; timeSpentSecs: number;
  }[];
}

interface Props { result: ResultData; onRestart: () => void; }

/* ─────────────── Helpers ─────────────── */
function shortAns(answer: string | null, type: string): string {
  if (!answer) return "—";
  if (type === "NAT") return answer;
  if (type === "MSQ") return answer.split(";").map(l => l.trim().toUpperCase()).join(", ");
  return answer.trim().toUpperCase();
}

function fmtTime(secs: number): string {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Strip LaTeX and HTML tags so question preview is plain text
function plainPreview(text: string): string {
  return (text || "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$\n]*?\$/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const COL_STYLE = "3rem 5rem 1fr 6rem 8rem 5rem 4rem 9rem";

/* ─────────────── Component ─────────────── */
export default function TestAnalysis({ result, onRestart }: Props) {
  type Filter = "all" | "correct" | "incorrect" | "skipped" | "slow";
  const [filter, setFilter] = useState<Filter>("all");
  const [activeSubject, setActiveSubject] = useState<string>("All");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [expandedSec, setExpandedSec] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    result.questions.forEach(q => { if (q.subject) set.add(q.subject); });
    return Array.from(set).sort();
  }, [result.questions]);

  const subjectQs = useMemo(() =>
    activeSubject === "All" ? result.questions : result.questions.filter(q => q.subject === activeSubject),
    [result.questions, activeSubject]
  );

  const filteredQs = useMemo(() => subjectQs.filter(q => {
    if (filter === "correct")   return q.is_correct === true;
    if (filter === "incorrect") return q.is_correct === false && q.user_answer !== null;
    if (filter === "skipped")   return q.user_answer === null;
    if (filter === "slow")      return q.timeSpentSecs > 180;
    return true;
  }), [subjectQs, filter]);

  const scorePercent = result.maxScore > 0 ? (result.score / result.maxScore) * 100 : 0;
  const circleColor = scorePercent >= 66 ? BE.good : scorePercent >= 33 ? BE.warn : BE.bad;

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "all",       label: "All",     count: subjectQs.length },
    { key: "correct",   label: "Correct", count: subjectQs.filter(q => q.is_correct === true).length },
    { key: "incorrect", label: "Wrong",   count: subjectQs.filter(q => q.is_correct === false && q.user_answer !== null).length },
    { key: "skipped",   label: "Skipped", count: subjectQs.filter(q => q.user_answer === null).length },
    { key: "slow",      label: "Slow",    count: subjectQs.filter(q => q.timeSpentSecs > 180).length },
  ];

  const renderBarList = (title: string, sections: any[]) => {
    if (!sections?.length) return null;
    return (
      <div className="mb-10 last:mb-0">
        <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>{title}</div>
        <div className="space-y-6">
          {sections.map((sec: any, i: number) => {
            const accColor = sec.accuracy > 70 ? BE.good : sec.accuracy > 40 ? BE.warn : BE.bad;
            const isExpanded = expandedSec === sec.name;
            return (
              <div key={i}>
                <div className="cursor-pointer p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setExpandedSec(isExpanded ? null : sec.name)}>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600, color: BE.text }}>
                      {sec.name}
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: BE.textMute }} />
                    </div>
                    <div className="flex items-center gap-4" style={{ fontFamily: BE.mono, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: BE.text }}>{sec.score?.toFixed?.(1).replace(/\.0$/, "") ?? sec.score} <span style={{ color: BE.textMute }}>/ {sec.max}</span></span>
                      <span style={{ color: BE.textMute }}>{sec.correct}/{sec.total} Q</span>
                      <span style={{ color: BE.textMute }}>{fmtTime(sec.timeSpentSecs)}</span>
                      <span style={{ color: accColor, fontWeight: 700 }}>{sec.accuracy?.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sec.accuracy}%`, background: accColor }} />
                  </div>
                </div>
                {isExpanded && sec.topics?.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 space-y-4" style={{ borderColor: BE.line }}>
                    {sec.topics.map((t: any, j: number) => {
                      const tColor = t.accuracy > 70 ? BE.good : t.accuracy > 40 ? BE.warn : BE.bad;
                      return (
                        <div key={j}>
                          <div className="flex justify-between items-end mb-1">
                            <div style={{ fontSize: 13, fontWeight: 600, color: BE.textMute }}>{t.topic}</div>
                            <div className="flex items-center gap-4" style={{ fontFamily: BE.mono, fontSize: 11 }}>
                              <span style={{ color: BE.textMute }}>{t.score?.toFixed?.(1).replace(/\.0$/, "") ?? t.score} / {t.max}</span>
                              <span style={{ color: BE.textDim }}>{t.correct}/{t.total}</span>
                              <span style={{ color: BE.textDim }}>{fmtTime(t.timeSpentSecs)}</span>
                              <span style={{ color: tColor, fontWeight: 700 }}>{t.accuracy?.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <div className="h-full rounded-full" style={{ width: `${t.accuracy}%`, background: tColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="be-screen flex flex-col h-full overflow-y-auto" style={{ background: "var(--bg-base)" }}>
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 space-y-10">

        {/* ── SCORE OVERVIEW ── */}
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
                <p style={{ fontSize: 14, color: BE.textDim }}>Completed. Here's a breakdown of your knowledge gaps.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Score", val: `${result.score.toFixed(1)} / ${result.maxScore}`, icon: <Target size={16} />, color: circleColor },
                  { label: "Correct", val: result.correct, icon: <CheckCircle2 size={16} />, color: BE.good },
                  { label: "Wrong", val: result.incorrect, icon: <XCircle size={16} />, color: BE.bad },
                  { label: "Skipped", val: result.unattempted, icon: <AlertCircle size={16} />, color: BE.textMute },
                ].map((s, i) => (
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

        {/* ── TIME × RESULT STRIP ── */}
        <QuestionTimingStrip questions={result.questions} />

        {/* ── SECTION BREAKDOWN ── */}
        <section className="be-card p-6 md:p-10 border" style={{ borderColor: BE.line }}>
          {renderBarList("Paper Sections", result.sectionBreakdown || [])}
        </section>

        {/* ── NEXT ACTIONS ── */}
        <NextActions result={result} onRestart={onRestart} />

        {/* ── QUESTION-WISE BREAKDOWN ── */}
        <section className="be-card overflow-hidden border" style={{ borderColor: BE.line }}>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: BE.line, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontFamily: BE.serif, fontSize: 15, fontWeight: 700, color: BE.text }}>
              QUESTION-WISE BREAKDOWN <span style={{ color: BE.textMute, fontWeight: 400 }}>· {filteredQs.length}</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg p-1 border" style={{ borderColor: BE.line, background: "rgba(0,0,0,0.15)" }}>
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
                  style={{
                    background: filter === tab.key ? BE.surface : "transparent",
                    color: filter === tab.key ? BE.text : BE.textMute,
                  }}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span className="ml-1.5" style={{ color: filter === tab.key ? BE.accent : BE.textMute, fontFamily: BE.mono }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Subject filter */}
          {subjects.length > 1 && (
            <div
              className="flex items-center gap-2 px-6 py-3 border-b flex-wrap"
              style={{ borderColor: BE.line, background: "rgba(0,0,0,0.08)" }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>
                Subject
              </span>
              {["All", ...subjects].map(s => {
                const count = s === "All"
                  ? result.questions.length
                  : result.questions.filter(q => q.subject === s).length;
                const active = s === activeSubject;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveSubject(s)}
                    style={{
                      padding: "4px 10px 4px 11px",
                      borderRadius: 999,
                      border: `1px solid ${active ? BE.accent : BE.line}`,
                      background: active ? BE.accentSoft : "transparent",
                      color: active ? BE.accent : BE.textDim,
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    {s}
                    <span style={{ fontSize: 10, fontFamily: BE.mono, opacity: 0.75 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 760 }}>

              {/* Column headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: COL_STYLE,
                gap: "1rem",
                padding: "10px 24px",
                borderBottom: `1px solid ${BE.line}`,
                background: "rgba(0,0,0,0.12)",
                fontSize: 10,
                fontWeight: 700,
                color: BE.textMute,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                <div>Q#</div>
                <div>SECTION</div>
                <div>QUESTION</div>
                <div>RESULT</div>
                <div>YOUR → ANS</div>
                <div>TIME</div>
                <div>MARKS</div>
                <div>TOPIC</div>
              </div>

              {/* Rows */}
              {filteredQs.length === 0 && (
                <div className="py-16 text-center" style={{ color: BE.textMute, fontSize: 13 }}>No questions match this filter.</div>
              )}
              {filteredQs.map((q, i) => {
                const status = q.user_answer === null ? "skipped" : q.is_correct ? "correct" : "incorrect";
                const statusColor = status === "correct" ? BE.good : status === "incorrect" ? BE.bad : BE.textMute;
                const isExpanded = expandedQId === q.id;
                const userShort = shortAns(q.user_answer, q.question_type);
                const corrShort = shortAns(q.correct_answer, q.question_type);
                const preview = plainPreview(q.question_text);
                const marksVal = status === "correct"
                  ? `+${q.marks}`
                  : status === "incorrect" && q.question_type === "MCQ"
                  ? `-${(q.marks / 3).toFixed(2).replace(/\.00$/, "")}`
                  : "0";
                const marksColor = status === "correct" ? BE.good : status === "incorrect" ? BE.bad : BE.textMute;

                return (
                  <div
                    key={q.id}
                    style={{ borderBottom: `1px solid ${BE.line}`, background: isExpanded ? "rgba(255,255,255,0.025)" : "transparent" }}
                  >
                    {/* Row */}
                    <div
                      onClick={() => setExpandedQId(isExpanded ? null : q.id)}
                      className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                      style={{
                        display: "grid",
                        gridTemplateColumns: COL_STYLE,
                        gap: "1rem",
                        padding: "14px 24px",
                        alignItems: "center",
                      }}
                    >
                      {/* Q# */}
                      <div style={{ color: BE.textMute, fontFamily: BE.mono, fontWeight: 600, fontSize: 12 }}>#{i + 1}</div>

                      {/* Section */}
                      <div style={{ color: BE.textMute, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {q.subject.slice(0, 10)}
                      </div>

                      {/* Question preview */}
                      <div style={{ color: BE.text, fontSize: 13, fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {preview.slice(0, 120)}{preview.length > 120 ? "…" : ""}
                      </div>

                      {/* Result badge */}
                      <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: statusColor, letterSpacing: "0.04em" }}>
                        {status === "correct" ? "CORRECT" : status === "incorrect" ? "WRONG" : "SKIPPED"}
                      </div>

                      {/* Your → Ans */}
                      <div style={{ color: BE.textMute, fontFamily: BE.mono, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: status === "incorrect" ? BE.bad : BE.textMute }}>{userShort}</span>
                        <span style={{ opacity: 0.4 }}>→</span>
                        <span style={{ color: status === "incorrect" ? BE.good : BE.textMute }}>{corrShort}</span>
                      </div>

                      {/* Time */}
                      <div style={{ color: q.timeSpentSecs > 180 ? BE.warn : BE.textMute, fontFamily: BE.mono, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        {q.timeSpentSecs > 180 && <Clock size={11} />}
                        {fmtTime(q.timeSpentSecs)}
                      </div>

                      {/* Marks */}
                      <div style={{ color: marksColor, fontWeight: 700, fontFamily: BE.mono, fontSize: 13 }}>{marksVal}</div>

                      {/* Topic */}
                      <div style={{ overflow: "hidden" }}>
                        {q.topic && q.topic !== "Uncategorized" && q.topic !== "General" ? (
                          <span style={{
                            display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px",
                            borderRadius: 4, background: BE.accentSoft, color: BE.accent,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                          }}>
                            {q.topic}
                          </span>
                        ) : (
                          <span style={{ color: BE.textMute, fontSize: 11 }}>—</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <ExpandedQuestion q={q} status={status} statusColor={statusColor} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ─────────────── Per-question timing strip ─────────────── */
function QuestionTimingStrip({ questions }: { questions: ResultData["questions"] }) {
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
          {/* Bars */}
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

          {/* X-axis ticks */}
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

      {/* Summary / hover detail — same vertical space either way */}
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

/* ─────────────── Next Actions ─────────────── */
function NextActions({ result, onRestart }: { result: ResultData; onRestart: () => void }) {
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

/* ─────────────── Expanded question detail ─────────────── */
function ExpandedQuestion({ q, status, statusColor }: {
  q: ResultData["questions"][number];
  status: string;
  statusColor: string;
}) {
  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const correctLetters = new Set(
    (q.correct_answer || "").split(/[;,]/).map(l => l.trim().toUpperCase()).filter(Boolean)
  );
  const userLetters = new Set(
    (q.user_answer || "").split(/[;,]/).map(l => l.trim().toUpperCase()).filter(Boolean)
  );

  return (
    <div style={{ padding: "0 24px 24px", borderTop: `1px solid ${BE.line}`, background: "rgba(0,0,0,0.18)" }}>
      <div className="rounded-xl border mt-5 p-6 space-y-6" style={{ borderColor: BE.line, background: "var(--surface, #111)" }}>

        {/* Full question */}
        <div style={{ fontSize: 15, lineHeight: 1.7, color: BE.text }}>
          <MathRenderer content={q.question_text} />
        </div>

        {/* Options */}
        {q.options && q.question_type !== "NAT" && (
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const letter = optionLetters[oi];
              const isCorrect = correctLetters.has(letter);
              const isUser = userLetters.has(letter);
              const isWrongUser = isUser && !isCorrect;

              let bg = "rgba(255,255,255,0.03)";
              let border = BE.line;
              let letterBg = "rgba(255,255,255,0.05)";
              let letterColor = BE.textMute;
              let textColor = BE.textDim;

              if (isCorrect) {
                bg = BE.good + "14";
                border = BE.good + "55";
                letterBg = BE.good;
                letterColor = "#fff";
                textColor = BE.text;
              } else if (isWrongUser) {
                bg = BE.bad + "14";
                border = BE.bad + "55";
                letterBg = BE.bad;
                letterColor = "#fff";
                textColor = BE.text;
              }

              return (
                <div key={oi} className="flex items-start gap-3 p-3 rounded-lg border" style={{ background: bg, borderColor: border }}>
                  <div className="flex items-center justify-center rounded-md text-xs font-bold shrink-0 mt-0.5" style={{ width: 26, height: 26, background: letterBg, color: letterColor, fontFamily: BE.mono }}>
                    {letter}
                  </div>
                  <div style={{ fontSize: 14, color: textColor, paddingTop: 2 }}>
                    <MathRenderer content={typeof opt === "string" ? opt.replace(/^[A-F]\.\s*/, "") : String(opt)} />
                  </div>
                  {isCorrect && <CheckCircle2 size={15} className="shrink-0 ml-auto mt-1" style={{ color: BE.good }} />}
                  {isWrongUser && !isCorrect && <XCircle size={15} className="shrink-0 ml-auto mt-1" style={{ color: BE.bad }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* NAT answer comparison */}
        {q.question_type === "NAT" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border" style={{ borderColor: status === "correct" ? BE.good + "55" : BE.bad + "55", background: status === "correct" ? BE.good + "10" : BE.bad + "10" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", marginBottom: 6 }}>Your Answer</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: BE.text, fontFamily: BE.mono }}>{q.user_answer ?? "—"}</div>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: BE.good + "55", background: BE.good + "10" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", marginBottom: 6 }}>Correct Answer</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: BE.good, fontFamily: BE.mono }}>{q.correct_answer}</div>
            </div>
          </div>
        )}

        {/* Explanation */}
        {q.explanation && (
          <div className="p-5 rounded-xl border-l-4" style={{ background: BE.accentSoft, borderColor: BE.accent }}>
            <div className="flex items-center gap-2 mb-2" style={{ fontSize: 11, fontWeight: 700, color: BE.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <Brain size={13} /> Solution
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.65, color: BE.textDim }}>
              <MathRenderer content={q.explanation} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
