"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import MathRenderer from "@/components/ui/MathRenderer";
import {
  Clock, ChevronLeft, ChevronRight, Flag, Send, Trophy,
  CheckCircle2, XCircle, MinusCircle, BarChart3, BookOpen, Loader2,
  AlertTriangle, ArrowLeft, ChevronDown,
} from "lucide-react";
import { trackPageView } from "@/lib/analytics";


/* ─────────────── Types ─────────────── */
interface Question {
  id: string;
  source: "pyq" | "subject_pyq";
  question_text: string;
  options: string[];
  question_type: string;
  marks: number;
  year: number;
  subject: string;
  images?: { index: number; filename: string }[] | null;
}

interface Answer {
  questionId: string;
  source: "pyq" | "subject_pyq";
  questionType: string;
  marks: number;
  userAnswer: string | null;
}

interface BreakdownItem {
  questionId: string;
  source: string;
  questionType: string;
  marks: number;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  isSkipped: boolean;
  explanation: string;
  questionText: string;
  options: string[];
}

interface ResultData {
  sessionId: string;
  score: number;
  maxScore: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  breakdown: BreakdownItem[];
}

type Phase = "start" | "loading" | "test" | "submitting" | "results";
type QStatus = "unseen" | "answered" | "skipped" | "review";

const TOTAL_SECS = 3 * 3600; // 3 hours

/* ─────────────── Timer util ─────────────── */
function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ─────────────── History Card ─────────────── */
function HistoryPanel({ onViewResult }: { onViewResult: (id: string) => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/test/history")
      .then(r => r.json())
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>Loading history…</div>;
  if (!sessions.length) return <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>No tests taken yet.</div>;

  return (
    <div className="space-y-3">
      {sessions.map((s, i) => {
        const pct = Math.round((s.score / s.max_score) * 100);
        const color = pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
        return (
          <div key={s.id} 
            onClick={() => onViewResult(s.id)}
            className="rounded-xl border p-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-white/5"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div>
              <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Test #{sessions.length - i}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {s.time_taken_secs ? ` · ${fmtTime(TOTAL_SECS - s.time_taken_secs)} taken` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold" style={{ color }}>
                {s.score}/{s.max_score}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                ✓ {s.correct_count} · ✗ {s.wrong_count} · — {s.skipped_count}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── Main Component ─────────────── */
export default function MockTestPage({ branch = "CSE" }: { branch?: string }) {
  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [statuses, setStatuses] = useState<Record<number, QStatus>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECS);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [msqSelections, setMsqSelections] = useState<Record<number, string[]>>({});
  const [natValues, setNatValues] = useState<Record<number, string>>({});
  const [mcqSelected, setMcqSelected] = useState<Record<number, string>>({});
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [mockTestId, setMockTestId] = useState<string | null>(null);
  const [mockTestTitle, setMockTestTitle] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstRender = useRef(true);


  const currentQuestion = questions[currentIdx];
  useEffect(() => {
    if (!currentQuestion?.id) return;
    const url = new URL(window.location.href);
    url.searchParams.set("q", currentQuestion.id);
    window.history.replaceState(null, "", url.toString());
    
    // Skip tracking on initial mount to avoid double-counting with the layout script
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    trackPageView();
  }, [currentQuestion?.id]);

  // Subject selection
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // Fetch available subjects on mount
  useEffect(() => {
    fetch(`/api/test/subjects?branch=${branch}`)
      .then(r => r.json())
      .then(d => setAvailableSubjects(d.subjects || []))
      .catch(() => {});
  }, []);

  /* Start timer */
  useEffect(() => {
    if (phase !== "test") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  /* Fetch Leaderboard on Results */
  useEffect(() => {
    if (phase === "results" && mockTestId) {
       fetch(`/api/test/leaderboard?testId=${mockTestId}`)
         .then(r => r.json())
         .then(d => setLeaderboard(d.leaderboard || []))
         .catch(console.error);
    }
  }, [phase, mockTestId]);

  /* Load questions */
  const startTest = async () => {
    setPhase("loading");
    setError(null);
    try {
      const params = new URLSearchParams();
      selectedSubjects.forEach(s => params.append("subject", s));
      const qs = params.toString();
      const url = qs ? `/api/test/generate?${qs}` : "/api/test/generate";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load questions");
      setQuestions(data.questions);
      setMockTestId(data.mockTestId || null);
      setMockTestTitle(data.title || "GATE Mock Test");
      setAnswers({});
      setStatuses({});
      setMsqSelections({});
      setNatValues({});
      setMcqSelected({});
      setMarkedForReview(new Set());
      setCurrentIdx(0);
      setTimeLeft(TOTAL_SECS);
      setPhase("test");
    } catch (e: any) {
      setError(e.message);
      setPhase("start");
    }
  };

  /* Load Past Result */
  const loadPastResult = async (sessionId: string) => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/test/history/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load past test");
      
      const s = data.session;
      setResult({
        sessionId: s.id,
        score: s.score,
        maxScore: s.max_score,
        correctCount: s.correct_count,
        wrongCount: s.wrong_count,
        skippedCount: s.skipped_count,
        breakdown: s.answers
      });
      setMockTestId(s.mock_test_id || null);
      setMockTestTitle(s.mock_test?.title || `Past Mock Test (${new Date(s.created_at).toLocaleDateString()})`);
      setPhase("results");
    } catch (e: any) {
      setError(e.message);
      setPhase("start");
    }
  };

  /* Build answers payload and submit */
  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        const ok = window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`);
        if (!ok) return;
      }
    }
    clearInterval(timerRef.current!);
    setPhase("submitting");

    const payload: Answer[] = questions.map((q, idx) => {
      const existing = answers[idx];
      if (existing) return existing;
      return {
        questionId: q.id,
        source: q.source,
        questionType: q.question_type,
        marks: q.marks,
        userAnswer: null,
      };
    });

    try {
      const res = await fetch("/api/test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, timeTakenSecs: TOTAL_SECS - timeLeft, mockTestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setResult(data);
      setPhase("results");
    } catch (e: any) {
      setError(e.message);
      setPhase("test");
    }
  }, [questions, answers, timeLeft]);

  /* Record answer for current question */
  const recordAnswer = (idx: number, q: Question, userAnswer: string | null) => {
    if (userAnswer === null || userAnswer.trim() === "") {
      const newAns = { ...answers };
      delete newAns[idx];
      setAnswers(newAns);
      setStatuses(prev => ({ ...prev, [idx]: "skipped" }));
    } else {
      setAnswers(prev => ({
        ...prev,
        [idx]: {
          questionId: q.id,
          source: q.source,
          questionType: q.question_type,
          marks: q.marks,
          userAnswer,
        },
      }));
      setStatuses(prev => ({ ...prev, [idx]: markedForReview.has(idx) ? "review" : "answered" }));
    }
  };

  const toggleMsq = (idx: number, letter: string) => {
    const cur = msqSelections[idx] || [];
    const next = cur.includes(letter) ? cur.filter(l => l !== letter) : [...cur, letter].sort();
    setMsqSelections(prev => ({ ...prev, [idx]: next }));
    const q = questions[idx];
    const answer = next.join(";");
    recordAnswer(idx, q, answer || null);
  };

  const handleMcqSelect = (idx: number, letter: string) => {
    setMcqSelected(prev => ({ ...prev, [idx]: letter }));
    recordAnswer(idx, questions[idx], letter);
  };

  const handleNatChange = (idx: number, val: string) => {
    setNatValues(prev => ({ ...prev, [idx]: val }));
    recordAnswer(idx, questions[idx], val || null);
  };

  const toggleReview = (idx: number) => {
    const newSet = new Set(markedForReview);
    if (newSet.has(idx)) {
      newSet.delete(idx);
      if (answers[idx]) setStatuses(prev => ({ ...prev, [idx]: "answered" }));
      else setStatuses(prev => ({ ...prev, [idx]: "skipped" }));
    } else {
      newSet.add(idx);
      setStatuses(prev => ({ ...prev, [idx]: "review" }));
    }
    setMarkedForReview(newSet);
  };

  const navigate = (next: number) => {
    const clamped = Math.max(0, Math.min(questions.length - 1, next));
    setCurrentIdx(clamped);
    setShowPalette(false);
  };

  /* ─── Status color ─── */
  const statusColor = (s: QStatus | undefined) => {
    if (s === "answered") return "#22c55e";
    if (s === "review") return "#f59e0b";
    if (s === "skipped") return "#ef4444";
    return undefined;
  };

  /* ─── Timer color ─── */
  const timerColor = timeLeft < 600 ? "#ef4444" : timeLeft < 1800 ? "#f59e0b" : "var(--text-primary)";

  const answeredCount = Object.keys(answers).length;

  /* ════════════════════════════════════════════
     START PHASE
  ════════════════════════════════════════════ */
  if (phase === "start" || phase === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: "var(--bg-base)" }}>
        <div className="max-w-2xl w-full space-y-6">

          {/* hero */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <BookOpen size={30} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              GATE CSE Mock Test
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              55 questions · 85 marks · 3 hours
            </p>
          </div>

          {/* Subject Selector */}
          <div className="rounded-2xl border p-5 space-y-3"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>Select Subjects</div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Choose subjects to focus on. Leave empty to select all subjects for a mixed GATE-style test.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableSubjects.map(s => {
                  const isSelected = selectedSubjects.includes(s);
                  return (
                      <button
                        key={s}
                        onClick={() => {
                            if (isSelected) {
                                setSelectedSubjects(prev => prev.filter(x => x !== s));
                            } else {
                                setSelectedSubjects(prev => [...prev, s]);
                            }
                        }}
                        className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                        style={{
                            background: isSelected ? "#6366f120" : "var(--bg-base)",
                            borderColor: isSelected ? "#6366f1" : "var(--border)",
                            color: isSelected ? "#818cf8" : "var(--text-secondary)",
                        }}
                      >
                        {s}
                      </button>
                  );
              })}
            </div>
            {selectedSubjects.length > 0 && (
              <div className="text-xs px-3 py-2 rounded-lg mt-3"
                style={{ background: "#6366f120", color: "#818cf8" }}>
                ✦ Questions will be from <strong>{selectedSubjects.join(", ")}</strong> only
              </div>
            )}
          </div>

          {/* rules */}
          <div className="rounded-2xl border p-6 space-y-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Exam Rules</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                ["MCQ", "1-mark → -⅓  |  2-mark → -⅔"],
                ["MSQ", "No negative marking"],
                ["NAT", "No negative marking"],
                ["Types", "~62% MCQ  ·  ~13% MSQ  ·  ~25% NAT"],
                ["Marks", "~22 questions × 1 mark  ·  ~33 questions × 2 marks"],
                ["Timer", "Auto-submits when 3:00:00 is up"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl p-3" style={{ background: "var(--bg-base)" }}>
                  <div className="font-medium" style={{ color: "var(--text-primary)" }}>{k}</div>
                  <div className="mt-0.5" style={{ color: "var(--text-muted)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl p-4 text-sm bg-red-500/10 text-red-400 border border-red-500/30">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button
            onClick={startTest}
            disabled={phase === "loading"}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-lg transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            {phase === "loading"
              ? <><Loader2 size={20} className="animate-spin" /> Loading questions…</>
              : selectedSubjects.length > 0
                ? `Start Topic Test (${selectedSubjects.length} subject${selectedSubjects.length > 1 ? "s" : ""}) →`
                : "Start Full Mock Test →"
            }
          </button>

          {/* history */}
          <div className="rounded-2xl border p-6 space-y-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Past Tests</h2>
            <HistoryPanel onViewResult={loadPastResult} />
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SUBMITTING
  ════════════════════════════════════════════ */
  if (phase === "submitting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="animate-spin text-amber-400" />
        <p className="text-lg" style={{ color: "var(--text-secondary)" }}>Evaluating answers…</p>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     RESULTS PHASE
  ════════════════════════════════════════════ */
  if (phase === "results" && result) {
    const pct = Math.round((result.score / result.maxScore) * 100);
    const grade = pct >= 80 ? "Excellent" : pct >= 65 ? "Good" : pct >= 50 ? "Average" : "Needs Work";
    const gradeColor = pct >= 80 ? "#22c55e" : pct >= 65 ? "#6366f1" : pct >= 50 ? "#f59e0b" : "#ef4444";

    return (
      <div className="min-h-screen py-12 px-4" style={{ background: "var(--bg-base)" }}>
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Score Card */}
          <div className="rounded-2xl border p-8 text-center space-y-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{ background: `${gradeColor}20` }}>
              <Trophy size={30} style={{ color: gradeColor }} />
            </div>
            <div>
              <div className="text-5xl font-bold" style={{ color: gradeColor }}>
                {result.score}
              </div>
              <div className="text-lg mt-1" style={{ color: "var(--text-muted)" }}>
                out of {result.maxScore} marks
              </div>
              <div className="text-xl font-semibold mt-2" style={{ color: gradeColor }}>{grade}</div>
              <div className="text-sm font-medium mt-1" style={{ color: "var(--text-secondary)" }}>{mockTestTitle}</div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { label: "Correct", value: result.correctCount, icon: CheckCircle2, color: "#22c55e" },
                { label: "Wrong", value: result.wrongCount, icon: XCircle, color: "#ef4444" },
                { label: "Skipped", value: result.skippedCount, icon: MinusCircle, color: "#94a3b8" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: "var(--bg-base)" }}>
                  <Icon size={20} style={{ color }} className="mx-auto mb-1" />
                  <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="rounded-2xl border p-6 space-y-4"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <h2 className="font-semibold text-lg flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Trophy size={20} className="text-yellow-400" /> 
                Leaderboard: {mockTestTitle}
              </h2>
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => {
                    const isTop3 = idx < 3;
                    const rColor = idx === 0 ? "#facc15" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "var(--text-muted)";
                    const rBg = idx === 0 ? "#facc1530" : idx === 1 ? "#94a3b830" : idx === 2 ? "#b4530930" : "var(--bg-card)";
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border"
                           style={{ background: "var(--bg-base)", borderColor: "var(--border)", opacity: entry.score === result.score ? 1 : 0.8 }}>
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                                   style={{ background: rBg, color: rColor }}>
                                  #{entry.rank}
                              </div>
                              <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{entry.user}</span>
                          </div>
                          <div className="text-right">
                             <div className="font-bold text-sm" style={{ color: "#22c55e" }}>{entry.score} <span className="text-xs font-normal opacity-70">marks</span></div>
                             <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{fmtTime(entry.timeTakenSecs || 0)}</div>
                          </div>
                      </div>
                    );
                })}
              </div>
            </div>
          )}

          {/* Per-question Review */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Question Review</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {result.breakdown.map((item, i) => {
                 const isCorrect = item.isCorrect;
                 const isSkipped = item.isSkipped;
                 return (
                   <div key={item.questionId} className="relative group/card h-[400px]">
                     <div className={`w-full flex flex-col p-4 rounded-2xl border-2 bg-white dark:bg-[#111] hover:shadow-xl transition-all text-left relative overflow-hidden h-full ${
                        isSkipped ? 'border-gray-100 dark:border-white/5 hover:border-gray-300' :
                        isCorrect ? 'border-green-100 dark:border-green-500/20 hover:border-green-300 hover:shadow-green-500/5' :
                        'border-red-100 dark:border-red-500/20 hover:border-red-300 hover:shadow-red-500/5'
                     }`}>
                       <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                         <div className="flex justify-between items-start mb-3">
                           <span className={`text-[10px] font-black transition-colors ${
                                isSkipped ? 'text-gray-300 dark:text-gray-500 group-hover/card:text-gray-400' :
                                isCorrect ? 'text-green-200 dark:text-green-800 group-hover/card:text-green-400' :
                                'text-red-200 dark:text-red-800 group-hover/card:text-red-400'
                           }`}>
                             #{i + 1}
                           </span>
                           <div className="flex items-center gap-1.5">
                             <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                               {item.source === 'pyq' || item.source === 'subject_pyq' ? 'PYQ' : 'AI'}
                             </span>
                             <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                               {item.questionType} · {item.marks}M
                             </span>
                           </div>
                         </div>

                         <MathRenderer 
                           content={item.questionText} 
                           className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-4" 
                         />

                         {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                            <div className="space-y-1 mb-4">
                               {item.options.map((opt, oi) => {
                                   const letter = ["A","B","C","D","E"][oi] || String(oi);
                                   return (
                                       <div key={oi} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-transparent">
                                          <span className="font-bold text-amber-500 shrink-0">{letter}.</span>
                                          <div className="min-w-0">
                                            <MathRenderer content={typeof opt === 'string' ? opt.replace(/^[A-E]\.\s*/, "") : String(opt)} />
                                          </div>
                                       </div>
                                   );
                               })}
                            </div>
                         )}

                       {!isSkipped && (
                         <div className="text-[10px] space-y-1 mt-2 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                           <div className="text-gray-500 dark:text-gray-400">
                             Your Answer:{" "}
                             <span className={isCorrect ? "text-green-500 font-black" : "text-red-400 font-black"}>
                               {item.userAnswer ?? "—"}
                             </span>
                           </div>
                           {!isCorrect && (
                             <div className="text-gray-500 dark:text-gray-400">
                               Correct Answer:{" "}
                               <span className="text-green-500 font-black">{item.correctAnswer}</span>
                             </div>
                           )}
                         </div>
                       )}

                       {item.explanation && (
                         <details className="text-[10px] text-gray-400 dark:text-gray-500 mb-4 group/details relative z-10 w-full">
                           <summary className="cursor-pointer hover:text-amber-500 font-black uppercase tracking-widest sticky top-0 bg-white dark:bg-[#111] py-1">
                             Show Explanation
                           </summary>
                           <div className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed font-medium p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                             <MathRenderer content={item.explanation} />
                           </div>
                         </details>
                       )}
                       </div> {/* end of scrollable area */}

                       <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/5 shrink-0 z-10 bg-white dark:bg-[#111]">
                         {isSkipped ? (
                           <span className="text-[10px] font-black text-gray-400 flex items-center gap-1 uppercase tracking-wider">
                             <MinusCircle size={12} /> Skipped (0)
                           </span>
                         ) : (
                           <span className={`text-[10px] font-black flex items-center gap-1 uppercase tracking-wider ${
                             isCorrect ? "text-green-500" : "text-red-400"
                           }`}>
                             {isCorrect ? (
                               <><CheckCircle2 size={12} /> Correct (+{item.marks})</>
                             ) : (
                               <><XCircle size={12} /> Wrong {item.questionType === 'MCQ' ? `(-${item.marks===1 ? '0.33' : '0.66'})` : '(0)'}</>
                             )}
                           </span>
                         )}
                       </div>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>

          <button onClick={() => { setPhase("start"); setResult(null); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <ArrowLeft size={18} /> Take Another Test
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     TEST PHASE
  ════════════════════════════════════════════ */
  if (phase !== "test" || questions.length === 0) return null;

  const q = questions[currentIdx];
  const qStatus = statuses[currentIdx];
  const optionLetters = ["A", "B", "C", "D", "E"];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-50 border-b px-4 py-2 flex items-center justify-between gap-4"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold"
            style={{ background: "var(--bg-base)", color: timerColor }}>
            <Clock size={16} />
            {fmtTime(timeLeft)}
          </div>
          <div className="hidden sm:flex items-center gap-1 text-sm" style={{ color: "var(--text-muted)" }}>
            <CheckCircle2 size={14} className="text-green-400" />
            {answeredCount}/{questions.length}
          </div>
        </div>

        <div className="font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>
          Q{currentIdx + 1} of {questions.length}
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#6366f120", color: "#818cf8" }}>
            {q.marks}M · {q.question_type}
          </span>
        </div>

        <button onClick={() => setShowPalette(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-base)" }}>
          <BarChart3 size={15} /> Palette
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Palette sidebar (desktop) ── */}
        <aside className="hidden lg:flex flex-col w-64 border-r p-4 gap-3 overflow-y-auto"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Question Palette</div>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((_, i) => {
              const s = statuses[i];
              const isCur = i === currentIdx;
              const bg = isCur ? "#6366f1" : s === "answered" ? "#22c55e" : s === "review" ? "#f59e0b" : s === "skipped" ? "#ef444480" : "var(--bg-base)";
              return (
                <button key={i} onClick={() => navigate(i)}
                  className="w-9 h-9 rounded-lg text-xs font-bold border transition-all hover:scale-105"
                  style={{
                    background: bg,
                    color: (isCur || s === "answered" || s === "review") ? "#fff" : "var(--text-muted)",
                    borderColor: isCur ? "#6366f1" : "var(--border)",
                  }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5 text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            {[["#22c55e", "Answered"], ["#f59e0b", "Marked Review"], ["#ef4444", "Skipped"], ["#6366f1", "Current"]].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: c }} />
                {l}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Mobile palette overlay ── */}
        {showPalette && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowPalette(false)}>
            <div className="absolute right-0 top-[100px] bottom-0 w-72 border-l p-4 overflow-y-auto"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              onClick={e => e.stopPropagation()}>
              <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Question Palette</div>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, i) => {
                  const s = statuses[i];
                  const isCur = i === currentIdx;
                  const bg = isCur ? "#6366f1" : s === "answered" ? "#22c55e" : s === "review" ? "#f59e0b" : s === "skipped" ? "#ef444480" : "var(--bg-base)";
                  return (
                    <button key={i} onClick={() => navigate(i)}
                      className="w-10 h-10 rounded-lg text-xs font-bold border"
                      style={{
                        background: bg,
                        color: (isCur || s === "answered" || s === "review") ? "#fff" : "var(--text-muted)",
                        borderColor: "var(--border)",
                      }}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Main question area ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Question text */}
            <div className="rounded-2xl border p-6"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="text-xs mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <span className="px-2 py-0.5 rounded-full" style={{ background: "#6366f120", color: "#818cf8" }}>
                  {q.subject}
                </span>
                <span>{q.year}</span>
              </div>
              <div className="text-base leading-relaxed" style={{ color: "var(--text-primary)" }}>
                <MathRenderer content={q.question_text} />
              </div>
            </div>

            {/* Answer area */}
            <div className="rounded-2xl border p-6 space-y-3"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                {q.question_type === "MSQ" ? "Select all that apply:" : q.question_type === "NAT" ? "Enter your answer:" : "Select one:"}
              </div>

              {/* MCQ */}
              {q.question_type === "MCQ" && Array.isArray(q.options) && q.options.map((opt, oi) => {
                const letter = optionLetters[oi] || String(oi);
                const isSelected = mcqSelected[currentIdx] === letter;
                return (
                  <button key={oi} onClick={() => handleMcqSelect(currentIdx, letter)}
                    className="w-full text-left rounded-xl px-4 py-3 border text-sm transition-all"
                    style={{
                      background: isSelected ? "#6366f120" : "var(--bg-base)",
                      borderColor: isSelected ? "#6366f1" : "var(--border)",
                      color: "var(--text-primary)",
                    }}>
                    <span className="font-bold mr-2" style={{ color: "#818cf8" }}>{letter}.</span>
                    <MathRenderer content={typeof opt === "string" ? opt.replace(/^[A-E]\.\s*/, "") : String(opt)} />
                  </button>
                );
              })}

              {/* MSQ */}
              {q.question_type === "MSQ" && Array.isArray(q.options) && q.options.map((opt, oi) => {
                const letter = optionLetters[oi] || String(oi);
                const isSelected = (msqSelections[currentIdx] || []).includes(letter);
                return (
                  <button key={oi} onClick={() => toggleMsq(currentIdx, letter)}
                    className="w-full text-left rounded-xl px-4 py-3 border text-sm transition-all"
                    style={{
                      background: isSelected ? "#6366f120" : "var(--bg-base)",
                      borderColor: isSelected ? "#6366f1" : "var(--border)",
                      color: "var(--text-primary)",
                    }}>
                    <span className="font-bold mr-2" style={{ color: "#818cf8" }}>{letter}.</span>
                    <MathRenderer content={typeof opt === "string" ? opt.replace(/^[A-E]\.\s*/, "") : String(opt)} />
                  </button>
                );
              })}

              {/* NAT */}
              {q.question_type === "NAT" && (
                <input
                  type="number"
                  step="any"
                  placeholder="Type your numerical answer..."
                  value={natValues[currentIdx] || ""}
                  onChange={e => handleNatChange(currentIdx, e.target.value)}
                  className="w-full rounded-xl px-4 py-3 border text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(currentIdx - 1)} disabled={currentIdx === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border disabled:opacity-40 transition-all hover:bg-white/5"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  <ChevronLeft size={16} /> Prev
                </button>
                <button onClick={() => navigate(currentIdx + 1)} disabled={currentIdx === questions.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border disabled:opacity-40 transition-all hover:bg-white/5"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  Next <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => toggleReview(currentIdx)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition-all"
                  style={{
                    borderColor: markedForReview.has(currentIdx) ? "#f59e0b" : "var(--border)",
                    color: markedForReview.has(currentIdx) ? "#f59e0b" : "var(--text-muted)",
                    background: markedForReview.has(currentIdx) ? "#f59e0b15" : undefined,
                  }}>
                  <Flag size={15} /> {markedForReview.has(currentIdx) ? "Unmark" : "Mark Review"}
                </button>

                <button onClick={() => handleSubmit(false)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  <Send size={15} /> Submit
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
