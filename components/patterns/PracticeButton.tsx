// components/patterns/PracticeButton.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Maximize2, Minimize2, Bookmark } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { quickEditExplanation } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";
import { trackPageView } from "@/lib/analytics";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { BE } from "@/lib/theme";
import { getCloudinaryUrl } from "@/lib/imageUtils";

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
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  
  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  const isAdmin = userEmail === "sauravkum4200@gmail.com" || userEmail === "sauravkum420@gmail.com";
  
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editedExplanation, setEditedExplanation] = useState("");
  const [isSavingExplanation, setIsSavingExplanation] = useState(false);

  const isPyqMode = _propIsPyqMode || initialQuestion?._isPyq;
  const [showSignInModal, setShowSignInModal] = useState(false);
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

  // AI Auto-Fill State
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<{ input: number, output: number, thoughts: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Reporting State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);
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
      if (currentInitialId !== lastInitialIdRef.current && currentInitialId !== question?.id) {
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
        setGeneratedExplanation(null);
        setHasReported(false);
        setShowReportModal(false);
      }
      lastInitialIdRef.current = currentInitialId;
    } else {
      // Transition back to AI Mode
      if (lastInitialIdRef.current !== null) {
        setQuestion(null);
        setQuestionQueue([]);
        setIsBookmarked(false);
        setGeneratedExplanation(null);
        setHasReported(false);
        setShowReportModal(false);
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
  // Uses router.replace (shallow) → zero re-renders of parent, zero speed impact.
  // The GlobalAnalyticsTracker will detect this change and notify GA.
  useEffect(() => {
    if (!question?.id) return;
    const params = new URLSearchParams(window.location.search);
    params.set("q", question.id);
    router.replace(`/practice?${params.toString()}`, { scroll: false });
  }, [question?.id, router]);

  // Scroll into view when a question is opened
  useEffect(() => {
    if (question && containerRef.current) {
      containerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [question?.id, !!question]);

  const handleGenerateExplanation = async () => {
    if (!question || isGeneratingExplanation) return;
    setIsGeneratingExplanation(true);

    const isMock = question.isMock || patternId?.startsWith('mock-');
    const mockTestId = isMock ? patternId.replace('mock-', '') : undefined;

    try {
      const res = await fetch("/api/questions/generate-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          questionType: isMock ? "MockQuestion" : undefined,
          mockTestId,
          isSubjectPyq: question._isSubjectPyq,
          isPyq: question._isPyq,
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedExplanation(data.explanation);
        if (data.usage) setAiUsage(data.usage);
      }
    } catch (e) {
      console.error("Failed to generate explanation", e);
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

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
    if (!isSignedIn) { setShowSignInModal(true); return; }
    setIsLoading(true);
    setError(null);
    setQuestion(null);
    setQuestionQueue([]);
    setSelectedAnswer(null);
    setMsqSelections([]);
    setNatValue("");
    setIsRevealed(false);
    setHasReported(false);
    setGeneratedExplanation(null);
    setAiUsage(null);
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
      setHasReported(false);
      setGeneratedExplanation(null);
      setAiUsage(null);
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
    setHasReported(false);
    setGeneratedExplanation(null);
    setAiUsage(null);
  };

  const toggleMsqSelection = (letter: string) => {
    if (isRevealed) return;
    setMsqSelections((prev) =>
      prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter].sort()
    );
  };

  // NEW: Shared robust evaluation logic to prevent discrepancies between UI and DB
  const evaluateAnswer = (userAns: string, questionObj: any) => {
    if (!userAns || !questionObj) return false;
    const type = questionObj.question_type || "MCQ";
    const dbAns = (questionObj.correct_answer || "").trim();

    if (type === "MCQ") {
      // Standardize both to just the letter (A, B, C, D)
      const cleanUser = userAns.trim().charAt(0).toUpperCase();
      const cleanDb = dbAns.charAt(0).toUpperCase();
      return cleanUser === cleanDb;
    }

    if (type === "MSQ") {
      // Support both comma and semicolon separators, and handle messy whitespace/empty entries
      const parse = (str: string) => str
        .split(/[;,]/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(",");
      
      return parse(userAns) === parse(dbAns);
    }

    if (type === "NAT") {
      const userVal = parseFloat(userAns.trim());
      if (isNaN(userVal)) return false;

      // Range logic: "min:max" or "min to max"
      const rangeMatch = dbAns.match(/^([\d.-]+)\s*(?::|to)\s*([\d.-]+)$/i);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        return userVal >= min && userVal <= max;
      }

      // Single value match (using string comparison for precision or float comparison for tolerance?)
      // Let's use float comparison with a tiny epsilon for robustness
      const dbVal = parseFloat(dbAns);
      return !isNaN(dbVal) && Math.abs(userVal - dbVal) < 0.000001;
    }

    return false;
  };

  const handleSubmit = async (finalAnswerOverride?: string) => {
    if (isRevealed) return;
    if (!isSignedIn) { setShowSignInModal(true); return; }

    const type = question.question_type || "MCQ";
    let finalAnswer = finalAnswerOverride || (
      type === "MCQ" ? selectedAnswer :
      type === "MSQ" ? msqSelections.sort().join(", ") :
      natValue
    ) || "";

    const isCorrect = evaluateAnswer(finalAnswer, question);

    if (type === "MCQ" && !finalAnswerOverride) {
      setSelectedAnswer(finalAnswer);
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
      const saveRequest = fetch("/api/save-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: (question._isPyq || question._isSubjectPyq || question.isMock) ? undefined : question.id,
          pyqId: (question._isPyq && !question._isSubjectPyq) ? question.id : undefined,
          subjectPyqId: question._isSubjectPyq ? question.id : undefined,
          mockQuestionId: question.isMock ? question.id : undefined,
          isCorrect,
          userAnswer: finalAnswer,
          timeSpent: seconds,
        }),
      });
      // practiceProgress has a 6h staleTime, so it won't refetch on its own; force a refresh
      // after the server-side dashboard tag has been revalidated by /api/save-attempt.
      if (isCorrect) {
        saveRequest
          .then(() => queryClient.invalidateQueries({ queryKey: ["practiceProgress"] }))
          .catch((err) => console.error("Failed to refresh progress:", err));
      }
      // Removing router.refresh() to prevent massive full-page re-renders freezing the browser.
    } catch (err) {
      console.error("Failed to save attempt:", err);
    }
  };

  const handleSaveExplanation = async () => {
    if (!isAdmin || !question) return;
    setIsSavingExplanation(true);
    try {
      let type: string = "GeneratedQuestion";
      let mockTestId: string | undefined = undefined;

      if (question.isMock) {
        type = "MockQuestion";
        mockTestId = patternId.replace('mock-', '');
      } else if (question._isSubjectPyq) {
        type = "SubjectPYQ";
      } else if (question._isPyq) {
        type = "PYQ";
      }

      await quickEditExplanation(question.id, type, editedExplanation, mockTestId);
      
      // Update local state
      setQuestion({ ...question, explanation: editedExplanation });
      setGeneratedExplanation(null);
      setIsEditingExplanation(false);
    } catch (err) {
      console.error("Failed to save explanation:", err);
      alert("Failed to save explanation.");
    } finally {
      setIsSavingExplanation(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!question || isBookmarking) return;
    if (!isSignedIn) { setShowSignInModal(true); return; }
    setIsBookmarking(true);
    
    const prev = isBookmarked;
    setIsBookmarked(!prev);

    try {
      const res = await fetch("/api/bookmarks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: (question._isPyq || question._isSubjectPyq || question.isMock) ? undefined : question.id,
          pyqId: (question._isPyq && !question._isSubjectPyq) ? question.id : undefined,
          subjectPyqId: question._isSubjectPyq ? question.id : undefined,
          mockQuestionId: question.isMock ? question.id : undefined,
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
    const currentAnswer = 
      type === "MCQ" ? selectedAnswer :
      type === "MSQ" ? msqSelections.sort().join(", ") :
      natValue;
    
    return evaluateAnswer(currentAnswer || "", question);
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
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button 
                  onClick={() => setShowReportModal(true)}
                  disabled={hasReported}
                  style={{ 
                      display: 'flex', alignItems: 'center', gap: 4, 
                      color: hasReported ? '#ef4444' : BE.textDim,
                      transition: 'all 0.2s', cursor: hasReported ? 'default' : 'pointer', background: 'transparent', border: 'none', padding: 4, borderRadius: 6
                  }}
                  title={hasReported ? "Report submitted" : "Report an issue"}
                  className={hasReported ? "" : "hover:text-red-500"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={hasReported ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
                </button>
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
              </div>
              <span style={{ fontFamily: BE.mono, textTransform: 'none', letterSpacing: 0, fontWeight: 500, opacity: 0.6 }}>#{question.id?.slice(-5)}</span>
              
              {/* Contextual Language Switcher */}
              {question.question_text_hindi && (
                <div className="flex gap-0.5 p-0.5 bg-white/5 rounded-lg border border-white/10 ml-2">
                  <button
                    onClick={() => setLanguage("en")}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                      language === "en" ? "bg-amber-600 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage("hi")}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                      language === "hi" ? "bg-amber-600 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    हिन्दी
                  </button>
                </div>
              )}
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
                    <img src={getCloudinaryUrl(img.url || img.filename) || img.base64} alt="Question figure" className="max-w-full h-auto rounded-lg object-contain" />
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
                    <div style={{ flex: 1 }}></div>
                    {isAdmin && aiUsage && (
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-mono text-zinc-500 uppercase tracking-tight">
                        <span className="opacity-50">Usage:</span>
                        <span>{aiUsage.input} in</span>
                        <span className="w-px h-2 bg-zinc-300 dark:bg-zinc-700" />
                        <span>{aiUsage.output} out</span>
                        {aiUsage.thoughts > 0 && (
                          <>
                            <span className="w-px h-2 bg-zinc-300 dark:bg-zinc-700" />
                            <span className="text-amber-500 font-bold">{aiUsage.thoughts} thk</span>
                          </>
                        )}
                      </div>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          if (isEditingExplanation) {
                            setIsEditingExplanation(false);
                          } else {
                            setEditedExplanation(generatedExplanation || question.explanation || "");
                            setIsEditingExplanation(true);
                          }
                        }}
                        className="px-2 py-1 text-[10px] font-bold rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      >
                        {isEditingExplanation ? "Cancel Edit" : "Edit Explanation"}
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '16px 16px', fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.75, color: BE.textDim, fontFamily: BE.serif, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    {isGeneratingExplanation ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-3 animate-in fade-in duration-500">
                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-widest animate-pulse">AI is generating logic...</span>
                      </div>
                    ) : isEditingExplanation ? (
                      <div className="flex flex-col gap-3 animate-in fade-in">
                        <textarea
                          value={editedExplanation}
                          onChange={(e) => setEditedExplanation(e.target.value)}
                          className="w-full p-4 rounded-xl text-sm bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 outline-none font-mono"
                          rows={6}
                        />
                        {editedExplanation && (
                          <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm">
                            <span className="text-[10px] uppercase font-bold text-amber-500 mb-2 block">Live Preview</span>
                            <MathRenderer content={editedExplanation} />
                          </div>
                        )}
                        <button
                          onClick={handleSaveExplanation}
                          disabled={isSavingExplanation}
                          className="self-end px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-all"
                        >
                          {isSavingExplanation ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    ) : (
                      <>
                        {(!question.explanation && !generatedExplanation) ? (
                          <div className="flex flex-col items-center justify-center py-6 gap-3">
                            <p className="text-xs text-gray-500 font-medium">No explanation is available for this question yet.</p>
                            <button
                              onClick={handleGenerateExplanation}
                              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2"
                            >
                              ✨ Generate AI Logic
                            </button>
                          </div>
                        ) : (
                          <>
                            <MathRenderer content={(language === "hi" && question.explanation_hindi) ? question.explanation_hindi : (generatedExplanation || question.explanation || "No explanation available.")} />
                            {question.images?.filter((img: any) => img.type === 'explanation').map((img: any, idx: number) => (
                              <div key={idx} className="mt-4 flex justify-center rounded-xl p-3 border" style={{ background: BE.surface, borderColor: BE.line }}>
                                <img src={getCloudinaryUrl(img.url || img.filename) || img.base64} alt="Explanation logic" className="max-w-full h-auto rounded-lg" />
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Report Issue Modal ─────────────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
              </div>
              <h3 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Report Issue</h3>
            </div>
            
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>What seems to be the problem with this question?</p>
            
            <div className="flex flex-col gap-2 mb-4">
              {['Incorrect Answer', 'Typo / Formatting Issue', 'Explanation is wrong', 'Other'].map(r => (
                <label key={r} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ border: `1px solid ${reportReason === r ? 'var(--accent)' : 'transparent'}`, background: reportReason === r ? 'var(--bg-surface-2)' : 'transparent' }}>
                  <input type="radio" name="report_reason" checked={reportReason === r} onChange={() => setReportReason(r)} className="accent-amber-500 w-4 h-4" />
                  <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: reportReason === r ? 600 : 500 }}>{r}</span>
                </label>
              ))}
            </div>

            {reportReason === 'Other' && (
              <textarea
                placeholder="Please describe the issue (optional)..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="w-full p-3 rounded-xl mb-4 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: 'none' }}
                rows={3}
              />
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReportModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>Cancel</button>
              <button 
                onClick={async () => {
                  if (!reportReason || !isSignedIn) {
                    if (!isSignedIn) { setShowReportModal(false); setShowSignInModal(true); }
                    return;
                  }
                  setIsReporting(true);
                  try {
                    await fetch("/api/questions/report", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ questionId: question.id, isPyq: question._isPyq, isSubjectPyq: question._isSubjectPyq, reason: reportReason, details: reportDetails })
                    });
                    setHasReported(true);
                    setShowReportModal(false);
                    setReportReason("");
                    setReportDetails("");
                  } finally { setIsReporting(false); }
                }} 
                disabled={!reportReason || isReporting}
                className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-50 transition-transform active:scale-95 flex justify-center items-center"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
              >
                {isReporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign-in gate modal ──────────────────────────────────────────── */}
      {showSignInModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSignInModal(false); }}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl p-8 shadow-2xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            {/* Close */}
            <button
              onClick={() => setShowSignInModal(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-xs"
              style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Lock icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h2
              className="text-xl font-black text-center mb-2"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.4px" }}
            >
              Sign in to check your answer
            </h2>
            <p
              className="text-sm text-center mb-6 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Create a free account to submit answers, track your progress, and build a streak.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/sign-up")}
                className="w-full py-3 rounded-xl font-black text-sm text-white"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                Sign up free — takes 30 seconds
              </button>
              <button
                onClick={() => router.push("/sign-in")}
                className="w-full py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                Already have an account? Sign in
              </button>
            </div>

            <p
              className="text-center text-[10px] mt-4"
              style={{ color: "var(--text-muted)" }}
            >
              Free forever · No credit card
            </p>
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
