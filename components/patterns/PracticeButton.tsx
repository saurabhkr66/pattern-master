// components/patterns/PracticeButton.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import MathRenderer from "@/components/ui/MathRenderer";
import { trackPageView } from "@/lib/analytics";

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
        lastInitialIdRef.current = currentInitialId;
      }
    } else {
      // Transition back to AI Mode
      if (lastInitialIdRef.current !== null) {
        setQuestion(null);
        setQuestionQueue([]);
        lastInitialIdRef.current = null;
      }
    }
  }, [initialQuestion, initialQueue]);
 
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
      setQuestion(next);
      setQuestionQueue(rest);
      setSelectedAnswer(null);
      setMsqSelections([]);
      setNatValue("");
      setIsRevealed(false);
    } else {
      if (isPyqMode) {
        if (onExit) onExit();
        else setQuestion(null);
      } else {
        handleGenerate();
      }
    }
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
    let finalAnswer = finalAnswerOverride || "";
    const type = question.question_type || "MCQ";

    if (type === "MCQ") {
      isCorrect = finalAnswer.trim().toUpperCase() === question.correct_answer.trim().toUpperCase();
      setSelectedAnswer(finalAnswer);
    } else if (type === "MSQ") {
      const userAns = msqSelections.sort().join(", ");
      const correctAns = question.correct_answer.split(",").map((s: string) => s.trim()).sort().join(", ");
      isCorrect = userAns === correctAns;
      finalAnswer = userAns;
    } else if (type === "NAT") {
      const correctAnsStr = question.correct_answer.trim();
      if (correctAnsStr.includes(":")) {
        const [minStr, maxStr] = correctAnsStr.split(":");
        const userVal = parseFloat(natValue.trim());
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
        }),
      });
      // Removing router.refresh() to prevent massive full-page re-renders freezing the browser.
    } catch (err) {
      console.error("Failed to save attempt:", err);
    }
  };

  const checkIsCorrect = () => {
    if (!question) return false;
    const type = question.question_type || "MCQ";
    if (type === "MCQ") return selectedAnswer === question.correct_answer;
    if (type === "MSQ") {
      const userAns = msqSelections.sort().join("");
      const correctAns = (question.correct_answer || "")
        .split(/[;,]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .sort()
        .join("");
      return userAns === correctAns;
    }
    if (type === "NAT") {
      const correctAnsStr = (question.correct_answer || "").trim();
      if (correctAnsStr.includes(":")) {
        const [minStr, maxStr] = correctAnsStr.split(":");
        const userVal = parseFloat(natValue.trim());
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
                    aiModel === id ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
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
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black py-3.5 px-6 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
        <div>
          {/* Back bar */}
          <div className="flex items-center justify-between mb-4">
            {/* <button
              onClick={() => { setQuestion(null); setQuestionQueue([]); }}
              className="text-xs font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors py-1"
            >
              ← Back
            </button> */}
            {/* {questionQueue.length > 0 && (
              <span className="text-[10px] font-black bg-blue-50 text-blue-500 px-2.5 py-1 rounded-full">
                {questionQueue.length} queued
              </span>
            )} */}
          </div>

          {/* Question card */}
          <div className={`rounded-2xl border-2 p-5 md:p-6 mb-4 bg-white dark:bg-[#111] transition-all ${
            question._isPyq 
              ? 'border-orange-100 dark:border-orange-500/20 shadow-orange-500/5' 
              : 'border-gray-50 dark:border-white/5 shadow-blue-500/5'
          }`}>
            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-black bg-blue-600 text-white px-2.5 py-1 rounded-lg uppercase tracking-wide">
                {topicName}
              </span>
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wide border ${
                question.difficulty_level === "Easy"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : question.difficulty_level === "Hard"
                  ? "bg-red-50 text-red-600 border-red-100"
                  : "bg-amber-50 text-amber-600 border-amber-100"
              }`}>
                {question.difficulty_level || "Medium"}
              </span>
              <span className="text-xs font-black bg-gray-50 text-gray-400 border border-gray-100 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                {question.question_type || "MCQ"}
              </span>
              {isRevealed && (
                <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${checkIsCorrect() ? "text-emerald-600" : "text-rose-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${checkIsCorrect() ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  {checkIsCorrect() ? "Correct!" : "Wrong"}
                </span>
              )}
            </div>
            <div className="space-y-4 md:space-y-6">
              <MathRenderer 
                content={question.question_text} 
                className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-300 leading-relaxed" 
              />

              {/* Question Images */}
              {question.images && Array.isArray(question.images) && question.images.length > 0 && (
                <div className="flex flex-col gap-4 py-2">
                  {question.images.map((img: any, idx: number) => {
                    const getImageUrl = (img: any) => {
                      if (img.base64) return img.base64;
                      if (!img.url) return '';
                      
                      // Fix common corruption in seed: prefixing data:image with site URL
                      if (img.url.includes('data:image')) {
                        const dataUriMatch = img.url.match(/data:image\/[^;]+;base64,[^"']+/);
                        if (dataUriMatch) return dataUriMatch[0];
                      }

                      // Use proxy for external gateoverflow.in links to avoid CORS issues
                      if (img.url.includes('gateoverflow.in')) {
                        return `/api/proxy-image?url=${encodeURIComponent(img.url)}`;
                      }
                      
                      return img.url;
                    };

                    return (
                      <div key={idx} className="flex justify-center bg-white dark:bg-black/20 rounded-xl p-2 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                        <img 
                          src={getImageUrl(img)} 
                          alt={`Question detail ${img.index || idx}`}
                          className="max-w-full h-auto rounded-lg object-contain"
                          loading="lazy"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MCQ / MSQ options */}
            {(question.question_type === "MCQ" || question.question_type === "MSQ" || !question.question_type) && (
              <div className="space-y-2">
                {question.options.map((option: string, i: number) => {
                  const letter = option.trim().charAt(0).toUpperCase();
                  const isActuallyCorrect = question.correct_answer.includes(letter);
                  const isSelected =
                    question.question_type === "MSQ"
                      ? msqSelections.includes(letter)
                      : selectedAnswer === letter;

                  return (
                    <button
                      key={i}
                      disabled={isRevealed}
                      onClick={() => {
                        if (question.question_type === "MSQ") toggleMsqSelection(letter);
                        else handleSubmit(letter);
                      }}
                      className={`w-full text-left flex items-center gap-2 md:gap-3 p-2 md:p-3 border-2 rounded-[10px] md:rounded-xl transition-all touch-manipulation ${
                        isRevealed
                          ? isActuallyCorrect
                            ? "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10"
                            : isSelected
                            ? "border-red-400 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 opacity-80"
                            : "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 opacity-40"
                          : "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:bg-blue-50/40 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/30"
                      }`}
                    >
                      <span
                        className={`shrink-0 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-md md:rounded-lg font-black text-[10px] md:text-xs border-2 transition-colors ${
                          isRevealed && isActuallyCorrect
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {letter}
                      </span>
                      <MathRenderer 
                        content={option.includes('.') ? option.split('.').slice(1).join('.').trim() : option} 
                        className="font-bold text-[11px] md:text-base leading-tight text-gray-700 dark:text-gray-300" 
                      />
                    </button>
                  );
                })}

                {question.question_type === "MSQ" && !isRevealed && (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={msqSelections.length === 0}
                    className="mt-3 w-full bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-white/5 text-white font-black text-sm py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/10"
                  >
                    Submit Answer
                  </button>
                )}
              </div>
            )}

            {/* NAT input */}
            {question.question_type === "NAT" && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter numerical answer…"
                  value={natValue}
                  onChange={(e) => setNatValue(e.target.value)}
                  disabled={isRevealed}
                  className="w-full p-4 border-2 border-gray-100 dark:border-white/5 rounded-xl focus:border-blue-400 focus:outline-none font-bold text-center text-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
                />
                {!isRevealed && (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!natValue.trim()}
                    className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-200 text-white font-black text-sm py-3 rounded-xl transition-colors"
                  >
                    Submit
                  </button>
                )}
                {isRevealed && (
                  <div className={`p-4 rounded-xl text-center font-bold text-sm border-2 ${checkIsCorrect() ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                    Correct Answer: {question.correct_answer}
                  </div>
                )}
              </div>
            )}
            
            {!isRevealed && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleNextFromQueue}
                  className="text-[11px] font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                  {questionQueue.length > 0 
                    ? "Skip Question →" 
                    : isPyqMode ? "Finish Review →" : "Skip & Generate →"}
                </button>
              </div>
            )}
          </div>

          {/* Explanation (after reveal) */}
          {isRevealed && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4 pt-2">
              <button 
                onClick={handleNextFromQueue}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs md:text-sm font-black py-4 rounded-xl transition-colors shadow-lg shadow-blue-500/20 uppercase tracking-wide flex justify-center items-center gap-2"
              >
                {questionQueue.length > 0 
                  ? "Next Question →"
                  : isPyqMode
                    ? "Finish Review →"
                    : "Generate 5 More →"
                }
              </button>

              <div className="bg-gray-900 text-white p-5 md:p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl md:text-6xl font-black">?</div>
                <h4 className="text-blue-400 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] mb-2 md:mb-3">Logic Breakdown</h4>
                <MathRenderer 
                  content={question.explanation} 
                  className="text-gray-300 text-xs md:text-sm leading-relaxed relative z-10 break-words" 
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
