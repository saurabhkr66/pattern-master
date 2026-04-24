// components/patterns/PracticeButton.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Maximize2, Minimize2, Bookmark } from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";
import { trackPageView } from "@/lib/analytics";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { BE } from "@/lib/theme";

interface PracticeButtonProps {
  patternId: string;
  topicName: string;
  initialQuestion?: any;
  initialQueue?: any[];
  isPyqMode?: boolean;
  onExit?: () => void;
}

export default function PracticeButton({ patternId, topicName, initialQuestion, initialQueue, isPyqMode: _propIsPyqMode, onExit }: PracticeButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isPyqMode = _propIsPyqMode || initialQuestion?._isPyq;
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState<any>(initialQuestion || null);
  const [questionQueue, setQuestionQueue] = useState<any[]>(initialQueue || []);
  const [difficulty, setDifficulty] = useState("Medium");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [msqSelections, setMsqSelections] = useState<string[]>([]);
  const [natValue, setNatValue] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [aiModel, setAiModel] = useState<"gemini" | "deepseek" | "gemma">("gemini");
  const lastInitialIdRef = useRef<string | null>(initialQuestion?.id || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(!!(initialQuestion));
  const [questionHistory, setQuestionHistory] = useState<any[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const { language, setLanguage } = useLanguage();

  // Lock body scroll while fullscreen is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  useEffect(() => {
    // Only reset everything IF the parent has explicitly changed the question ID.
    // This prevents the "vanishing explanation" AND the "Next Question reset" bugs.
    const currentInitialId = initialQuestion?.id || null;
    
    if (initialQuestion) {
      if (currentInitialId !== lastInitialIdRef.current) {
        setQuestion(initialQuestion);
        setQuestionQueue(initialQueue || []);
        setIsRevealed(false);
        setSelectedAnswer(null);
        setMsqSelections([]);
        setNatValue("");
        setError(null);
        setQuestionHistory([]);
        setSeconds(0);
        setIsBookmarked(!!initialQuestion?.isBookmarked);
        lastInitialIdRef.current = currentInitialId;
      }
    } else {
      // Transition back to AI Mode
      if (lastInitialIdRef.current !== null) {
        setQuestion(null);
        setQuestionQueue([]);
        setIsBookmarked(false);
        lastInitialIdRef.current = null;
      }
    }
  }, [initialQuestion, initialQueue]);

  useEffect(() => {
    if (question) {
        setIsBookmarked(!!question.isBookmarked);
    }
  }, [question?.id]);
 
  // ── Analytics: silently sync question ID to URL ──────────────────────
  // Uses replaceState (not router.push) → zero re-renders, zero speed impact.
  // GA4 + ad networks see a new URL = new page view, boosting impressions.
  useEffect(() => {
    if (!question?.id) return;
    const url = new URL(window.location.href);
    url.searchParams.set("q", question.id);
    window.history.replaceState(null, "", url.toString());
    
    // Skip tracking on initial mount to avoid double-counting with the layout script
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    trackPageView();
  }, [question?.id]);

  // Scroll into view when a question is opened

  useEffect(() => {
    if (question && containerRef.current) {
      containerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [question?.id, !!question]);

  // Auto-dismiss fullscreen hint after 5s;
  // Also show it whenever a new question first appears (AI generated)
  const hintShownRef = useRef(!!(initialQuestion));
  useEffect(() => {
    if (question) {
      const timer = setTimeout(() => setShowFullscreenHint(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [!!question]);

  // Real-time Timer logic
  useEffect(() => {
    if (!question || isRevealed) return;
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [question, isRevealed]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!question) return;
    const handler = (e: KeyboardEvent) => {
      // If we're revealed, Enter should go to next
      if (isRevealed) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleNextFromQueue();
        }
        return;
      }

      // If not revealed, standard controls
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        if (question.question_type === 'MSQ') toggleMsqSelection(key);
        else setSelectedAnswer(key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (question.question_type === 'MCQ' && selectedAnswer) handleSubmit();
        else if (question.question_type === 'MSQ' && msqSelections.length > 0) handleSubmit();
        else if (question.question_type === 'NAT' && natValue.trim()) handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [question?.id, isRevealed, selectedAnswer, msqSelections, questionQueue?.length]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setQuestion(null);
    setQuestionQueue([]);
    setSelectedAnswer(null);
    setMsqSelections([]);
    setNatValue("");
    setIsRevealed(false);
    try {
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId, difficulty, provider: aiModel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");
      setQuestion(data.current);
      setQuestionQueue(data.queue || []);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextFromQueue = () => {
    if (questionQueue.length > 0) {
      const [next, ...rest] = questionQueue;
      setQuestionHistory((h) => [...h, question]);
      setQuestion(next);
      setQuestionQueue(rest);
      setSelectedAnswer(null);
      setMsqSelections([]);
      setNatValue("");
      setIsRevealed(false);
      setSeconds(0);
    } else {
      if (isPyqMode) {
        setIsFullscreen(false);
        if (onExit) onExit();
        else setQuestion(null);
      } else {
        handleGenerate();
      }
    }
  };

  const handlePrevious = () => {
    if (questionHistory.length === 0) return;
    const prev = questionHistory[questionHistory.length - 1];
    setQuestionHistory((h) => h.slice(0, -1));
    setQuestionQueue((q) => [question, ...q]);
    setQuestion(prev);
    setSelectedAnswer(null);
    setMsqSelections([]);
    setNatValue("");
    setIsRevealed(false);
  };

  const toggleMsqSelection = (letter: string) => {
    if (isRevealed) return;
    setMsqSelections((prev) =>
      prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter].sort()
    );
  };

  const handleSubmit = async (finalAnswerOverride?: string) => {
    if (isRevealed) return;
    let isCorrect = false;
    const type = question.question_type || "MCQ";
    let finalAnswer = finalAnswerOverride || (
      type === "MCQ" ? selectedAnswer :
      type === "MSQ" ? msqSelections.sort().join(", ") :
      natValue
    ) || "";

    if (type === "MCQ") {
      isCorrect = finalAnswer.trim().toUpperCase() === question.correct_answer.trim().toUpperCase();
      if (!finalAnswerOverride) setSelectedAnswer(finalAnswer);
    } else if (type === "MSQ") {
      const userAns = msqSelections.sort().join(", ");
      const correctAns = question.correct_answer.split(",").map((s: string) => s.trim()).sort().join(", ");
      isCorrect = userAns === correctAns;
      finalAnswer = userAns;
    } else if (type === "NAT") {
      const correctAnsStr = question.correct_answer.trim();
      const userVal = parseFloat(natValue.trim());
      // Support both "min:max" and "min to max" range formats
      const colonRange = correctAnsStr.includes(":") && !correctAnsStr.toLowerCase().includes(" to ");
      const toRange = / to /i.test(correctAnsStr);
      if (colonRange) {
        const [minStr, maxStr] = correctAnsStr.split(":");
        isCorrect = !isNaN(userVal) && userVal >= parseFloat(minStr) && userVal <= parseFloat(maxStr);
      } else if (toRange) {
        const [minStr, maxStr] = correctAnsStr.split(/ to /i);
        isCorrect = !isNaN(userVal) && userVal >= parseFloat(minStr) && userVal <= parseFloat(maxStr);
      } else {
        isCorrect = natValue.trim() === correctAnsStr;
      }
      finalAnswer = natValue;
    }

    setIsRevealed(true);

    // OPTIMISTIC UPDATE: Update the React Query cache INSTANTLY
    // This allows the QuestionCards in the background to update their "✓ Correct" tags 
    // with 0ms latency, bypassing the network completely.
    queryClient.setQueryData(["patternQuestions", patternId], (oldData: any) => {
      if (!oldData) return oldData;
      
      const targetId = question.id;
      const newAttempt = { is_correct: isCorrect, user_answer: finalAnswer, created_at: new Date().toISOString() };
      
      const updateArray = (arr: any[]) => (arr || []).map(q => 
        q.id === targetId ? { ...q, attempts: [newAttempt, ...(q.attempts || [])] } : q
      );

      return {
        ...oldData,
        questions: updateArray(oldData.questions),
        pyqs: updateArray(oldData.pyqs),
      };
    });

    try {
      // Async network save, but UI has already updated!
      fetch("/api/save-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: (question._isPyq || question._isSubjectPyq) ? undefined : question.id,
          pyqId: (question._isPyq && !question._isSubjectPyq) ? question.id : undefined,
          subjectPyqId: question._isSubjectPyq ? question.id : undefined,
          isCorrect,
          userAnswer: finalAnswer,
          timeSpent: seconds,
        }),
      });
      // Removing router.refresh() to prevent massive full-page re-renders freezing the browser.
    } catch (err) {
      console.error("Failed to save attempt:", err);
    }
  };

  const handleToggleBookmark = async () => {
    if (!question || isBookmarking) return;
    setIsBookmarking(true);
    
    const prev = isBookmarked;
    setIsBookmarked(!prev);

    try {
      const res = await fetch("/api/bookmarks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: (question._isPyq || question._isSubjectPyq) ? undefined : question.id,
          pyqId: (question._isPyq && !question._isSubjectPyq) ? question.id : undefined,
          subjectPyqId: question._isSubjectPyq ? question.id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setIsBookmarked(data.bookmarked);

      // Sync React Query cache
      queryClient.setQueryData(["patternQuestions", patternId], (oldData: any) => {
        if (!oldData) return oldData;
        const targetId = question.id;
        const updateArray = (arr: any[]) => (arr || []).map(q => 
          q.id === targetId ? { ...q, isBookmarked: data.bookmarked } : q
        );
        return {
          ...oldData,
          questions: updateArray(oldData.questions),
          pyqs: updateArray(oldData.pyqs),
        };
      });
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
      setIsBookmarked(prev); // Revert on error
    } finally {
      setIsBookmarking(false);
    }
  };

  const checkIsCorrect = () => {
    if (!question) return false;
    const type = question.question_type || "MCQ";
    if (type === "MCQ") {
      return (selectedAnswer || "").trim().toUpperCase() === (question.correct_answer || "").trim().toUpperCase();
    }
    if (type === "MSQ") {
      const userAns = msqSelections.sort().join(", ");
      const correctAns = (question.correct_answer || "")
        .split(/[;,]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .sort()
        .join(", ");
      return userAns === correctAns;
    }
    if (type === "NAT") {
      const correctAnsStr = (question.correct_answer || "").trim();
      const userVal = parseFloat(natValue.trim());
      const colonRange = correctAnsStr.includes(":") && !correctAnsStr.toLowerCase().includes(" to ");
      const toRange = / to /i.test(correctAnsStr);
      if (colonRange) {
        const [minStr, maxStr] = correctAnsStr.split(":");
        return !isNaN(userVal) && userVal >= parseFloat(minStr) && userVal <= parseFloat(maxStr);
      }
      if (toRange) {
        const [minStr, maxStr] = correctAnsStr.split(/ to /i);
        return !isNaN(userVal) && userVal >= parseFloat(minStr) && userVal <= parseFloat(maxStr);
      }
      return natValue.trim() === correctAnsStr;
    }
    return false;
  };

  const difficultyConfig: Record<string, { label: string; active: string }> = {
    Easy: { label: "Easy", active: "text-emerald-600 bg-white shadow-sm" },
    Medium: { label: "Medium", active: "text-amber-600 bg-white shadow-sm" },
    Hard: { label: "Hard", active: "text-red-600 bg-white shadow-sm" },
  };

  const modelConfig = [
    { id: "gemini" as const, label: "Gemini", icon: "♊" },
    { id: "deepseek" as const, label: "DeepSeek", icon: "🐳" },
    { id: "gemma" as const, label: "Gemma", icon: "💎" },
  ];

  return (
    <div ref={containerRef} className="w-full scroll-mt-20">
      {/* 1. The Action/Reset Button */}
      {!question ? (
        <div className="space-y-5">
          {/* Difficulty */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Difficulty</p>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
              {Object.entries(difficultyConfig).map(([lvl, cfg]) => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                    difficulty === lvl ? cfg.active : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Model */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">AI Engine</p>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
              {modelConfig.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setAiModel(id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                    aiModel === id ? "bg-white text-amber-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-black py-3.5 px-6 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>🚀 Generate 5 Questions</>
            )}
          </button>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              ⚠️ {error}
            </p>
          )}
        </div>
      ) : (
        /* ── Question Mode ── */
        /* ── Question Mode ── */
        <div 
          className={isFullscreen
            ? "fixed inset-0 z-[60] overflow-y-auto flex flex-col"
            : "rounded-2xl border overflow-hidden flex flex-col w-full shadow-sm"
          }
          style={{ 
            background: isFullscreen ? 'var(--bg-base)' : 'var(--bg-surface)',
            borderColor: BE.line
          }}
        >
          {/* Progress Rail — Mobile Responsive */}
          <div style={{
            borderBottom: `1px solid ${BE.line}`,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: isFullscreen ? 'transparent' : BE.lineSoft,
            flexWrap: 'nowrap', minWidth: 0,
          }}>
            <div 
              onClick={() => { setIsFullscreen(false); if(onExit) onExit(); else setQuestion(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: BE.textDim, fontSize: 12, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3L5 7l4 4"/></svg>
              <span className="hidden sm:inline">Back</span>
            </div>
            <div style={{ width: 1, height: 14, background: BE.line, flexShrink: 0 }} />

            {/* Progress counter + bar */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: BE.textDim, fontFamily: BE.mono, flexShrink: 0 }}>{questionHistory.length + 1}/{questionHistory.length + questionQueue.length + 1}</div>
              <div style={{ flex: 1, height: 3, background: BE.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${((questionHistory.length + 1) / (questionHistory.length + questionQueue.length + 1)) * 100}%`, height: '100%', background: BE.accent, transition: 'width 0.3s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: BE.textDim, fontFamily: BE.mono }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7.5" r="5"/><path d="M7 4.5v3l2 1.5M7 1v1.5"/></svg>
                {formatTime(seconds)}
              </div>
              <div style={{ width: 1, height: 14, background: BE.line }} />
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="hover:text-amber-500 transition-colors p-1"
                style={{ fontSize: 11, fontWeight: 700, color: BE.textDim, display: 'flex', alignItems: 'center', gap: 3 }}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden md:inline" style={{ fontSize: 10 }}>{isFullscreen ? 'Exit' : 'Focus'}</span>
              </button>
            </div>
          </div>

          <div className={isFullscreen 
            ? "max-w-3xl mx-auto w-full px-4 pt-6 pb-24 sm:py-10 md:py-14" 
            : "p-4 sm:p-6 md:p-8 pb-20 sm:pb-8"
          }>
            {/* Meta bar — Typographic design */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10.5, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 20 }}>
              <span style={{ color: BE.accent }}>{topicName}</span>
              <span>·</span>
              <span style={{ color: question.difficulty_level === 'Hard' ? BE.bad : question.difficulty_level === 'Easy' ? BE.good : BE.warn }}>{question.difficulty_level || 'Medium'}</span>
              <span>·</span>
              <span>{question.question_type || 'MCQ'} · {question.marks || 1} mark{(question.marks || 1) > 1 ? 's' : ''}</span>
              <span style={{ flex: 1 }} />
              <button 
                onClick={handleToggleBookmark}
                disabled={isBookmarking}
                style={{ 
                    display: 'flex', alignItems: 'center', gap: 4, 
                    color: isBookmarked ? BE.accent : BE.textDim,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    padding: 4,
                    borderRadius: 6
                }}
                className="hover:bg-white/5 active:scale-90"
                title={isBookmarked ? "Remove Bookmark" : "Bookmark Question"}
              >
                <Bookmark size={14} fill={isBookmarked ? BE.accent : "none"} strokeWidth={isBookmarked ? 0 : 2} />
              </button>
              <span style={{ width: 1, height: 12, background: BE.line }} />
              <span style={{ fontFamily: BE.mono, textTransform: 'none', letterSpacing: 0, fontWeight: 500, opacity: 0.6 }}>#{question.id?.slice(-5)}</span>
            </div>

            {/* Question Text */}
            <div style={{ fontSize: 'clamp(15px, 4vw, 20px)', lineHeight: 1.6, letterSpacing: -0.2, fontWeight: 400, marginBottom: 24, fontFamily: BE.serif, color: BE.text, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              <MathRenderer content={(language === "hi" && question.question_text_hindi) ? question.question_text_hindi : question.question_text} />
            </div>

            {/* Question Images */}
            {question.images && Array.isArray(question.images) && question.images.filter((img: any) => img.type !== 'explanation').length > 0 && (
              <div className="flex flex-col gap-4 mb-8">
                {question.images.filter((img: any) => img.type !== 'explanation').map((img: any, idx: number) => (
                  <div key={idx} className="flex justify-center rounded-xl p-3 border shadow-sm overflow-hidden" style={{ background: BE.surface, borderColor: BE.line }}>
                    <img src={img.url || img.base64} alt="Question figure" className="max-w-full h-auto rounded-lg object-contain" />
                  </div>
                ))}
              </div>
            )}

            {/* MCQ / MSQ Options Grid */}
            {(question.question_type === 'MCQ' || question.question_type === 'MSQ' || !question.question_type) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {question.options.map((option: string, i: number) => {
                  const letter = option.trim().charAt(0).toUpperCase();
                  const isSelected = question.question_type === 'MSQ' ? msqSelections.includes(letter) : selectedAnswer === letter;
                  const isActuallyCorrect = isRevealed && question.correct_answer.includes(letter);
                  const isWrong = isRevealed && isSelected && !isActuallyCorrect;
                  
                  const bg = isActuallyCorrect ? BE.goodSoft : isWrong ? BE.badSoft : isSelected ? BE.accentSoft : BE.surface;
                  const bd = isActuallyCorrect ? BE.good : isWrong ? BE.bad : isSelected ? BE.accent : BE.line;

                  return (
                    <div 
                      key={i} 
                      onClick={() => !isRevealed && (question.question_type === 'MSQ' ? toggleMsqSelection(letter) : setSelectedAnswer(letter))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', border: `1.5px solid ${bd}`, borderRadius: 12,
                        background: bg, cursor: isRevealed ? 'default' : 'pointer',
                        transition: 'all 0.15s ease', minWidth: 0,
                      }}
                      className={!isRevealed ? "hover:border-amber-500/50" : ""}
                    >
                      <div style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        background: isSelected || isActuallyCorrect ? bd : BE.lineSoft,
                        color: isSelected || isActuallyCorrect ? '#fff' : BE.textDim,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 900, fontFamily: BE.mono,
                      }}>{letter}</div>
                      <div style={{ fontSize: 'clamp(13px, 3.5vw, 15px)', color: BE.text, flex: 1, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        <MathRenderer content={option.includes('.') ? option.split('.').slice(1).join('.').trim() : option} />
                      </div>
                      {isActuallyCorrect && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={BE.good} strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M3 8l3.5 3.5L13 5"/></svg>}
                      {isWrong && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={BE.bad} strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M4 4l8 8M12 4l-8 8"/></svg>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* NAT Input */}
            {question.question_type === "NAT" && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter numerical answer…"
                  value={natValue}
                  onChange={(e) => setNatValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && natValue.trim() && !isRevealed) {
                      handleSubmit();
                    }
                  }}
                  disabled={isRevealed}
                  className="w-full p-5 border-2 rounded-2xl focus:border-amber-400 focus:outline-none font-black text-center text-xl"
                  style={{ background: BE.lineSoft, borderColor: BE.line, color: BE.text }}
                />
                {isRevealed && (
                  <div style={{ background: checkIsCorrect() ? BE.goodSoft : BE.badSoft, border: `1px solid ${checkIsCorrect() ? BE.good : BE.bad}`, color: checkIsCorrect() ? BE.good : BE.bad }} className="p-4 rounded-xl text-center font-bold text-sm">
                    Correct Answer: {question.correct_answer}
                  </div>
                )}
              </div>
            )}

            {/* Action Row — Mobile stacks, desktop inline */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BE.line}` }}>
              {!isRevealed ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: BE.textMute, fontWeight: 700, textTransform: 'uppercase' }} className="hidden md:flex mr-auto">
                    <kbd style={kbdStyle}>A</kbd><kbd style={kbdStyle}>B</kbd><kbd style={kbdStyle}>C</kbd><kbd style={kbdStyle}>D</kbd>
                    <span style={{ marginLeft: 4 }}>Select</span>
                    <kbd style={{ ...kbdStyle, minWidth: 32 }}>ENTER</kbd>
                    <span style={{ marginLeft: 4 }}>Submit</span>
                  </div>
                  <div className="hidden md:block flex-1" />
                  <button onClick={handlePrevious} disabled={questionHistory.length === 0} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30">Prev</button>
                  <button onClick={handleNextFromQueue} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Skip</button>
                  {(question.question_type === 'MCQ' || question.question_type === 'MSQ' || question.question_type === 'NAT') && (
                    <button 
                      onClick={() => handleSubmit()} 
                      disabled={
                        question.question_type === 'MCQ' ? !selectedAnswer :
                        question.question_type === 'MSQ' ? msqSelections.length === 0 : 
                        !natValue.trim()
                      } 
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Submit
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex justify-end">
                  <button 
                    onClick={handleNextFromQueue} 
                    className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider bg-amber-600 text-white shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
                  >
                    {questionQueue.length > 0 ? "Next Question" : "Finish Review"}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 10l3-3-3-3"/></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Revealed Explanation */}
            {isRevealed && (
              <div className="mt-6 animate-in slide-in-from-bottom-4 duration-500">
                <div style={{ border: `1px solid ${BE.line}`, borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BE.line}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, background: BE.lineSoft }}>
                    <span style={{ 
                      fontSize: 10, fontWeight: 900, textTransform: 'uppercase', padding: '4px 8px', borderRadius: 6,
                      background: checkIsCorrect() ? BE.goodSoft : BE.badSoft,
                      color: checkIsCorrect() ? BE.good : BE.bad,
                      flexShrink: 0,
                    }}>
                      {checkIsCorrect() ? '✓ Correct' : '× Wrong'}
                    </span>
                    <div style={{ fontSize: 11, color: BE.textDim, fontWeight: 600, flexShrink: 0 }}>
                      {seconds}s
                    </div>
                    <span style={{ fontSize: 11, color: BE.textDim, fontWeight: 500 }}>Explanation & Logic</span>
                  </div>
                  <div style={{ padding: '16px 16px', fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.75, color: BE.textDim, fontFamily: BE.serif, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    <MathRenderer content={(language === "hi" && question.explanation_hindi) ? question.explanation_hindi : question.explanation} />
                    {question.images?.filter((img: any) => img.type === 'explanation').map((img: any, idx: number) => (
                      <div key={idx} className="mt-4 flex justify-center rounded-xl p-3 border" style={{ background: BE.surface, borderColor: BE.line }}>
                        <img src={img.url || img.base64} alt="Explanation logic" className="max-w-full h-auto rounded-lg" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const kbdStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 18, height: 18, padding: '0 5px',
  border: `1.2px solid ${BE.line}`, borderRadius: 4,
  background: BE.lineSoft, color: BE.textDim,
  fontFamily: BE.mono, fontSize: 10, fontWeight: 800,
};
