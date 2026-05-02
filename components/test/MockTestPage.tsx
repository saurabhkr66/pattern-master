"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Loader2, AlertTriangle, ArrowLeft, Check, Trash2,
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
import React from "react";

/* ─────────────── Types ─────────────── */
type Phase =
  | "exam_select" | "branch_select" | "mode_select"
  | "mock_select" | "random_config" | "brief" | "loading" | "test"
  | "submitting" | "results";

interface SeededMock {
  id: string;
  mock_number: number;
  title: string;
  total_questions: number;
  max_score: number;
  duration_secs: number;
  session?: {
    score: number;
    max_score: number;
    correct_count: number;
    wrong_count: number;
    skipped_count: number;
    created_at: string;
  } | null;
}

/* ─────────────── Top wizard rail ─────────────────────────────────────── */
function MTRail({ phase, branchSkipped }: { phase: Phase; branchSkipped: boolean }) {
  const stepMap: Record<Phase, number> = {
    exam_select: 1, branch_select: 2, mode_select: 3,
    mock_select: 4, random_config: 4, brief: 5, loading: 5,
    test: 6, submitting: 6, results: 7,
  };
  const step = stepMap[phase] ?? 1;

  const all = [
    { n: 1, label: 'Exam' },
    { n: 2, label: 'Branch' },
    { n: 3, label: 'Mode' },
    { n: 4, label: 'Configure' },
    { n: 5, label: 'Brief' },
    { n: 6, label: 'Test' },
    { n: 7, label: 'Analysis' },
  ];
  return (
    <div className="flex items-center gap-0 px-6 py-3.5 border-b shrink-0 overflow-x-auto scrollbar-hide" style={{ borderColor: BE.line, background: BE.surface }}>
      {all.map((s, i) => {
        const skipped = s.n === 2 && branchSkipped;
        const active = s.n === step;
        const done = s.n < step && !skipped;
        const color = active ? BE.accent : done ? BE.good : skipped ? BE.textMute : BE.textDim;
        return (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2 shrink-0" style={{ opacity: skipped ? 0.4 : 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, fontSize: 11, fontWeight: 600,
                fontFamily: BE.mono, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? BE.accent : done ? BE.good + '22' : 'transparent',
                color: active ? '#fff' : color,
                border: `1px solid ${active || done ? color : BE.line}`,
              }}>{done ? '✓' : skipped ? '–' : s.n}</div>
              <span style={{ fontSize: 11.5, fontWeight: 500, color, letterSpacing: '0.02em' }}>{s.label}</span>
            </div>
            {i < all.length - 1 && <div className="mx-2.5 flex-1 min-w-[12px] h-[1px]" style={{ background: BE.line }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MTPage({ children, phase, branchSkipped, maxWidth = 980 }: { children: React.ReactNode; phase: Phase; branchSkipped: boolean; maxWidth?: number }) {
  return (
    <div className="be-screen flex flex-col min-h-full" style={{ background: 'var(--bg-base)' }}>
      <MTRail phase={phase} branchSkipped={branchSkipped} />
      <div className="flex-1 overflow-auto">
        <div style={{ maxWidth, margin: '0 auto', padding: '32px 32px 60px' }}>{children}</div>
      </div>
    </div>
  );
}

function MTHeader({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-[22px]">
      <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{eyebrow}</div>
      <h1 style={{ fontFamily: BE.serif, fontWeight: 500, fontSize: 32, letterSpacing: '-0.8px', margin: '0 0 6px', lineHeight: 1.1, color: BE.text }}>{title}</h1>
      {sub && <div style={{ fontSize: 13.5, color: BE.textDim, lineHeight: 1.5, maxWidth: 600 }}>{sub}</div>}
    </div>
  );
}

/* ─────────────── Main component ─────────────── */
export default function MockTestPage() {
  const [phase, setPhase] = useState<Phase>("exam_select");
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

  const config: ExamConfig | null = selectedExam
    ? getExamConfig(selectedExam, selectedBranch ?? undefined)
    : null;

  const hasBranches = config?.hasBranches ?? true;

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
      .then((d) => setSeededMocks(d.mocks ?? []))
      .catch(() => {});
  }, [selectedExam, selectedBranch]);

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
        body: JSON.stringify({
          mockTestId,
          answers,
          timeTakenSecs,
          examType: selectedExam,
          branch: selectedBranch,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Map API response to ResultData structure for TestAnalysis
      const breakdown = data.breakdown || [];
      const accuracy = (data.correctCount + data.wrongCount) > 0 
        ? (data.correctCount / (data.correctCount + data.wrongCount)) * 100 
        : 0;
      
      // Calculate subject-wise breakdown
      const subjectMap: Record<string, { subject: string; score: number; max: number; correct: number; total: number }> = {};
      breakdown.forEach((q: any) => {
        const subName = q.subject || "General";
        if (!subjectMap[subName]) {
          subjectMap[subName] = { subject: subName, score: 0, max: 0, correct: 0, total: 0 };
        }
        const s = subjectMap[subName];
        s.max += q.marks;
        s.total += 1;
        if (q.isCorrect) {
          s.score += q.marks;
          s.correct += 1;
        }
      });

      const subjectBreakdown = Object.values(subjectMap).map(s => ({
        subject: s.subject,
        score: s.score,
        max: s.max,
        accuracy: s.total > 0 ? (s.correct / s.total) * 100 : 0
      }));

      const finalResult: ResultData = {
        score: data.score,
        maxScore: data.maxScore,
        accuracy,
        timeTakenSecs: data.timeTakenSecs,
        attempted: data.correctCount + data.wrongCount,
        correct: data.correctCount,
        incorrect: data.wrongCount,
        unattempted: data.skippedCount,
        subjectBreakdown,
        questions: breakdown.map((q: any) => ({
          id: q.questionId,
          question_text: q.questionText,
          options: q.options,
          question_type: q.questionType,
          correct_answer: q.correctAnswer,
          user_answer: q.userAnswer,
          is_correct: q.isCorrect,
          marks: q.marks,
          subject: q.subject || "General",
          explanation: q.explanation
        }))
      };

      setResult(finalResult);
      setPhase("results");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [mockTestId, selectedExam, selectedBranch]);

  /* retake / new test */
  const handleRetake = () => {
    setPhase("mode_select");
    setSelectedMode(null);
    setSelectedMock(null);
    setBriefAgreed(false);
    setQuestions([]);
    setResult(null);
    setMockTestId(null);
    setSubmitError(null);
    setError(null);
  };

  const goBack = (to: Phase) => { setError(null); setPhase(to); };

  const handleDeleteTest = async (mockId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? All sessions and data for this test will be lost.`)) return;
    try {
      await deleteMockTest(mockId);
      setSeededMocks(prev => prev.filter(m => m.id !== mockId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  /* ════════════════════════════════════
     STEP 1 — Exam select
  ════════════════════════════════════ */
  if (phase === "exam_select") {
    return (
      <MTPage phase={phase} branchSkipped={!hasBranches}>
        <MTHeader eyebrow="Step 1 of 7" title="Pick your exam." sub="All exams ship with curated mock series and a random-paper generator. Pick yours, then we'll narrow down to your branch and mode." />

        {/* Search placeholder */}
        <div className="flex items-center gap-2 px-3 py-2 border rounded-lg mb-6 max-w-[460px]" style={{ borderColor: BE.line, background: BE.surface }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={BE.textDim} strokeWidth="1.6"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
          <span style={{ fontSize: 13, color: BE.textMute }}>Search exams…</span>
        </div>

        {["Engineering", "Medical"].map((catLabel) => {
          const catExams = EXAM_CONFIGS.filter(e => {
            if (catLabel === "Engineering") return ["GATE", "JEE_MAIN", "JEE_ADVANCED"].includes(e.examType);
            if (catLabel === "Medical") return ["NEET"].includes(e.examType);
            return false;
          });
          if (!catExams.length) return null;
          return (
            <div key={catLabel} className="mb-6">
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>{catLabel}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {catExams.map((exam) => (
                  <div
                    key={exam.examType}
                    onClick={() => {
                      setSelectedExam(exam.examType);
                      setSelectedBranch(null);
                      setSelectedMode(null);
                      setSelectedMock(null);
                      setPhase(exam.hasBranches ? "branch_select" : "mode_select");
                    }}
                    className="border rounded-xl p-3.5 cursor-pointer relative hover:shadow-sm transition-all"
                    style={{ background: BE.surface, borderColor: BE.line }}
                  >
                    <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 2, color: BE.text }}>{exam.label}</div>
                    <div style={{ fontSize: 11.5, color: BE.textDim, marginBottom: 12 }}>{exam.description}</div>
                    <div className="flex gap-3 pt-2.5 border-t" style={{ borderColor: BE.line, fontSize: 10.5, color: BE.textMute }}>
                      <div><span style={{ color: BE.text, fontFamily: BE.mono, fontSize: 12, fontWeight: 600 }}>{exam.totalQuestions}</span> Q</div>
                      <div><span style={{ color: BE.text, fontFamily: BE.mono, fontSize: 12, fontWeight: 600 }}>{exam.maxScore}</span> marks</div>
                      <div><span style={{ color: BE.text, fontFamily: BE.mono, fontSize: 12, fontWeight: 600 }}>{Math.round(exam.durationSecs/60)}</span> min</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </MTPage>
    );
  }

  /* ════════════════════════════════════
     STEP 2 — Branch select
  ════════════════════════════════════ */
  if (phase === "branch_select" && selectedExam && config) {
    return (
      <MTPage phase={phase} branchSkipped={false}>
        <MTHeader eyebrow={`Step 2 of 7 · ${config.label}`} title="Which paper?" sub="Pick the branch you're appearing for. The mock series and question pool are scoped to it." />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          {config.branches?.map((b) => (
            <div
              key={b.id}
              onClick={() => { setSelectedBranch(b.id); setPhase("mode_select"); }}
              className="border rounded-lg p-3.5 cursor-pointer flex gap-3 items-center hover:shadow-sm transition-all"
              style={{ background: BE.surface, borderColor: BE.line }}
            >
              <div
                className="flex items-center justify-center rounded-lg text-[13px] font-bold shrink-0"
                style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', color: BE.textDim, fontFamily: BE.mono }}
              >
                {b.id}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[13px] truncate" style={{ color: BE.text }}>{b.id}</div>
                <div className="text-[11px] truncate" style={{ color: BE.textMute }}>{b.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: BE.textMute, fontStyle: 'italic', fontFamily: BE.serif }}>Tip · You can change branch later from your dashboard. Your mistake log stays per-branch.</div>
        <div className="flex justify-between items-center mt-[22px] pt-[18px] border-t" style={{ borderColor: BE.line }}>
          <button className="be-btn" onClick={() => goBack("exam_select")}>← Exam</button>
        </div>
      </MTPage>
    );
  }

  /* ════════════════════════════════════
     STEP 3 — Mode select
  ════════════════════════════════════ */
  if (phase === "mode_select" && selectedExam && config) {
    return (
      <MTPage phase={phase} branchSkipped={!hasBranches}>
        <MTHeader eyebrow="Step 3 of 7" title="How do you want to take it?" sub="Two ways. Both score the same, but the question selection works differently." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Specialized */}
          <div
            onClick={() => { setSelectedMode("seeded"); setPhase("mock_select"); }}
            className="border-2 rounded-[14px] p-[22px] cursor-pointer relative transition-all"
            style={{ borderColor: BE.accent, background: `linear-gradient(135deg, ${BE.accent}10, transparent)` }}
          >
            <div className="absolute top-3.5 right-3.5 text-[9.5px] font-bold tracking-[0.1em] px-2 py-0.5 rounded-[4px] text-white" style={{ background: BE.accent }}>
              RECOMMENDED
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-[9px] mb-3.5" style={{ background: BE.accentSoft, color: BE.accent }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
            </div>
            <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px', marginBottom: 4, color: BE.text }}>Specialized Mock</div>
            <div style={{ fontSize: 13, color: BE.textDim, lineHeight: 1.5, marginBottom: 14 }}>A curated, fixed-set paper. Same exact questions every time you take Mock #N — just like the real exam booklet.</div>
            <ul className="flex flex-col gap-1.5 list-none p-0 m-0 text-xs" style={{ color: BE.text }}>
              <li>✓ Mirrors exam-day pattern exactly</li>
              <li>✓ Comparable scores across attempts</li>
              <li>✓ Leaderboard & percentile rank</li>
            </ul>
          </div>
          {/* Random */}
          <div
            onClick={() => { setSelectedMode("random"); setPhase("random_config"); }}
            className="border rounded-[14px] p-[22px] cursor-pointer hover:shadow-sm transition-all"
            style={{ borderColor: BE.line, background: BE.surface }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-[9px] mb-3.5" style={{ background: 'rgba(255,255,255,0.05)', color: BE.textDim }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
            </div>
            <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px', marginBottom: 4, color: BE.text }}>Random Test</div>
            <div style={{ fontSize: 13, color: BE.textDim, lineHeight: 1.5, marginBottom: 14 }}>System generates a fresh paper from the bank. Filter by subjects. Great for daily drilling.</div>
            <ul className="flex flex-col gap-1.5 list-none p-0 m-0 text-xs" style={{ color: BE.textDim }}>
              <li>✓ Custom topic mix</li>
              <li>✓ Fresh questions every attempt</li>
              <li>✓ No two papers ever the same</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-between items-center mt-[22px] pt-[18px] border-t" style={{ borderColor: BE.line }}>
          <button className="be-btn" onClick={() => goBack(hasBranches ? "branch_select" : "exam_select")}>← Back</button>
        </div>
      </MTPage>
    );
  }

  /* ════════════════════════════════════
     STEP 4A — Seeded mock list
  ════════════════════════════════════ */
  if (phase === "mock_select" && config) {
    return (
      <MTPage phase={phase} branchSkipped={!hasBranches} maxWidth={1100}>
        <MTHeader eyebrow="Step 4 of 7 · Specialized" title="Pick a past paper." sub="Each mock is a real previous-year paper. Same questions, same order, same printed sections — just the way it appeared on exam day." />

        {/* Constraint disclosure */}
        <div className="flex gap-2.5 p-3 border rounded-xl mb-4.5" style={{ borderColor: BE.line, background: BE.surface }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={BE.textDim} strokeWidth="1.5" className="shrink-0 mt-0.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 11v.5"/></svg>
          <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5 }}>
            <span style={{ color: BE.text, fontWeight: 600 }}>Past papers don't carry subject tags.</span>{' '}
            You'll get full score, percentile, and right/wrong per question — but topic-wise breakdown isn't available. After the test you can hand-tag wrong answers to feed your mistake log.
          </div>
        </div>

        {seededMocks.length === 0 ? (
          <div className="border border-dashed rounded-xl p-12 text-center" style={{ borderColor: BE.line }}>
            <div className="text-2xl mb-2">📭</div>
            <div className="font-semibold" style={{ color: BE.text }}>No papers seeded yet.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            {seededMocks.map((m) => {
              const taken = !!m.session;
              const isSelected = selectedMock?.mock_number === m.mock_number;
              return (
                <div
                  key={m.mock_number}
                   onClick={() => setSelectedMock(m)}
                  className="border rounded-xl p-3.5 cursor-pointer relative hover:shadow-sm transition-all group"
                   style={{
                    borderColor: isSelected ? BE.accent : BE.line,
                    background: isSelected ? `${BE.accent}10` : BE.surface,
                  }}
                >
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTest(m.id, m.title);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Mock Test"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="flex items-center justify-between mb-2.5">
                    <div style={{ fontFamily: BE.mono, fontSize: 11, color: BE.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Mock #{String(m.mock_number).padStart(2,'0')}</div>
                    {taken && <span style={{ fontSize: 9.5, color: BE.good, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>● Done</span>}
                  </div>
                  <div style={{ fontFamily: BE.serif, fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 2, color: BE.text }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: BE.textDim, marginBottom: 8 }}>{m.total_questions} Q · {fmtDuration(m.duration_secs)}</div>
                  {taken && m.session ? (
                    <div className="pt-2 border-t" style={{ borderColor: BE.line }}>
                      <div style={{ fontFamily: BE.mono, fontSize: 12, fontWeight: 600, color: BE.text }}>{m.session.score} / {m.session.max_score}</div>
                      <div style={{ fontSize: 10.5, color: BE.textMute }}>{new Date(m.session.created_at).toLocaleDateString()}</div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t text-[11px]" style={{ borderColor: BE.line, color: BE.textDim }}>{config.totalQuestions} Q · {Math.round(config.durationSecs/60)} min</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center mt-5.5 pt-[18px] border-t" style={{ borderColor: BE.line }}>
          <button className="be-btn" onClick={() => goBack("mode_select")}>← Mode</button>
          <button
            className="be-btn be-btn-primary"
            disabled={!selectedMock}
            onClick={() => selectedMock && (setBriefAgreed(false), setPhase("brief"))}
            style={{ padding: '9px 18px' }}
          >
            Continue with {selectedMock ? selectedMock.title : "mock"} →
          </button>
        </div>
      </MTPage>
    );
  }

  /* ════════════════════════════════════
     STEP 4B — Random config
  ════════════════════════════════════ */
  if (phase === "random_config" && config) {
    return (
      <MTPage phase={phase} branchSkipped={!hasBranches} maxWidth={1100}>
        <MTHeader eyebrow="Step 4 of 7 · Random" title="Configure the paper." sub="Filter by subjects to generate a fresh paper from your branch's bank." />

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-[18px]">
          {/* Left: General stats */}
          <div className="flex flex-col gap-3.5">
            <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4, color: BE.text }}>Difficulty mix</div>
              <div style={{ fontSize: 11.5, color: BE.textDim, marginBottom: 12 }}>Standard GATE difficulty distribution.</div>
              <div className="flex h-7 rounded-[7px] overflow-hidden mb-2">
                <div className="flex items-center justify-center text-[11px] font-bold text-black" style={{ flex: 30, background: BE.good + '99' }}>Easy 30%</div>
                <div className="flex items-center justify-center text-[11px] font-bold text-black" style={{ flex: 50, background: BE.warn + '99' }}>Medium 50%</div>
                <div className="flex items-center justify-center text-[11px] font-bold text-white" style={{ flex: 20, background: BE.bad + '99' }}>Hard 20%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="border rounded-xl p-3.5" style={{ borderColor: BE.line, background: BE.surface }}>
                <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Total questions</div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <div style={{ fontFamily: BE.serif, fontSize: 32, fontWeight: 600, color: BE.text }}>{config.totalQuestions}</div>
                </div>
              </div>
              <div className="border rounded-xl p-3.5" style={{ borderColor: BE.line, background: BE.surface }}>
                <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Time limit</div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <div style={{ fontFamily: BE.serif, fontSize: 32, fontWeight: 600, color: BE.text }}>{Math.round(config.durationSecs/60)}</div>
                  <div style={{ fontSize: 11, color: BE.textDim }}>min</div>
                </div>
              </div>
            </div>

            <div className="border rounded-xl p-3.5 flex items-center gap-4" style={{ borderColor: BE.line, background: BE.surface }}>
              <div className="flex-1">
                <div style={{ fontSize: 12.5, fontWeight: 600, color: BE.text }}>Negative marking</div>
                <div style={{ fontSize: 11, color: BE.textDim, marginTop: 1 }}>−⅓ for MCQs, none for MSQ/NAT (real GATE rules)</div>
              </div>
              <div className="w-[30px] h-[18px] rounded-[9px] relative" style={{ background: BE.accent }}>
                <div className="absolute right-0.5 top-0.5 w-[14px] h-[14px] rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* Right: Topic selection */}
          <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: BE.text }}>Select subjects</div>
                <div style={{ fontSize: 11, color: BE.textDim }}>Choose specific topics or leave all for mix.</div>
              </div>
              <button className="be-btn text-[10.5px] px-2 py-1" onClick={() => setSelectedSubjects([])}>Clear all</button>
            </div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {availableSubjects.map((s) => {
                const sel = selectedSubjects.includes(s);
                return (
                  <div
                    key={s}
                    onClick={() => setSelectedSubjects(prev => sel ? prev.filter(x => x !== s) : [...prev, s])}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all"
                    style={{
                      borderColor: sel ? BE.accent : BE.line,
                      background: sel ? BE.accentSoft : 'transparent'
                    }}
                  >
                    <div className="w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] text-white" style={{ borderColor: sel ? BE.accent : BE.line, background: sel ? BE.accent : 'transparent' }}>{sel && "✓"}</div>
                    <span style={{ fontSize: 12, color: BE.text }}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-5.5 pt-[18px] border-t" style={{ borderColor: BE.line }}>
          <button className="be-btn" onClick={() => goBack("mode_select")}>← Mode</button>
          <button className="be-btn be-btn-primary" onClick={() => (setBriefAgreed(false), setPhase("brief"))} style={{ padding: '9px 18px' }}>Generate paper →</button>
        </div>
      </MTPage>
    );
  }

  /* ════════════════════════════════════
     STEP 5 — Pre-test brief
  ════════════════════════════════════ */
  if (phase === "brief" && config) {
    const isSpec = selectedMode === "seeded";
    return (
      <MTPage phase={phase} branchSkipped={!hasBranches}>
        <MTHeader
          eyebrow={isSpec ? 'Step 5 of 7 · Past paper' : 'Step 5 of 7 · Random test'}
          title="Read this. Then begin."
          sub={isSpec
            ? `${selectedMock?.title} · ${config.label} · Specialized series.`
            : `Custom paper · ${config.label} · Generated from your tagged bank.`
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3.5 mb-4">
          <div className="flex flex-col gap-2.5">
            <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Exam pattern</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <BriefStat label="Questions" val={isSpec ? String(selectedMock?.total_questions) : String(config.totalQuestions)} />
                <BriefStat label="Total marks" val={isSpec ? String(selectedMock?.max_score) : String(config.maxScore)} />
                <BriefStat label="Time" val={isSpec ? fmtDuration(selectedMock?.duration_secs ?? 0) : "3h"} sub={isSpec ? "" : "180 minutes"} />
                <BriefStat label="Sections" val={String(config.sections.length)} sub="GA + Subject" />
              </div>
            </div>
            <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Marking scheme</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <MarkRow type="MCQ" marks="+1 / +2" neg="−⅓ / −⅔" />
                <MarkRow type="MSQ" marks="+1 / +2" neg="No partial penalty" />
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
                'You can change answers before final submit.'
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span style={{ fontFamily: BE.mono, fontSize: 10.5, color: BE.accent, fontWeight: 600, minWidth: 14 }}>{String(i+1).padStart(2,'0')}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div
          className="border rounded-xl p-3.5 flex items-center gap-2.5 cursor-pointer select-none transition-all"
          style={{ borderColor: briefAgreed ? BE.accent : BE.line, background: BE.surface }}
          onClick={() => setBriefAgreed(v => !v)}
        >
          <div
            className="flex items-center justify-center rounded-[4px] shrink-0 border transition-all"
            style={{ width: 18, height: 18, background: briefAgreed ? BE.accent : 'transparent', borderColor: briefAgreed ? BE.accent : BE.line, color: '#fff' }}
          >
            {briefAgreed && <Check size={11} />}
          </div>
          <div style={{ fontSize: 12.5, color: BE.text }}>I have read the instructions and agree to abide by them.</div>
        </div>

        {error && <div className="mt-4 p-3 rounded-lg border text-sm text-red-500 bg-red-500/10" style={{ borderColor: BE.bad + '33' }}>{error}</div>}

        <div className="flex justify-between items-center mt-5 pt-[18px] border-t" style={{ borderColor: BE.line }}>
          <button className="be-btn" onClick={() => goBack(isSpec ? "mock_select" : "random_config")}>← Back</button>
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
     STEP 6 — Test
  ════════════════════════════════════ */
  if (phase === "test" && config && questions.length > 0) {
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
     STEP 7 — Results
  ════════════════════════════════════ */
  if (phase === "results" && result) {
    return (
      <TestAnalysis
        result={result}
        onRestart={handleRetake}
      />
    );
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
      <div style={{ fontFamily: BE.serif, fontSize: 24, fontWeight: 600, letterSpacing: '-0.4px', marginTop: 2, color: BE.text }}>{val}</div>
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
