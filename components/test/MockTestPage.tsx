"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2, AlertTriangle, Check, Trash2,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { deleteMockTest } from "@/app/actions/admin";
import {
  EXAM_CONFIGS, getExamConfig, fmtDuration,
  type ExamType, type ExamConfig,
} from "@/lib/examConfigs";
import TestEngine, { type TestQuestion, type SubmitAnswer } from "@/components/test/TestEngine";
import TestAnalysis, { type ResultData } from "@/components/test/TestAnalysis";
import { trackPageView } from "@/lib/analytics";
import { BE } from "@/lib/theme";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import { useSearchParams } from "next/navigation";
import React from "react";

/* ─────────────── Types ─────────────── */
type Phase = "setup" | "brief" | "loading" | "test" | "submitting" | "results";

interface SeededMock {
  id: string;
  mock_number: number;
  title: string;
  total_questions: number;
  max_score: number;
  duration_secs: number;
  exam_type?: string;
  branch?: string | null;
  session?: {
    id: string;
    score: number;
    max_score: number;
    correct_count: number;
    wrong_count: number;
    skipped_count: number;
    section_scores?: any;
    created_at: string;
  } | null;
}

/* ─────────────── Rail ─────────────── */
function MTRail({ phase }: { phase: Phase }) {
  const stepMap: Record<Phase, number> = {
    setup: 1, brief: 2, loading: 2, test: 3, submitting: 3, results: 4,
  };
  const step = stepMap[phase] ?? 1;
  const all = [
    { n: 1, label: 'Setup' },
    { n: 2, label: 'Brief' },
    { n: 3, label: 'Test' },
    { n: 4, label: 'Analysis' },
  ];
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-0 px-6 py-3.5 border-b shrink-0" style={{ borderColor: BE.line, background: BE.surface }}>
        {all.map((s, i) => {
          const active = s.n === step;
          const done = s.n < step;
          const color = active ? BE.accent : done ? BE.good : BE.textDim;
          return (
            <React.Fragment key={s.n}>
              <div className="flex items-center gap-2 shrink-0">
                <div style={{
                  width: 22, height: 22, borderRadius: 11, fontSize: 11, fontWeight: 600,
                  fontFamily: BE.mono, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? BE.accent : done ? BE.good + '22' : 'transparent',
                  color: active ? '#fff' : color,
                  border: `1px solid ${active || done ? color : BE.line}`,
                }}>{done ? '✓' : s.n}</div>
                <span style={{ fontSize: 11.5, fontWeight: 500, color, letterSpacing: '0.02em' }}>{s.label}</span>
              </div>
              {i < all.length - 1 && <div className="mx-2.5 flex-1 min-w-[12px] h-[1px]" style={{ background: BE.line }} />}
            </React.Fragment>
          );
        })}
      </div>
      {/* Mobile dots */}
      <div className="flex md:hidden items-center justify-between px-4 py-2.5 border-b shrink-0" style={{ borderColor: BE.line, background: BE.surface }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: BE.textMute }}>Step {step} of 4</div>
        <div className="flex items-center gap-1.5">
          {all.map((s) => {
            const active = s.n === step;
            const done = s.n < step;
            return (
              <div key={s.n} style={{
                width: active ? 16 : 8, height: 8, borderRadius: 4,
                background: active ? BE.accent : done ? BE.good : 'transparent',
                border: `1px solid ${active ? BE.accent : done ? BE.good : BE.line}`,
                transition: 'width 0.2s ease',
              }} />
            );
          })}
        </div>
      </div>
    </>
  );
}

function MTPage({ children, phase, maxWidth = 980 }: { children: React.ReactNode; phase: Phase; maxWidth?: number }) {
  return (
    <div className="be-screen flex flex-col min-h-full" style={{ background: 'var(--bg-base)' }}>
      <MTRail phase={phase} />
      <div className="flex-1 overflow-auto">
        <div style={{ maxWidth, margin: '0 auto', padding: '32px 24px 60px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ─────────────── Main component ─────────────── */
export default function MockTestPage() {
  const searchParams = useSearchParams();
  const urlTestId = searchParams.get("id");

  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedExam, setSelectedExam] = useState<ExamType | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"seeded" | "random" | null>(null);
  const [selectedMock, setSelectedMock] = useState<SeededMock | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [seededMocks, setSeededMocks] = useState<SeededMock[]>([]);
  const [briefAgreed, setBriefAgreed] = useState(false);
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdmin = checkIsAdmin(userEmail);

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [mockTestId, setMockTestId] = useState<string | null>(null);
  const [mockTestTitle, setMockTestTitle] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasAttemptedHydration = useRef(false);

  /* Deep-linking: Load test by ID if present in URL */
  useEffect(() => {
    if (urlTestId && phase === "setup" && !hasAttemptedHydration.current) {
      hasAttemptedHydration.current = true;
      setPhase("loading");
      fetch(`/api/test/mocks?id=${urlTestId}`)
        .then(r => r.json())
        .then(data => {
          if (data.mock) {
            const m = data.mock;
            setSelectedExam(m.exam_type as ExamType);
            setSelectedBranch(m.branch);
            setSelectedMode("seeded");
            setSelectedMock(m);
            setPhase("brief");
          } else {
            console.error("Mock test not found for ID:", urlTestId);
            setPhase("setup");
          }
        })
        .catch((err) => {
          console.error("Deep-linking fetch error:", err);
          setPhase("setup");
        });
    }
  }, [urlTestId, phase]);

  const config: ExamConfig | null = selectedExam
    ? getExamConfig(selectedExam, selectedBranch ?? undefined)
    : null;

  const hasBranches = !!(config?.branches?.length);

  /* fetch subjects + seeded mocks whenever exam/branch changes */
  useEffect(() => {
    if (!selectedExam) return;
    const params = new URLSearchParams({ exam_type: selectedExam });
    if (selectedBranch) params.set("branch", selectedBranch);
    fetch(`/api/test/subjects?${params}`)
      .then((r) => r.json())
      .then((d) => setAvailableSubjects(d.subjects ?? []))
      .catch(() => {});
    fetch(`/api/test/mocks?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const mocks = d.mocks ?? [];
        const sorted = [...mocks].sort((a, b) => {
          const aTaken = !!a.session;
          const bTaken = !!b.session;
          if (aTaken && !bTaken) return -1;
          if (!aTaken && bTaken) return 1;
          return a.mock_number - b.mock_number;
        });
        setSeededMocks(sorted);
      })
      .catch(() => {});
  }, [selectedExam, selectedBranch]);

  /* restore brief agreement from localStorage */
  useEffect(() => {
    if (phase === "brief") {
      try { if (localStorage.getItem("pm_brief_agreed") === "true") setBriefAgreed(true); }
      catch {}
    }
  }, [phase]);

  /* start test */
  const startTest = useCallback(async () => {
    if (!selectedExam || !selectedMode) return;
    setPhase("loading");
    setError(null);
    const params = new URLSearchParams({ exam_type: selectedExam, mode: selectedMode });
    if (selectedBranch) params.set("branch", selectedBranch);
    if (selectedMode === "seeded" && selectedMock) {
      params.set("mock_number", String(selectedMock.mock_number));
    }
    selectedSubjects.forEach((s) => params.append("subject", s));
    try {
      const res = await fetch(`/api/test/generate?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load questions");
      setQuestions(data.questions);
      setMockTestId(data.mockTestId ?? null);
      setMockTestTitle(data.title ?? config?.label ?? "Mock Test");
      setPhase("test");
      trackPageView();
    } catch (e: any) {
      setError(e.message);
      setPhase("brief");
    }
  }, [selectedExam, selectedBranch, selectedMode, selectedMock, selectedSubjects, config]);

  /* submit */
  const handleSubmit = useCallback(async (answers: SubmitAnswer[], timeTakenSecs: number) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mockTestId, answers, timeTakenSecs, examType: selectedExam, branch: selectedBranch }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const breakdown = data.breakdown || [];
      const accuracy = (data.correctCount + data.wrongCount) > 0
        ? (data.correctCount / (data.correctCount + data.wrongCount)) * 100 : 0;

      const sectionMap: Record<string, { 
        name: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number;
        topics: Record<string, { topic: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number; }>
      }> = {};
      const subjectMap: Record<string, { subject: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number }> = {};
      
      breakdown.forEach((q: any) => {
        const secName = q.sectionName || "Section";
        if (!sectionMap[secName]) sectionMap[secName] = { name: secName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0, topics: {} };
        const sec = sectionMap[secName];
        sec.max += q.marks; sec.total += 1;
        sec.timeSpentSecs += (q.timeSpentSecs || 0);
        if (q.isCorrect) { sec.score += q.marks; sec.correct += 1; }

        const topName = q.topic || "Uncategorized";
        if (!sec.topics[topName]) sec.topics[topName] = { topic: topName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0 };
        const top = sec.topics[topName];
        top.max += q.marks; top.total += 1;
        top.timeSpentSecs += (q.timeSpentSecs || 0);
        if (q.isCorrect) { top.score += q.marks; top.correct += 1; }

        const subName = q.subject || "General";
        if (!subjectMap[subName]) subjectMap[subName] = { subject: subName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0 };
        const s = subjectMap[subName];
        s.max += q.marks; s.total += 1;
        s.timeSpentSecs += (q.timeSpentSecs || 0);
        if (q.isCorrect) { s.score += q.marks; s.correct += 1; }
      });

      setResult({
        examType: selectedExam ?? undefined,
        score: data.score, maxScore: data.maxScore, accuracy,
        timeTakenSecs: data.timeTakenSecs,
        attempted: data.correctCount + data.wrongCount,
        correct: data.correctCount, incorrect: data.wrongCount, unattempted: data.skippedCount,
        sectionBreakdown: Object.values(sectionMap).map(s => ({
          name: s.name, score: s.score, max: s.max, correct: s.correct, total: s.total, timeSpentSecs: s.timeSpentSecs,
          accuracy: s.total > 0 ? (s.correct / s.total) * 100 : 0,
          topics: Object.values(s.topics).map(t => ({
            topic: t.topic, score: t.score, max: t.max, correct: t.correct, total: t.total, timeSpentSecs: t.timeSpentSecs,
            accuracy: t.total > 0 ? (t.correct / t.total) * 100 : 0,
          }))
        })),
        subjectBreakdown: Object.values(subjectMap).map(s => ({
          subject: s.subject, score: s.score, max: s.max, correct: s.correct, total: s.total, timeSpentSecs: s.timeSpentSecs,
          accuracy: s.total > 0 ? (s.correct / s.total) * 100 : 0,
        })),
        questions: breakdown.map((q: any) => ({
          id: q.questionId, question_text: q.questionText, options: q.options,
          question_type: q.questionType, correct_answer: q.correctAnswer,
          user_answer: q.userAnswer, is_correct: q.isCorrect,
          marks: q.marks, subject: q.subject || "General", explanation: q.explanation,
          timeSpentSecs: q.timeSpentSecs || 0,
        })),
      });
      setPhase("results");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [mockTestId, selectedExam, selectedBranch]);

  const handleRetake = () => {
    setPhase("setup");
    setSelectedMode(null); setSelectedMock(null); setBriefAgreed(false);
    setQuestions([]); setResult(null); setMockTestId(null);
    setSubmitError(null); setError(null);
  };

  const loadAnalysis = useCallback(async (mock: SeededMock) => {
    if (!mock.session?.id) return;
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/test/history/${mock.session.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load analysis");
      const s = data.session;
      const breakdown: any[] = Array.isArray(s.answers) ? s.answers : [];
      const sectionMap: Record<string, { 
        name: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number;
        topics: Record<string, { topic: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number; }>
      }> = {};
      const subjectMap: Record<string, { subject: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number }> = {};
      
      breakdown.forEach((q: any) => {
        const secName = q.sectionName || "Section";
        if (!sectionMap[secName]) sectionMap[secName] = { name: secName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0, topics: {} };
        const sec = sectionMap[secName];
        sec.max += q.marks; sec.total += 1;
        sec.timeSpentSecs += (q.timeSpentSecs || 0);
        if (q.isCorrect) { sec.score += q.marks; sec.correct += 1; }

        const topName = q.topic || "Uncategorized";
        if (!sec.topics[topName]) sec.topics[topName] = { topic: topName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0 };
        const top = sec.topics[topName];
        top.max += q.marks; top.total += 1;
        top.timeSpentSecs += (q.timeSpentSecs || 0);
        if (q.isCorrect) { top.score += q.marks; top.correct += 1; }

        const subName = q.subject || "General";
        if (!subjectMap[subName]) subjectMap[subName] = { subject: subName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0 };
        const sub = subjectMap[subName];
        sub.max += q.marks; sub.total += 1;
        sub.timeSpentSecs += (q.timeSpentSecs || 0);
        if (q.isCorrect) { sub.score += q.marks; sub.correct += 1; }
      });
      const accuracy = (s.correct_count + s.wrong_count) > 0
        ? (s.correct_count / (s.correct_count + s.wrong_count)) * 100 : 0;
      setMockTestTitle(s.mock_test?.title ?? mock.title);
      setResult({
        examType: s.exam_type,
        score: s.score, maxScore: s.max_score, accuracy,
        timeTakenSecs: s.time_taken_secs,
        attempted: s.correct_count + s.wrong_count,
        correct: s.correct_count, incorrect: s.wrong_count, unattempted: s.skipped_count,
        sectionBreakdown: Object.values(sectionMap).map(sec => ({
          name: sec.name, score: sec.score, max: sec.max, correct: sec.correct, total: sec.total, timeSpentSecs: sec.timeSpentSecs,
          accuracy: sec.total > 0 ? (sec.correct / sec.total) * 100 : 0,
          topics: Object.values(sec.topics).map(t => ({
            topic: t.topic, score: t.score, max: t.max, correct: t.correct, total: t.total, timeSpentSecs: t.timeSpentSecs,
            accuracy: t.total > 0 ? (t.correct / t.total) * 100 : 0,
          }))
        })),
        subjectBreakdown: Object.values(subjectMap).map(sub => ({
          subject: sub.subject, score: sub.score, max: sub.max, correct: sub.correct, total: sub.total, timeSpentSecs: sub.timeSpentSecs,
          accuracy: sub.total > 0 ? (sub.correct / sub.total) * 100 : 0,
        })),
        questions: breakdown.map((q: any) => ({
          id: q.questionId, question_text: q.questionText, options: q.options,
          question_type: q.questionType, correct_answer: q.correctAnswer,
          user_answer: q.userAnswer, is_correct: q.isCorrect,
          marks: q.marks, subject: q.subject || "General", explanation: q.explanation,
          timeSpentSecs: q.timeSpentSecs || 0,
        })),
      });
      setPhase("results");
    } catch (e: any) {
      setError(e.message);
      setPhase("setup");
    }
  }, []);

  const handleDeleteTest = async (mockId: string, title: string) => {
    if (!confirm(`Delete "${title}"? All sessions will be lost.`)) return;
    try {
      await deleteMockTest(mockId);
      setSeededMocks(prev => prev.filter(m => m.id !== mockId));
    } catch (err: any) { alert(err.message); }
  };

  /* ════════════════════════════════════
     STEP 1 — Setup (Exam + Branch + Mode + Config)
  ════════════════════════════════════ */
  if (phase === "setup") {
    const isSpec = selectedMode === "seeded";
    const isRandom = selectedMode === "random";

    // Determine if user can proceed to brief
    const canContinue = !!(
      selectedExam &&
      (!hasBranches || selectedBranch) &&
      selectedMode &&
      (!isSpec || selectedMock)
    );

    return (
      <MTPage phase={phase} maxWidth={1100}>
        {/* ── Section A: Exam ── */}
        <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Step 1 of 4 · Setup</div>
        <h1 style={{ fontFamily: BE.serif, fontWeight: 500, fontSize: 28, letterSpacing: '-0.6px', marginBottom: 20, color: BE.text }}>Configure your test.</h1>

        {/* Exam selection */}
        <div className="mb-6">
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Exam</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EXAM_CONFIGS.map((exam) => {
              const sel = selectedExam === exam.examType;
              return (
                <div
                  key={exam.examType}
                  onClick={() => {
                    setSelectedExam(exam.examType);
                    setSelectedBranch(null);
                    setSelectedMode(null);
                    setSelectedMock(null);
                  }}
                  className="border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm"
                  style={{
                    borderColor: sel ? BE.accent : BE.line,
                    borderWidth: sel ? 2 : 1,
                    background: sel ? `${BE.accent}10` : BE.surface,
                  }}
                >
                  <div style={{ fontFamily: BE.serif, fontSize: 18, fontWeight: 600, color: BE.text, marginBottom: 2 }}>{exam.label}</div>
                  <div style={{ fontSize: 11, color: BE.textDim, marginBottom: 8 }}>{exam.description}</div>
                  <div className="flex gap-2.5 pt-2 border-t" style={{ borderColor: BE.line, fontSize: 10, color: BE.textMute }}>
                    <span><span style={{ color: BE.text, fontFamily: BE.mono, fontWeight: 600 }}>{exam.totalQuestions}</span> Q</span>
                    <span><span style={{ color: BE.text, fontFamily: BE.mono, fontWeight: 600 }}>{Math.round(exam.durationSecs / 60)}</span> min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch selection — only when exam has branches */}
        {selectedExam && config && hasBranches && (
          <div className="mb-6">
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Branch</div>
            <div className="flex flex-wrap gap-2">
              {config.branches?.map((b) => {
                const sel = selectedBranch === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => { setSelectedBranch(b.id); setSelectedMode(null); setSelectedMock(null); }}
                    className="border rounded-lg px-3.5 py-2.5 cursor-pointer transition-all flex items-center gap-2.5"
                    style={{
                      borderColor: sel ? BE.accent : BE.line,
                      borderWidth: sel ? 2 : 1,
                      background: sel ? `${BE.accent}10` : BE.surface,
                    }}
                  >
                    <span style={{ fontFamily: BE.mono, fontSize: 12, fontWeight: 700, color: sel ? BE.accent : BE.textDim }}>{b.id}</span>
                    <span style={{ fontSize: 12, color: BE.text }}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode selection — shown once exam (and branch if needed) is picked */}
        {selectedExam && (!hasBranches || selectedBranch) && (
          <div className="mb-6">
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Mode</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Specialized */}
              <div
                onClick={() => { setSelectedMode("seeded"); setSelectedMock(null); }}
                className="border-2 rounded-xl p-4 cursor-pointer transition-all"
                style={{
                  borderColor: isSpec ? BE.accent : BE.line,
                  background: isSpec ? `${BE.accent}10` : BE.surface,
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isSpec ? BE.accentSoft : 'rgba(255,255,255,0.05)', color: isSpec ? BE.accent : BE.textDim }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
                  </div>
                  <div style={{ fontFamily: BE.serif, fontSize: 16, fontWeight: 600, color: BE.text }}>Specialized Mock</div>
                  {!selectedMode && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: BE.accent }}>REC</span>}
                </div>
                <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5 }}>Fixed past-paper set. Same questions every attempt — comparable scores.</div>
              </div>
              {/* Random */}
              <div
                onClick={() => { setSelectedMode("random"); setSelectedMock(null); }}
                className="border-2 rounded-xl p-4 cursor-pointer transition-all"
                style={{
                  borderColor: isRandom ? BE.accent : BE.line,
                  background: isRandom ? `${BE.accent}10` : BE.surface,
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isRandom ? BE.accentSoft : 'rgba(255,255,255,0.05)', color: isRandom ? BE.accent : BE.textDim }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
                  </div>
                  <div style={{ fontFamily: BE.serif, fontSize: 16, fontWeight: 600, color: BE.text }}>Random Test</div>
                </div>
                <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5 }}>Fresh paper from the bank. Filter by subjects. Great for daily drilling.</div>
              </div>
            </div>
          </div>
        )}

        {/* Config panel — shown once mode is picked */}
        {isSpec && (
          <div className="mb-6">
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Select Paper</div>
            {seededMocks.length === 0 ? (
              <div className="border border-dashed rounded-xl p-10 text-center" style={{ borderColor: BE.line }}>
                <div className="text-xl mb-2">📭</div>
                <div style={{ fontSize: 13, color: BE.textDim }}>No papers seeded yet.</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {seededMocks.map((m) => {
                  const taken = !!m.session;
                  const isSel = selectedMock?.mock_number === m.mock_number;
                  return (
                    <div
                      key={m.mock_number}
                      onClick={() => setSelectedMock(m)}
                      className="border rounded-xl p-3 cursor-pointer relative hover:shadow-sm transition-all group"
                      style={{ borderColor: isSel ? BE.accent : BE.line, borderWidth: isSel ? 2 : 1, background: isSel ? `${BE.accent}10` : BE.surface }}
                    >
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTest(m.id, m.title); }}
                          className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        ><Trash2 size={12} /></button>
                      )}
                      <div style={{ fontFamily: BE.mono, fontSize: 10, color: BE.textMute, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                        {m.mock_number}
                        {taken && <span className="ml-2" style={{ color: BE.good }}>● Done</span>}
                      </div>
                      <div style={{ fontFamily: BE.serif, fontSize: 15, fontWeight: 600, color: BE.text, marginBottom: 2 }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: BE.textDim }}>{m.total_questions} Q · {fmtDuration(m.duration_secs)}</div>
                      {taken && m.session && (
                        <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: BE.line }}>
                          <div style={{ fontFamily: BE.mono, fontSize: 11, fontWeight: 700, color: BE.text }}>
                            Score: {m.session.score} / {m.session.max_score}
                          </div>
                          {m.session.section_scores && Array.isArray(m.session.section_scores) && (
                            <div className="grid grid-cols-1 gap-0.5 pt-0.5 border-t border-dashed mt-1" style={{ borderColor: BE.line }}>
                              {m.session.section_scores.map((ss: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[9px] leading-tight">
                                  <div style={{ color: BE.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{ss.name}</div>
                                  <div style={{ fontWeight: 600, color: BE.textDim }}>{ss.score}/{ss.maxScore}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); loadAnalysis(m); }}
                            className="w-full mt-1 rounded-lg py-1 text-[10px] font-semibold transition-colors"
                            style={{ background: BE.accentSoft, color: BE.accent }}
                          >
                            View Analysis
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isRandom && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 mb-6">
            {/* Difficulty + stats */}
            <div className="flex flex-col gap-3">
              <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: BE.text, marginBottom: 8 }}>Difficulty mix</div>
                <div className="flex h-6 rounded-lg overflow-hidden mb-1">
                  <div className="flex items-center justify-center text-[10px] font-bold text-black" style={{ flex: 30, background: BE.good + '99' }}>Easy 30%</div>
                  <div className="flex items-center justify-center text-[10px] font-bold text-black" style={{ flex: 50, background: BE.warn + '99' }}>Medium 50%</div>
                  <div className="flex items-center justify-center text-[10px] font-bold text-white" style={{ flex: 20, background: BE.bad + '99' }}>Hard 20%</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="border rounded-xl p-3" style={{ borderColor: BE.line, background: BE.surface }}>
                  <div style={{ fontSize: 10, color: BE.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Questions</div>
                  <div style={{ fontFamily: BE.serif, fontSize: 28, fontWeight: 600, color: BE.text }}>{config?.totalQuestions}</div>
                </div>
                <div className="border rounded-xl p-3" style={{ borderColor: BE.line, background: BE.surface }}>
                  <div style={{ fontSize: 10, color: BE.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Duration</div>
                  <div style={{ fontFamily: BE.serif, fontSize: 28, fontWeight: 600, color: BE.text }}>{Math.round((config?.durationSecs ?? 0) / 60)}<span style={{ fontSize: 12, color: BE.textDim }}> min</span></div>
                </div>
              </div>
            </div>
            {/* Subject filter */}
            <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ fontSize: 12, fontWeight: 600, color: BE.text }}>Filter subjects <span style={{ color: BE.textMute, fontWeight: 400 }}>(optional)</span></div>
                <button className="be-btn text-[10px] px-2 py-1" onClick={() => setSelectedSubjects([])}>Clear</button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
                {availableSubjects.map((s) => {
                  const sel = selectedSubjects.includes(s);
                  return (
                    <div
                      key={s}
                      onClick={() => setSelectedSubjects(prev => sel ? prev.filter(x => x !== s) : [...prev, s])}
                      className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all"
                      style={{ borderColor: sel ? BE.accent : BE.line, background: sel ? BE.accentSoft : 'transparent' }}
                    >
                      <div className="w-3 h-3 rounded border flex items-center justify-center text-[9px] text-white shrink-0" style={{ borderColor: sel ? BE.accent : BE.line, background: sel ? BE.accent : 'transparent' }}>{sel && "✓"}</div>
                      <span style={{ fontSize: 12, color: BE.text }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t" style={{ borderColor: BE.line }}>
          <button
            className="be-btn be-btn-primary"
            disabled={!canContinue}
            onClick={() => { setBriefAgreed(false); setPhase("brief"); }}
            style={{ padding: '10px 24px', opacity: canContinue ? 1 : 0.4 }}
          >
            Continue →
          </button>
        </div>
      </MTPage>
    );
  }

  /* ════════════════════════════════════
     STEP 2 — Brief
  ════════════════════════════════════ */
  if (phase === "brief" && config) {
    const isSpec = selectedMode === "seeded";
    return (
      <MTPage phase={phase}>
        <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
          Step 2 of 4 · {isSpec ? 'Past paper' : 'Random test'}
        </div>
        <h1 style={{ fontFamily: BE.serif, fontWeight: 500, fontSize: 28, letterSpacing: '-0.6px', marginBottom: 4, color: BE.text }}>Read this. Then begin.</h1>
        <div style={{ fontSize: 13.5, color: BE.textDim, marginBottom: 20 }}>
          {isSpec ? `${selectedMock?.title} · ${config.label}` : `Custom paper · ${config.label}`}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3.5 mb-4">
          <div className="flex flex-col gap-2.5">
            <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Exam pattern</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <BriefStat label="Questions" val={isSpec ? String(selectedMock?.total_questions) : String(config.totalQuestions)} />
                <BriefStat label="Total marks" val={isSpec ? String(selectedMock?.max_score) : String(config.maxScore)} />
                <BriefStat label="Time" val={isSpec ? fmtDuration(selectedMock?.duration_secs ?? 0) : "3h"} />
                <BriefStat label="Sections" val={String(config.sections.length)} />
              </div>
            </div>
            <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Marking scheme</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <MarkRow type="MCQ" marks="+1 / +2" neg="−⅓ / −⅔" />
                <MarkRow type="MSQ" marks="+1 / +2" neg="No partial" />
                <MarkRow type="NAT" marks="+1 / +2" neg="No penalty" />
              </div>
            </div>
            <div className="border rounded-xl p-3.5 flex gap-2.5" style={{ borderColor: BE.warn + '33', background: `linear-gradient(135deg, ${BE.warn}08, transparent)` }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={BE.warn} strokeWidth="1.6" className="shrink-0 mt-0.5"><circle cx="9" cy="9" r="7.5"/><path d="M9 5v4M9 12v.5"/></svg>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: BE.text }}>Timer cannot be paused.</div>
                <div style={{ fontSize: 11.5, color: BE.textDim, lineHeight: 1.5 }}>Refreshing is fine — answers auto-save. Closing the tab won't stop the clock.</div>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Instructions</div>
            <ol className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed" style={{ color: BE.text }}>
              {[
                'Use the question palette to navigate freely.',
                'Mark for review to revisit later.',
                'Type numeric answers for NAT questions.',
                'A virtual calculator is available (Ctrl+K).',
                'Auto-saves every 8 seconds.',
                'You can change answers before final submit.',
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span style={{ fontFamily: BE.mono, fontSize: 10.5, color: BE.accent, fontWeight: 600, minWidth: 14 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div
          className="border rounded-xl p-3.5 flex items-center gap-2.5 cursor-pointer select-none mb-4"
          style={{ borderColor: briefAgreed ? BE.accent : BE.line, background: BE.surface }}
          onClick={() => setBriefAgreed(v => {
            const next = !v;
            try { localStorage.setItem("pm_brief_agreed", String(next)); } catch {}
            return next;
          })}
        >
          <div className="flex items-center justify-center rounded-[4px] shrink-0 border transition-all"
            style={{ width: 18, height: 18, background: briefAgreed ? BE.accent : 'transparent', borderColor: briefAgreed ? BE.accent : BE.line, color: '#fff' }}>
            {briefAgreed && <Check size={11} />}
          </div>
          <div style={{ fontSize: 12.5, color: BE.text }}>I have read the instructions and agree to abide by them.</div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg border text-sm text-red-500 bg-red-500/10" style={{ borderColor: BE.bad + '33' }}>{error}</div>}

        <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: BE.line }}>
          <button className="be-btn" onClick={() => { setError(null); setPhase("setup"); }}>← Back</button>
          <button className="be-btn be-btn-primary" disabled={!briefAgreed} onClick={startTest} style={{ padding: '11px 26px', fontSize: 14 }}>Begin Test →</button>
        </div>
      </MTPage>
    );
  }

  /* ════════════════════════════════════
     LOADING / SUBMITTING
  ════════════════════════════════════ */
  if (phase === "loading" || phase === "submitting") {
    return (
      <div className="be-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-base)' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: BE.accent }} />
        <p style={{ fontSize: 14, color: BE.textDim }}>{phase === "loading" ? "Preparing your paper…" : "Evaluating your answers…"}</p>
      </div>
    );
  }

  /* ════════════════════════════════════
     STEP 3 — Test
  ════════════════════════════════════ */
  if (phase === "test" && config) {
    if (questions.length === 0) {
      return (
        <MTPage phase={phase}>
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <AlertTriangle size={40} style={{ color: BE.warn }} />
            <div>
              <div style={{ fontFamily: BE.serif, fontSize: 24, fontWeight: 600, color: BE.text, marginBottom: 8 }}>No questions were loaded.</div>
              <div style={{ fontSize: 14, color: BE.textDim }}>The paper couldn't be generated. Try a different configuration.</div>
            </div>
            <button className="be-btn" onClick={() => { setPhase("setup"); setError(null); setQuestions([]); }}>← Back to Setup</button>
          </div>
        </MTPage>
      );
    }
    return (
      <TestEngine
        questions={questions}
        config={config}
        branch={selectedBranch ?? undefined}
        mockTestId={mockTestId}
        mockTestTitle={mockTestTitle}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
      />
    );
  }

  /* ════════════════════════════════════
     STEP 4 — Results
  ════════════════════════════════════ */
  if (phase === "results" && result) {
    return <TestAnalysis result={result} onRestart={handleRetake} />;
  }

  return (
    <div className="be-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <Loader2 size={32} className="animate-spin text-muted-foreground" />
    </div>
  );
}

function BriefStat({ label, val, sub }: { label: string; val: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px', marginTop: 2, color: BE.text }}>{val}</div>
      {sub && <div style={{ fontSize: 10.5, color: BE.textDim }}>{sub}</div>}
    </div>
  );
}

function MarkRow({ type, marks, neg }: { type: string; marks: string; neg: string }) {
  return (
    <div className="p-2.5 border rounded-lg" style={{ borderColor: BE.line }}>
      <div style={{ fontFamily: BE.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: BE.accent, marginBottom: 4 }}>{type}</div>
      <div style={{ fontSize: 11, color: BE.text, marginBottom: 1 }}>+ {marks}</div>
      <div style={{ fontSize: 10.5, color: BE.textMute }}>{neg}</div>
    </div>
  );
}
