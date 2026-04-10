// components/patterns/PracticeButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PracticeButtonProps {
  patternId: string;
  topicName: string;
  initialQuestion?: any;
  initialQueue?: any[];
}

export default function PracticeButton({ patternId, topicName, initialQuestion, initialQueue }: PracticeButtonProps) {
  const router = useRouter();
  
  // State Management
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [questionQueue, setQuestionQueue] = useState<any[]>([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null); // For MCQ
  const [msqSelections, setMsqSelections] = useState<string[]>([]); // For MSQ
  const [natValue, setNatValue] = useState(""); // For NAT
  const [isRevealed, setIsRevealed] = useState(false);
  const [aiModel, setAiModel] = useState<"gemini" | "deepseek" | "gemma">("gemini");
  const [error, setError] = useState<string | null>(null);

  // Sync state when a user selects a question from the History/Question Bank
  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      setQuestionQueue(initialQueue || []);
      setIsRevealed(false);
      setSelectedAnswer(null);
      setMsqSelections([]);
      setNatValue("");
      setError(null);
    } else {
      setQuestion(null);
    }
  }, [initialQuestion, initialQueue]);

  // Generate 5 questions in one API call
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

      // Set current question and queue the rest
      setQuestion(data.current);
      setQuestionQueue(data.queue || []);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load next question from the queue (no API call needed!)
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
      // Queue empty — fetch 5 more
      handleGenerate();
    }
  };

  // Toggle MSQ Selection
  const toggleMsqSelection = (letter: string) => {
    if (isRevealed) return;
    setMsqSelections(prev => 
      prev.includes(letter) 
        ? prev.filter(l => l !== letter) 
        : [...prev, letter].sort()
    );
  };

  // Submit Answer to Database
  const handleSubmit = async (finalAnswerOverride?: string) => {
    if (isRevealed) return;

    let isCorrect = false;
    let finalAnswer = finalAnswerOverride || "";

    const type = question.question_type || "MCQ";

    if (type === "MCQ") {
      isCorrect = finalAnswer.trim().toUpperCase() === question.correct_answer.trim().toUpperCase();
      setSelectedAnswer(finalAnswer);
    } else if (type === "MSQ") {
      // Logic for MSQ: "A, B" vs "A, B"
      const userAns = msqSelections.sort().join(", ");
      const correctAns = question.correct_answer.split(",").map((s: string) => s.trim()).sort().join(", ");
      isCorrect = userAns === correctAns;
      finalAnswer = userAns;
    } else if (type === "NAT") {
      isCorrect = natValue.trim() === question.correct_answer.trim();
      finalAnswer = natValue;
    }

    setIsRevealed(true);

    try {
      await fetch("/api/save-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question._isPyq ? undefined : question.id,
          pyqId: question._isPyq ? question.id : undefined,
          isCorrect: isCorrect,
        }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to save attempt:", err);
    }
  };

  const checkIsCorrect = () => {
    if (!question) return false;
    const type = question.question_type || "MCQ";
    if (type === "MCQ") return selectedAnswer === question.correct_answer;
    if (type === "MSQ") {
        const userAns = msqSelections.sort().join(", ");
        const correctAns = question.correct_answer.split(",").map((s: string) => s.trim()).sort().join(", ");
        return userAns === correctAns;
    }
    if (type === "NAT") return natValue.trim() === question.correct_answer.trim();
    return false;
  };

  return (
    <div className="w-full">
      {/* 1. The Action/Reset Button */}
      {!question ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Complexity Level</h4>
            <div className="flex flex-wrap items-center gap-2 p-1 bg-gray-100 rounded-xl w-fit">
              {["Easy", "Medium", "Hard"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                    difficulty === lvl 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Select Brain Engine</h4>
            <div className="flex flex-wrap items-center gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
              <button
                onClick={() => setAiModel("gemini")}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  aiModel === "gemini" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span>♊</span> Gemini
              </button>
              <button
                onClick={() => setAiModel("deepseek")}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  aiModel === "deepseek" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span>🐳</span> DeepSeek
              </button>
              <button
                onClick={() => setAiModel("gemma")}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  aiModel === "gemma" 
                    ? "bg-white text-emerald-600 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span>💎</span> Gemma
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform active:scale-95 transition-all disabled:bg-blue-300 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                Generating with {aiModel}...
              </>
            ) : (
              <>
                <span>🚀</span> Generate 5 Questions ({aiModel})
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => { setQuestion(null); setQuestionQueue([]); }}
            className="text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-blue-600 flex items-center gap-2 transition-colors"
          >
            <span>←</span> Back to Topic Overview
          </button>
          {questionQueue.length > 0 && (
            <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full uppercase">
              {questionQueue.length} more queued
            </span>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-3 p-3 bg-red-50 rounded-lg border border-red-100">⚠️ {error}</p>}

      {/* 2. The Question Display Area */}
      {question && (
        <div className="mt-2 animate-in fade-in zoom-in-95 duration-300">
          <div className="p-5 md:p-8 bg-white rounded-[32px] border border-blue-100 shadow-sm mb-6 relative overflow-hidden">
            {/* Subject Indicator Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 opacity-[0.02] blur-3xl -mr-16 -mt-16 rounded-full"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-black bg-blue-600 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {topicName}
                </span>
                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                  question.difficulty_level === "Easy" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                  question.difficulty_level === "Hard" ? "bg-red-50 text-red-600 border border-red-100" :
                  "bg-amber-50 text-amber-600 border border-amber-100"
                }`}>
                  {question.difficulty_level || "Medium"}
                </span>
                <span className="text-[9px] font-black bg-gray-50 text-gray-400 border border-gray-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {question.question_type || "MCQ"}
                </span>
              </div>
              {isRevealed && (
                <span className={`text-[10px] items-center gap-1.5 font-bold uppercase tracking-widest flex ${checkIsCorrect() ? 'text-emerald-600' : 'text-rose-600'}`}>
                   <span className={`w-2 h-2 rounded-full ${checkIsCorrect() ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                   {checkIsCorrect() ? "Mastered" : "Needs Review"}
                </span>
              )}
            </div>
            
            <p className="text-gray-900 font-bold text-base md:text-[18px] leading-relaxed mb-8 relative z-10">
              {question.question_text}
            </p>

            {/* --- RENDERING BASED ON TYPE --- */}
            
            {/* MCQ / MSQ Rendering */}
            {(question.question_type === "MCQ" || question.question_type === "MSQ" || !question.question_type) && (
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                {question.options.map((option: string, i: number) => {
                  const letter = option.trim().charAt(0).toUpperCase();
                  const isActuallyCorrect = question.correct_answer.includes(letter);
                  
                  let isSelected = false;
                  if (question.question_type === "MSQ") {
                    isSelected = msqSelections.includes(letter);
                  } else {
                    isSelected = selectedAnswer === letter;
                  }

                  let buttonStyle = "border-gray-100 bg-gray-50 active:bg-blue-50";
                  
                  if (isRevealed) {
                    if (isActuallyCorrect) {
                      buttonStyle = "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500";
                    } else if (isSelected) {
                      buttonStyle = "border-red-500 bg-red-50 text-red-800";
                    } else {
                      buttonStyle = "opacity-40 border-gray-100 grayscale-[0.5]";
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={isRevealed}
                      onClick={() => {
                        if (question.question_type === "MSQ") {
                          toggleMsqSelection(letter);
                        } else {
                          handleSubmit(letter);
                        }
                      }}
                      className={`group w-full text-left p-3 md:p-4 border-2 rounded-xl transition-all flex items-center gap-3 md:gap-4 select-none touch-manipulation ${buttonStyle}`}
                    >
                      <span className={`w-7 h-7 md:w-8 md:h-8 shrink-0 flex items-center justify-center rounded-lg font-bold text-xs md:text-sm border-2 transition-colors ${
                        (isRevealed && isActuallyCorrect) || isSelected
                          ? "bg-blue-600 text-white border-blue-600" 
                          : "bg-white text-gray-400 border-gray-200 group-hover:border-blue-400"
                      } ${isRevealed && isActuallyCorrect ? "bg-green-500 border-green-500" : ""}`}>
                        {letter}
                      </span>
                      <span className="font-medium text-xs md:text-base leading-tight">
                        {option.includes('.') ? option.split('.').slice(1).join('.').trim() : option}
                      </span>
                    </button>
                  );
                })}

                {question.question_type === "MSQ" && !isRevealed && (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={msqSelections.length === 0}
                    className="mt-4 w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black disabled:bg-gray-200 transition-all"
                  >
                    Submit MSQ Answer
                  </button>
                )}
              </div>
            )}

            {/* NAT Rendering */}
            {question.question_type === "NAT" && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter numerical value..."
                  value={natValue}
                  onChange={(e) => setNatValue(e.target.value)}
                  disabled={isRevealed}
                  className="w-full p-4 border-2 border-blue-100 rounded-xl focus:border-blue-500 focus:outline-none font-bold text-center text-lg"
                />
                {!isRevealed && (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!natValue.trim()}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black disabled:bg-gray-200 transition-all"
                  >
                    Submit Numerical Answer
                  </button>
                )}
                {isRevealed && (
                  <div className={`p-4 rounded-xl border-2 text-center font-bold ${checkIsCorrect() ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    Correct Answer: {question.correct_answer}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Explanation Section */}
          {isRevealed && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gray-900 text-white p-5 md:p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl md:text-6xl font-black">?</div>
                <h4 className="text-blue-400 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] mb-2 md:mb-3">Logic Breakdown</h4>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed relative z-10">
                  {question.explanation}
                </p>
                
                <div className="mt-4 md:mt-6 flex gap-3">
                  <button 
                    onClick={handleNextFromQueue}
                    className="flex-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-[10px] md:text-xs font-bold py-3 md:py-3.5 rounded-lg transition-colors border border-white/10 touch-manipulation"
                  >
                    {questionQueue.length > 0 
                      ? "Next Question →"
                      : "Generate 5 More →"
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}