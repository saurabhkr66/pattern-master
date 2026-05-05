"use client";
import { useState, useMemo } from "react";
import {
  BarChart3, CheckCircle2, XCircle, AlertCircle,
  ArrowRight, Search, Filter, ChevronDown, RotateCcw,
  Target, Brain, TrendingUp
} from "lucide-react";
import Link from "next/link";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";

/* ─────────────── Types ─────────────── */
export interface ResultData {
  examType?: string;
  score: number;
  maxScore: number;
  accuracy: number; // 0-100
  timeTakenSecs: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  sectionBreakdown?: {
    name: string;
    score: number;
    max: number;
    correct: number;
    total: number;
    accuracy: number;
    timeSpentSecs: number;
    topics: {
      topic: string;
      score: number;
      max: number;
      correct: number;
      total: number;
      accuracy: number;
      timeSpentSecs: number;
    }[];
  }[];
  subjectBreakdown: {
    subject: string;
    score: number;
    max: number;
    correct: number;
    total: number;
    accuracy: number;
    timeSpentSecs: number;
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
    timeSpentSecs: number;
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

function resolveShortAnswer(answer: string | null, type: string): string {
  if (!answer) return '—';
  if (type === 'MCQ') return answer.trim().toUpperCase();
  if (type === 'MSQ') return answer.split(';').map(l => l.trim().toUpperCase()).join(',');
  return answer;
}

function fmtShortTimer(secs: number): string {
  if (secs == null) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function TestAnalysis({ result, onRestart }: Props) {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unattempted">("all");
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [expandedSec, setExpandedSec] = useState<string | null>(null);

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

  const renderBarList = (title: string, sections: any[]) => {
    if (!sections || sections.length === 0) return null;
    return (
      <div className="mb-10 last:mb-0">
        <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          {title}
        </div>
        <div className="space-y-6">
          {sections.map((sec, i) => {
            const accColor = sec.accuracy > 70 ? BE.good : sec.accuracy > 40 ? BE.warn : BE.bad;
            const isExpanded = expandedSec === sec.name;
            return (
              <div key={i} className="group">
                <div 
                  className="cursor-pointer transition-colors p-2 -mx-2 rounded-lg hover:bg-white/5"
                  onClick={() => setExpandedSec(isExpanded ? null : sec.name)}
                >
                  <div className="flex justify-between items-end mb-2">
                    <div style={{ fontSize: 15, fontWeight: 600, color: BE.text }} className="flex items-center gap-2">
                      {sec.name}
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: BE.textMute }} />
                    </div>
                    <div className="flex items-center gap-4" style={{ fontFamily: BE.mono, fontSize: 13, fontWeight: 600 }}>
                      <div style={{ color: BE.text }}>{sec.score.toFixed(1).replace(/\.0$/, '')} <span style={{ color: BE.textMute }}>/ {sec.max}</span></div>
                      <div style={{ color: BE.textMute }}>{sec.correct}/{sec.total} Q</div>
                      <div style={{ color: BE.textMute }}>{fmtShortTimer(sec.timeSpentSecs)}</div>
                      <div style={{ color: accColor, fontWeight: 700 }}>{sec.accuracy.toFixed(0)}%</div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sec.accuracy}%`, background: accColor }} />
                  </div>
                </div>
                
                {/* Expandable Topics */}
                {isExpanded && sec.topics && sec.topics.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 space-y-4" style={{ borderColor: BE.line }}>
                    {sec.topics.map((t: any, j: number) => {
                      const tAccColor = t.accuracy > 70 ? BE.good : t.accuracy > 40 ? BE.warn : BE.bad;
                      return (
                        <div key={j}>
                          <div className="flex justify-between items-end mb-1">
                            <div style={{ fontSize: 13, fontWeight: 600, color: BE.textMute }}>{t.topic}</div>
                            <div className="flex items-center gap-4" style={{ fontFamily: BE.mono, fontSize: 11, fontWeight: 600 }}>
                              <div style={{ color: BE.textMute }}>{t.score.toFixed(1).replace(/\.0$/, '')} <span style={{ color: BE.textDim }}>/ {t.max}</span></div>
                              <div style={{ color: BE.textDim }}>{t.correct}/{t.total} Q</div>
                              <div style={{ color: BE.textDim }}>{fmtShortTimer(t.timeSpentSecs)}</div>
                              <div style={{ color: tAccColor, fontWeight: 700 }}>{t.accuracy.toFixed(0)}%</div>
                            </div>
                          </div>
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${t.accuracy}%`, background: tAccColor }} />
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

        {/* ── BREAKDOWNS ── */}
        <section className="be-card p-6 md:p-10 border" style={{ borderColor: BE.line }}>
          {renderBarList("Paper Sections", result.sectionBreakdown || [])}
        </section>

        {/* ── QUESTION-WISE BREAKDOWN ── */}
        <section className="be-card overflow-hidden border" style={{ borderColor: BE.line }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 md:py-4 border-b" style={{ borderColor: BE.line, background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center gap-3">
              <h2 style={{ fontFamily: BE.serif, fontSize: 16, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                QUESTION-WISE BREAKDOWN · {filteredQs.length}
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-[12px] font-bold" style={{ color: BE.warn }}>
                {result.incorrect} wrong <span style={{ color: BE.textMute }}>·</span>
              </div>
              <div className="flex bg-surface rounded-lg p-1 border" style={{ borderColor: BE.line, background: 'rgba(255,255,255,0.02)' }}>
                {['all', 'correct', 'incorrect', 'unattempted'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className="px-3 py-1.5 rounded-md text-[11px] font-bold capitalize transition-all"
                    style={{ background: filter === f ? BE.surface : 'transparent', color: filter === f ? '#fff' : BE.textMute }}
                  >
                    {f === 'unattempted' ? 'Skipped' : f === 'incorrect' ? 'Wrong' : f}
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

          <div className="w-full overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Table Header */}
              <div className="grid grid-cols-[3rem_6rem_1fr_6rem_8rem_5rem_4rem] gap-4 px-6 py-3 border-b text-[10px] font-bold tracking-wider" style={{ borderColor: BE.line, color: BE.textMute, textTransform: 'uppercase', background: 'rgba(0,0,0,0.1)' }}>
                <div>Q#</div>
                <div>SECTION</div>
                <div>QUESTION</div>
                <div>RESULT</div>
                <div>YOUR → ANS</div>
                <div>TIME</div>
                <div>MARKS</div>
              </div>
              
              {/* Table Body */}
              <div className="flex flex-col">
                {filteredQs.map((q, i) => {
                  const status = q.user_answer === null ? 'skipped' : q.is_correct ? 'correct' : 'incorrect';
                  const statusColor = status === 'correct' ? BE.good : status === 'incorrect' ? BE.bad : BE.textMute;
                  const isExpanded = expandedQId === q.id;
                  
                  const shortUserAns = resolveShortAnswer(q.user_answer, q.question_type);
                  const shortCorrAns = resolveShortAnswer(q.correct_answer, q.question_type);
                  
                  return (
                    <div key={q.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: BE.line, background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <div 
                        className="grid grid-cols-[3rem_6rem_1fr_6rem_8rem_5rem_4rem] gap-4 px-6 py-4 cursor-pointer items-center text-[13px]"
                        onClick={() => setExpandedQId(isExpanded ? null : q.id)}
                      >
                        <div style={{ color: BE.textMute, fontFamily: BE.mono, fontWeight: 600 }}>#{i + 1}</div>
                        <div style={{ color: BE.textMute, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{q.subject.slice(0,12)}</div>
                        <div className="font-medium text-white" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', whiteSpace: 'normal', overflow: 'hidden' }}>
                          {q.question_text.replace(/<[^>]+>/g, '').slice(0, 100)}...
                        </div>
                        <div style={{ color: statusColor, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{status === 'incorrect' ? 'WRONG' : status}</div>
                        <div style={{ color: BE.textMute, fontFamily: BE.mono, fontSize: 12 }}>
                          {shortUserAns} <span style={{ opacity: 0.5, margin: '0 4px' }}>→</span> {shortCorrAns}
                        </div>
                        <div style={{ color: BE.textMute, fontFamily: BE.mono, fontSize: 12 }}>{fmtShortTimer(q.timeSpentSecs)}</div>
                        <div style={{ color: status === 'correct' ? BE.good : status === 'incorrect' ? BE.bad : BE.textMute, fontWeight: 700, fontFamily: BE.mono }}>
                          {status === 'correct' ? `+${q.marks}` : status === 'incorrect' && q.question_type === 'MCQ' ? `-${(q.marks / 3).toFixed(2).replace(/\.00$/, '')}` : '0'}
                        </div>
                      </div>
                      
                      {/* Expanded View */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 border-t bg-black/20" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                          <div className="p-6 space-y-6 rounded-xl border mt-4" style={{ borderColor: BE.line, background: BE.surface }}>
                            <div style={{ fontSize: 15, lineHeight: 1.6, color: BE.text }}><MathRenderer content={q.question_text} /></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-base)', borderColor: BE.line }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', marginBottom: 8 }}>Your Answer</div>
                                <div className="flex items-start gap-3">
                                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: statusColor, color: status === 'skipped' ? BE.text : '#fff' }}>
                                    {status === 'correct' ? <CheckCircle2 size={14} /> : status === 'incorrect' ? <XCircle size={14} /> : <AlertCircle size={14} />}
                                  </div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>{resolveAnswer(q.user_answer, q.options, q.question_type)}</div>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-base)', borderColor: BE.line }}>
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
                                <div style={{ fontSize: 13, lineHeight: 1.6, color: BE.textDim }}><MathRenderer content={q.explanation} /></div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
