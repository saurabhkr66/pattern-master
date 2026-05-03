"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock, ChevronLeft, ChevronRight, Flag, Send,
  CheckCircle2, BarChart3, Loader2, AlertTriangle, RotateCcw,
} from "lucide-react";
import { fmtTimer, type ExamConfig, type SectionConfig } from "@/lib/examConfigs";
import { BE } from "@/lib/theme";
import { MathText } from "@/components/MathText";

/* ─────────────── Types ─────────────── */
export interface TestQuestion {
  id: string;
  source: "pyq" | "subject_pyq" | "template";
  sectionIndex: number;
  sectionName: string;
  isOptional: boolean;
  question_text: string;
  options: string[] | null;
  question_type: "MCQ" | "MSQ" | "NAT";
  marks: number;
  year?: number;
  subject: string;
  images?: { index: number; filename: string }[] | null;
}

export interface SubmitAnswer {
  questionId: string;
  source: "pyq" | "subject_pyq" | "template";
  sectionIndex: number;
  isOptional: boolean;
  questionType: string;
  marks: number;
  userAnswer: string | null;
  subject: string;
}

type QStatus = "unseen" | "answered" | "skipped" | "review";

interface Props {
  questions: TestQuestion[];
  config: ExamConfig;
  branch?: string;
  mockTestId: string | null;
  mockTestTitle: string;
  onSubmit: (answers: SubmitAnswer[], timeTakenSecs: number) => void;
  submitting: boolean;
  submitError: string | null;
}

const optionLetters = ["A", "B", "C", "D", "E", "F"];

function sectionQuestions(questions: TestQuestion[], sectionIdx: number) {
  return questions.filter((q) => q.sectionIndex === sectionIdx);
}

/* ─────────────── Component ─────────────── */
export default function TestEngine({
  questions,
  config,
  branch,
  mockTestId,
  mockTestTitle,
  onSubmit,
  submitting,
  submitError,
}: Props) {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [currentQId, setCurrentQId] = useState<string>(questions[0]?.id ?? "");
  const [statuses, setStatuses] = useState<Record<string, QStatus>>({});
  const [mcqSelected, setMcqSelected] = useState<Record<string, string>>({});
  const [msqSelected, setMsqSelected] = useState<Record<string, string[]>>({});
  const [natValues, setNatValues] = useState<Record<string, string>>({});
  const [markedReview, setMarkedReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(config.durationSecs);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  const sections = config.sections;
  const multiSection = sections.length > 1;

  const currentQ = questions.find((q) => q.id === currentQId) ?? questions[0];
  const sectionQs = sectionQuestions(questions, activeSectionIdx);
  const currentIdx = sectionQs.findIndex((q) => q.id === currentQId);

  const buildAnswers = useCallback((): SubmitAnswer[] =>
    questions.map((q) => ({
      questionId: q.id,
      source: q.source,
      sectionIndex: q.sectionIndex,
      isOptional: q.isOptional,
      questionType: q.question_type,
      marks: q.marks,
      subject: q.subject,
      userAnswer:
        q.question_type === "MSQ"
          ? (msqSelected[q.id]?.sort().join(";") ?? null) || null
          : q.question_type === "NAT"
          ? natValues[q.id]?.trim() || null
          : mcqSelected[q.id] ?? null,
    })), [questions, mcqSelected, msqSelected, natValues]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            setTimeout(() => {
              onSubmit(buildAnswers(), config.durationSecs);
            }, 100);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (q: TestQuestion) => {
    setActiveSectionIdx(q.sectionIndex);
    setCurrentQId(q.id);
    setShowPalette(false);
  };

  const goToIdx = (idx: number) => {
    const clamped = Math.max(0, Math.min(sectionQs.length - 1, idx));
    const target = sectionQs[clamped];
    if (target) goTo(target);
  };

  const recordAnswer = (q: TestQuestion, answer: string | null) => {
    if (!answer || answer.trim() === "") {
      setStatuses((prev) => ({ ...prev, [q.id]: markedReview.has(q.id) ? "review" : "skipped" }));
    } else {
      setStatuses((prev) => ({ ...prev, [q.id]: markedReview.has(q.id) ? "review" : "answered" }));
    }
  };

  const handleMcq = (q: TestQuestion, letter: string) => {
    setMcqSelected((prev) => ({ ...prev, [q.id]: letter }));
    recordAnswer(q, letter);
  };

  const handleMsq = (q: TestQuestion, letter: string) => {
    const cur = msqSelected[q.id] ?? [];
    const next = cur.includes(letter) ? cur.filter((l) => l !== letter) : [...cur, letter];
    setMsqSelected((prev) => ({ ...prev, [q.id]: next }));
    recordAnswer(q, next.join(";") || null);
  };

  const handleNat = (q: TestQuestion, val: string) => {
    setNatValues((prev) => ({ ...prev, [q.id]: val }));
    recordAnswer(q, val || null);
  };

  const clearResponse = (q: TestQuestion) => {
    setMcqSelected((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setMsqSelected((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setNatValues((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setStatuses((prev) => ({ ...prev, [q.id]: markedReview.has(q.id) ? "review" : "skipped" }));
  };

  const toggleReview = (q: TestQuestion) => {
    const newSet = new Set(markedReview);
    if (newSet.has(q.id)) {
      newSet.delete(q.id);
      const hasAnswer = !!(mcqSelected[q.id] || msqSelected[q.id]?.length || natValues[q.id]);
      setStatuses((prev) => ({ ...prev, [q.id]: hasAnswer ? "answered" : "skipped" }));
    } else {
      newSet.add(q.id);
      setStatuses((prev) => ({ ...prev, [q.id]: "review" }));
    }
    setMarkedReview(newSet);
  };

  const doSubmit = useCallback(() => {
    clearInterval(timerRef.current!);
    onSubmit(buildAnswers(), config.durationSecs - timeLeft);
  }, [buildAnswers, timeLeft, config.durationSecs]);

  const answeredCount = Object.values(statuses).filter((s) => s === "answered").length;
  const reviewCount = Object.values(statuses).filter((s) => s === "review").length;
  const timerColor = timeLeft < 600 ? BE.bad : timeLeft < 1800 ? BE.warn : BE.text;

  const curMcq = currentQ ? (mcqSelected[currentQ.id] ?? null) : null;
  const curMsq = currentQ ? (msqSelected[currentQ.id] ?? []) : [];
  const curNat = currentQ ? (natValues[currentQ.id] ?? "") : "";
  const isReviewed = currentQ ? markedReview.has(currentQ.id) : false;

  const PaletteGrid = ({ sIdx }: { sIdx: number }) => {
    const qs = sectionQuestions(questions, sIdx);
    return (
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {qs.map((q, i) => {
          const s = statuses[q.id];
          const isCur = q.id === currentQId;
          const bg = isCur ? BE.accent : s === 'answered' ? BE.good : s === 'review' ? BE.warn : BE.surface;
          const color = isCur || s === 'answered' || s === 'review' ? '#fff' : BE.textMute;
          return (
            <button
              key={q.id}
              onClick={() => goTo(q)}
              className="flex items-center justify-center rounded-[6px] text-[10.5px] font-bold transition-all hover:scale-105 border"
              style={{
                width: 32, height: 32,
                background: isCur ? BE.accent : (s === 'answered' || s === 'review' ? bg + 'dd' : bg),
                color,
                borderColor: isCur ? BE.accent : BE.line,
                fontFamily: BE.mono,
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    );
  };

  if (!currentQ) return null;

  const sectionConfig: SectionConfig | undefined = sections[currentQ.sectionIndex];
  const optCountSoFar = sectionConfig?.optional
    ? sectionQs.filter((q) => q.isOptional && (statuses[q.id] === "answered" || statuses[q.id] === "review")).length
    : 0;
  const optLimit = sectionConfig?.optional?.countSize ?? Infinity;

  return (
    <div className="be-screen flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── TOP BAR ── */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b shrink-0" style={{ borderColor: BE.line, background: BE.surface }}>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-bold" style={{ background: BE.accentSoft, color: timerColor, fontFamily: BE.mono }}>
            <Clock size={15} />
            <span style={{ fontSize: 15 }}>{fmtTimer(timeLeft)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium" style={{ color: BE.textDim }}>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: BE.good }} /> {answeredCount} Answered</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: BE.warn }} /> {reviewCount} Flagged</div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center">
          <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, letterSpacing: '0.04em' }}>{config.label}{branch ? ` ${branch}` : ""}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: BE.text }}>{mockTestTitle}</div>
        </div>

        <div className="flex items-center gap-2">
          {/* Submit button — hidden on mobile (shown in sticky bottom nav instead) */}
          <button
            className="be-btn be-btn-primary hidden md:flex"
            onClick={() => setConfirmSubmit(true)}
            style={{ background: BE.accent, borderColor: BE.accent, color: '#fff' }}
          >
            Submit Test
          </button>
          <button onClick={() => setShowPalette(!showPalette)} className="lg:hidden p-2 rounded-lg border" style={{ borderColor: BE.line }}><BarChart3 size={18} /></button>
        </div>
      </header>

      {/* ── SUB-HEADER / SECTION TABS ── */}
      {multiSection && (
        <div className="flex items-center px-4 border-b shrink-0" style={{ borderColor: BE.line, background: BE.surface }}>
          {sections.map((sec, i) => {
            const active = i === activeSectionIdx;
            return (
              <button
                key={i}
                onClick={() => {
                  setActiveSectionIdx(i);
                  const firstQ = sectionQuestions(questions, i)[0];
                  if (firstQ) setCurrentQId(firstQ.id);
                }}
                className="px-5 py-3 text-[11.5px] font-bold border-b-2 transition-all"
                style={{
                  color: active ? BE.accent : BE.textMute,
                  borderColor: active ? BE.accent : 'transparent',
                }}
              >
                {sec.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ── QUESTION AREA ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable question body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
              {/* Meta */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div style={{ fontFamily: BE.serif, fontSize: 18, fontWeight: 600, color: BE.text }}>Question {currentIdx + 1}</div>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: BE.accentSoft, color: BE.accent }}>{currentQ.marks} MARKS</div>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: BE.textMute }}>{currentQ.question_type}</div>
                  {currentQ.isOptional && <div className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: BE.warn + '22', color: BE.warn }}>OPTIONAL ({optCountSoFar}/{optLimit})</div>}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: BE.textMute, textTransform: 'uppercase' }}>{currentQ.subject}</div>
              </div>

              {/* Question Text */}
              <div className="mb-8" style={{ fontSize: 16, lineHeight: 1.6, color: BE.text }}>
                {currentQ.images && Array.isArray(currentQ.images) && currentQ.images.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-4">
                    {(currentQ.images as { index: number; filename: string }[]).map((img) => (
                      <img key={img.index} src={`/images/questions/${img.filename}`} alt="" className="rounded-lg border max-h-[300px]" style={{ borderColor: BE.line }} />
                    ))}
                  </div>
                )}
                <MathText content={currentQ.question_text} />
              </div>

              {/* Options */}
              <div className="space-y-3 mb-4">
                {currentQ.question_type === "NAT" ? (
                  <div className="max-w-[200px]">
                    <input
                      type="number" step="any" autoFocus
                      value={curNat} onChange={(e) => handleNat(currentQ, e.target.value)}
                      placeholder="Value..."
                      className="w-full px-4 py-3 rounded-xl border text-lg font-bold focus:outline-none"
                      style={{ background: BE.surface, borderColor: curNat ? BE.accent : BE.line, color: BE.text, fontFamily: BE.mono }}
                    />
                    <div className="mt-2 text-[11px]" style={{ color: BE.textMute }}>Enter exact numeric value.</div>
                  </div>
                ) : (
                  currentQ.options?.map((opt, oi) => {
                    const letter = optionLetters[oi];
                    const isMSQ = currentQ.question_type === "MSQ";
                    const selected = isMSQ ? curMsq.includes(letter) : curMcq === letter;
                    return (
                      <div
                        key={oi}
                        onClick={() => isMSQ ? handleMsq(currentQ, letter) : handleMcq(currentQ, letter)}
                        className="group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm"
                        style={{ background: selected ? BE.accentSoft : BE.surface, borderColor: selected ? BE.accent : BE.line }}
                      >
                        <div
                          className="flex items-center justify-center rounded-lg text-xs font-bold shrink-0 transition-all"
                          style={{
                            width: 30, height: 30,
                            background: selected ? BE.accent : 'rgba(255,255,255,0.05)',
                            color: selected ? '#fff' : BE.textMute,
                            borderColor: selected ? BE.accent : BE.line,
                            border: '1px solid',
                            fontFamily: BE.mono,
                          }}
                        >
                          {letter}
                        </div>
                        <div className="flex-1 text-[15px] pt-[3px]" style={{ color: selected ? BE.text : BE.textDim }}>
                          <MathText content={typeof opt === "string" ? opt.replace(/^[A-E]\.\s*/, "") : String(opt)} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {submitError && <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-xs border border-red-500/30">{submitError}</div>}
            </div>
          </div>

          {/* Sticky bottom nav bar */}
          <div
            className="shrink-0 border-t px-4 md:px-8 py-3"
            style={{ background: 'var(--bg-base)', borderColor: BE.line }}
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToIdx(currentIdx - 1)}
                  disabled={currentIdx === 0}
                  className="flex items-center justify-center w-10 h-10 rounded-full border transition-all disabled:opacity-30 hover:bg-white/5"
                  style={{ borderColor: BE.line, color: BE.text }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => goToIdx(currentIdx + 1)}
                  disabled={currentIdx === sectionQs.length - 1}
                  className="flex items-center justify-center w-10 h-10 rounded-full border transition-all disabled:opacity-30 hover:bg-white/5"
                  style={{ borderColor: BE.line, color: BE.text }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => clearResponse(currentQ)} className="text-[11.5px] font-bold px-4 py-2 rounded-lg border" style={{ borderColor: BE.line, color: BE.textMute }}>Clear</button>
                <button
                  onClick={() => toggleReview(currentQ)}
                  className="flex items-center gap-2 text-[11.5px] font-bold px-4 py-2 rounded-lg border transition-all"
                  style={{ background: isReviewed ? BE.warn + '11' : 'transparent', borderColor: isReviewed ? BE.warn : BE.line, color: isReviewed ? BE.warn : BE.textMute }}
                >
                  <Flag size={14} /> <span className="hidden sm:inline">{isReviewed ? 'Unmark' : 'Mark Review'}</span>
                </button>
                {/* Mobile submit button */}
                <button
                  onClick={() => setConfirmSubmit(true)}
                  className="md:hidden flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-2 rounded-lg"
                  style={{ background: BE.accent, color: '#fff' }}
                >
                  <Send size={13} /> Submit
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* ── PALETTE SIDEBAR ── */}
        <aside className="hidden lg:flex flex-col w-72 border-l p-6 overflow-y-auto" style={{ borderColor: BE.line, background: BE.surface }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>Question Palette</div>

          <div className="space-y-8">
            {sections.map((sec, si) => (
              <div key={si}>
                <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, marginBottom: 8, opacity: 0.6 }}>{sec.name}</div>
                <PaletteGrid sIdx={si} />
              </div>
            ))}
          </div>

          <div className="mt-auto pt-10">
            <div className="space-y-2 mb-8">
              <div className="flex items-center gap-2.5 text-[10.5px]" style={{ color: BE.textDim }}><div className="w-3 h-3 rounded-sm" style={{ background: BE.good }} /> Answered</div>
              <div className="flex items-center gap-2.5 text-[10.5px]" style={{ color: BE.textDim }}><div className="w-3 h-3 rounded-sm" style={{ background: BE.warn }} /> Marked Review</div>
              <div className="flex items-center gap-2.5 text-[10.5px]" style={{ color: BE.textDim }}><div className="w-3 h-3 rounded-sm" style={{ background: BE.accent }} /> Current</div>
              <div className="flex items-center gap-2.5 text-[10.5px]" style={{ color: BE.textDim }}><div className="w-3 h-3 rounded-sm" style={{ background: BE.surface, border: `1px solid ${BE.line}` }} /> Unseen</div>
            </div>
            <button
              onClick={() => setConfirmSubmit(true)}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: BE.accent, boxShadow: `0 8px 24px ${BE.accent}44` }}
            >
              Submit Entire Test
            </button>
          </div>
        </aside>
      </div>

      {/* ── MOBILE PALETTE OVERLAY ── */}
      {showPalette && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={() => setShowPalette(false)}>
          <div className="w-72 h-full p-6 flex flex-col" style={{ background: BE.surface }} onClick={e => e.stopPropagation()}>
             <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', marginBottom: 16 }}>Question Palette</div>
             <div className="flex-1 overflow-y-auto">
               {sections.map((sec, si) => (
                 <div key={si} className="mb-8">
                   <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, marginBottom: 8 }}>{sec.name}</div>
                   <PaletteGrid sIdx={si} />
                 </div>
               ))}
             </div>
             <button onClick={() => setShowPalette(false)} className="be-btn w-full mt-4">Close</button>
          </div>
        </div>
      )}

      {/* ── SUBMIT MODAL ── */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl p-8 border" style={{ background: BE.surface, borderColor: BE.line }}>
            <div style={{ fontFamily: BE.serif, fontSize: 24, fontWeight: 600, marginBottom: 6, color: BE.text }}>Submit your test?</div>
            <div style={{ fontSize: 14, color: BE.textDim, marginBottom: 24 }}>You have {questions.length - answeredCount - reviewCount} questions remaining. You cannot change your answers after submitting.</div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="p-4 rounded-xl border text-center" style={{ borderColor: BE.line, background: BE.surface }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: BE.good, fontFamily: BE.mono }}>{answeredCount}</div>
                <div style={{ fontSize: 11, color: BE.textMute }}>Answered</div>
              </div>
              <div className="p-4 rounded-xl border text-center" style={{ borderColor: BE.line, background: BE.surface }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: BE.warn, fontFamily: BE.mono }}>{reviewCount}</div>
                <div style={{ fontSize: 11, color: BE.textMute }}>Flagged</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmSubmit(false)} className="flex-1 be-btn" style={{ height: 48 }}>Resume</button>
              <button
                onClick={doSubmit}
                disabled={submitting}
                className="flex-1 be-btn be-btn-primary flex items-center justify-center gap-2"
                style={{ height: 48, background: BE.bad, borderColor: BE.bad }}
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
