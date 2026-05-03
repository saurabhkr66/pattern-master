"use client";
import { useState, useMemo } from "react";
import {
  BarChart3, CheckCircle2, XCircle, AlertCircle,
  ArrowRight, Search, Filter, ChevronDown, RotateCcw,
  Target, Brain, TrendingUp
} from "lucide-react";
import Link from "next/link";
import { BE } from "@/lib/theme";
import { MathText } from "@/components/MathText";

/* ─────────────── Types ─────────────── */
export interface ResultData {
  score: number;
  maxScore: number;
  accuracy: number; // 0-100
  timeTakenSecs: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  subjectBreakdown: {
    subject: string;
    score: number;
    max: number;
    accuracy: number;
  }[];
  questions: {
    id: string;
    question_text: string;
    options: string[] | null;
    question_type: string;
    correct_answer: string;
    user_answer: string | null;
    is_correct: boolean | null;
    marks: number;
    subject: string;
    explanation?: string;
  }[];
}

interface Props {
  result: ResultData;
  onRestart: () => void;
}

function resolveAnswer(answer: string | null, options: string[] | null, type: string): string {
  if (!answer) return 'Not Attempted';
  if (type === 'NAT') return answer;
  if (type === 'MCQ') {
    const idx = answer.trim().toUpperCase().charCodeAt(0) - 65;
    const text = options?.[idx];
    return text ? `${answer.trim().toUpperCase()}. ${text.replace(/^[A-E]\.\s*/, '')}` : answer;
  }
  if (type === 'MSQ') {
    return answer.split(';').map(letter => {
      const idx = letter.trim().toUpperCase().charCodeAt(0) - 65;
      const text = options?.[idx];
      return text ? `${letter.trim().toUpperCase()}. ${text.replace(/^[A-E]\.\s*/, '')}` : letter.trim().toUpperCase();
    }).join(', ');
  }
  return answer;
}

export default function TestAnalysis({ result, onRestart }: Props) {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unattempted">("all");
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");

  const filteredQs = useMemo(() => {
    return result.questions.filter((q) => {
      const matchFilter =
        filter === "all" ||
        (filter === "correct" && q.is_correct === true) ||
        (filter === "incorrect" && q.is_correct === false) ||
        (filter === "unattempted" && q.user_answer === null);
      const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase());
      const matchSubject = selectedSubject === "All Subjects" || q.subject === selectedSubject;
      return matchFilter && matchSearch && matchSubject;
    });
  }, [result.questions, filter, search, selectedSubject]);

  const scorePercent = result.maxScore > 0 ? (result.score / result.maxScore) * 100 : 0;
  const circleColor = scorePercent >= 66 ? BE.good : scorePercent >= 33 ? BE.warn : BE.bad;

  const subjects = ["All Subjects", ...result.subjectBreakdown.map(s => s.subject)];

  return (
    <div className="be-screen flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 space-y-10">

        {/* ── SCORE OVERVIEW ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 be-card p-8 flex flex-col md:flex-row items-center gap-10">
            <div className="relative w-48 h-48 shrink-0">
               <svg className="w-full h-full -rotate-90">
                 <circle cx="96" cy="96" r="88" fill="none" stroke={BE.line} strokeWidth="12" />
                 <circle cx="96" cy="96" r="88" fill="none" stroke={circleColor} strokeWidth="12" strokeDasharray={552} strokeDashoffset={552 - (552 * result.score) / result.maxScore} strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div style={{ fontSize: 42, fontWeight: 800, color: BE.text, fontFamily: BE.mono }}>{result.score.toFixed(1)}</div>
                 <div style={{ fontSize: 12, fontWeight: 600, color: BE.textMute }}>OUT OF {result.maxScore}</div>
               </div>
            </div>

            <div className="flex-1 space-y-6 text-center md:text-left w-full">
               <div>
                 <h1 style={{ fontFamily: BE.serif, fontSize: 32, fontWeight: 700, color: BE.text }}>Test Performance</h1>
                 <p style={{ fontSize: 14, color: BE.textDim }}>You've completed the evaluation. Here's a breakdown of your knowledge gaps.</p>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 {[
                   { label: 'Score', val: `${result.score.toFixed(1)} / ${result.maxScore}`, icon: <Target size={16} />, color: circleColor },
                   { label: 'Correct', val: result.correct, icon: <CheckCircle2 size={16} />, color: BE.good },
                   { label: 'Wrong', val: result.incorrect, icon: <XCircle size={16} />, color: BE.bad },
                   { label: 'Unattempted', val: result.unattempted, icon: <AlertCircle size={16} />, color: BE.textMute },
                 ].map((s, i) => (
                   <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BE.line, background: 'rgba(255,255,255,0.02)' }}>
                     <div className="flex items-center gap-2 mb-1 justify-center md:justify-start" style={{ color: s.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                       {s.icon} {s.label}
                     </div>
                     <div style={{ fontSize: 18, fontWeight: 700, color: BE.text, fontFamily: BE.mono }}>{s.val}</div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="be-card p-8 flex flex-col justify-between">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', marginBottom: 16 }}>Insights</div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: BE.accentSoft, color: BE.accent }}><Brain size={20} /></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>Critical Subjects</div>
                    <p style={{ fontSize: 12, color: BE.textDim }}>Focus more on {result.subjectBreakdown.sort((a,b) => a.accuracy - b.accuracy)[0]?.subject || 'N/A'}.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: BE.good + '22', color: BE.good }}><TrendingUp size={20} /></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>Performance Trend</div>
                    <p style={{ fontSize: 12, color: BE.textDim }}>
                      Track your progress over time in your{' '}
                      <Link href="/dashboard" style={{ color: BE.accent, textDecoration: 'underline' }}>Dashboard</Link>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={onRestart} className="be-btn w-full flex items-center justify-center gap-2 mt-8">
              <RotateCcw size={16} /> Retake Test
            </button>
          </div>
        </section>

        {/* ── SUBJECT BREAKDOWN ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 size={20} style={{ color: BE.accent }} />
            <h2 style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, color: BE.text }}>Subject Analytics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.subjectBreakdown.map((s, i) => (
              <div key={i} className="be-card p-5 border" style={{ borderColor: BE.line }}>
                <div className="flex justify-between items-start mb-4">
                  <div style={{ fontSize: 14, fontWeight: 700, color: BE.text }}>{s.subject}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.accuracy > 70 ? BE.good : s.accuracy > 40 ? BE.warn : BE.bad }}>{s.accuracy.toFixed(0)}%</div>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: BE.line }}>
                  <div className="h-full transition-all duration-500" style={{ width: `${s.accuracy}%`, background: s.accuracy > 70 ? BE.good : s.accuracy > 40 ? BE.warn : BE.bad }} />
                </div>
                <div className="flex justify-between" style={{ fontSize: 11, color: BE.textMute, fontWeight: 600 }}>
                  <span>{s.score.toFixed(1)} / {s.max} Marks</span>
                  <span>{s.accuracy > 70 ? 'Proficient' : 'Needs Focus'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── QUESTION REVIEW ── */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Search size={20} style={{ color: BE.accent }} />
              <h2 style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, color: BE.text }}>Question Review</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-surface rounded-lg p-1 border" style={{ borderColor: BE.line, background: BE.surface }}>
                {['all', 'correct', 'incorrect', 'unattempted'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className="px-3 py-1.5 rounded-md text-[11px] font-bold capitalize transition-all"
                    style={{ background: filter === f ? BE.accent : 'transparent', color: filter === f ? '#fff' : BE.textMute }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="be-btn text-[11px] h-9"
                style={{ background: BE.surface }}
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredQs.map((q, i) => {
              const status = q.user_answer === null ? 'skipped' : q.is_correct ? 'correct' : 'incorrect';
              const statusColor = status === 'correct' ? BE.good : status === 'incorrect' ? BE.bad : BE.warn;

              return (
                <div key={q.id} className="be-card overflow-hidden border" style={{ borderColor: BE.line }}>
                  <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: BE.line, background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 12, fontWeight: 700, color: BE.textMute }}>Q{i + 1}</span>
                      <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background: statusColor + '22', color: statusColor }}>{status}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: BE.textMute }}>{q.subject}</span>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute }}>{q.marks} MARKS</div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div style={{ fontSize: 15, lineHeight: 1.6, color: BE.text }}><MathText content={q.question_text} /></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border" style={{ background: BE.surface, borderColor: BE.line }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', marginBottom: 8 }}>Your Answer</div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: statusColor, color: '#fff' }}>
                            {status === 'correct' ? <CheckCircle2 size={14} /> : status === 'incorrect' ? <XCircle size={14} /> : <AlertCircle size={14} />}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>{resolveAnswer(q.user_answer, q.options, q.question_type)}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border" style={{ background: BE.surface, borderColor: BE.line }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', marginBottom: 8 }}>Correct Answer</div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: BE.good, color: '#fff' }}><CheckCircle2 size={14} /></div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>{resolveAnswer(q.correct_answer, q.options, q.question_type)}</div>
                        </div>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="p-5 rounded-xl border-l-4" style={{ background: BE.accentSoft, borderColor: BE.accent }}>
                        <div className="flex items-center gap-2 mb-2" style={{ fontSize: 12, fontWeight: 700, color: BE.accent }}>
                          <Brain size={14} /> Solution Explanation
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: BE.textDim }}><MathText content={q.explanation} /></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
