// components/patterns/PracticeButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PracticeButtonProps {
  patternId: string;
  topicName: string;
  initialQuestion?: any;
}

export default function PracticeButton({ patternId, topicName, initialQuestion }: PracticeButtonProps) {
  const router = useRouter();
  
  // State Management
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [questionQueue, setQuestionQueue] = useState<any[]>([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when a user selects a question from the History/Question Bank
  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      setIsRevealed(false);
      setSelectedAnswer(null);
      setError(null);
    } else {
      setQuestion(null);
    }
  }, [initialQuestion]);

  // Generate 5 questions in one API call
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setQuestion(null);
    setQuestionQueue([]);
    setSelectedAnswer(null);
    setIsRevealed(false);

    try {
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId, difficulty }),
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
      setIsRevealed(false);
    } else {
      // Queue empty — fetch 5 more
      handleGenerate();
    }
  };

  // Submit Answer to Database
  const handleAnswerClick = async (option: string) => {
    if (isRevealed) return;

    const guessedLetter = option.trim().charAt(0).toUpperCase();
    const isCorrect = guessedLetter === question.correct_answer;

    setSelectedAnswer(guessedLetter);
    setIsRevealed(true);

    try {
      await fetch("/api/save-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          isCorrect: isCorrect,
        }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to save attempt:", err);
    }
  };

  return (
    <div className="w-full">
      {/* 1. The Action/Reset Button */}
      {!question ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-1 bg-gray-100 rounded-xl w-fit">
            {["Easy", "Medium", "Hard"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDifficulty(lvl)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  difficulty === lvl 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform active:scale-95 transition-all disabled:bg-blue-300 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                Generating 5 {difficulty} Questions...
              </>
            ) : (
              <>
                <span>🚀</span> Generate 5 {difficulty} Questions
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
          <div className="p-4 md:p-6 bg-white rounded-2xl border-2 border-blue-50 shadow-sm mb-4">
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] md:text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase">
                  {topicName}
                </span>
                <span className={`text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  question.difficulty_level === "Easy" ? "bg-emerald-100 text-emerald-700" :
                  question.difficulty_level === "Hard" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {question.difficulty_level || "Medium"}
                </span>
              </div>
              {isRevealed && (
                <span className={`text-[10px] md:text-xs font-bold shrink-0 ${selectedAnswer === question.correct_answer ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedAnswer === question.correct_answer ? "✓ CORRECT" : "✕ INCORRECT"}
                </span>
              )}
            </div>
            
            <p className="text-gray-800 font-bold text-sm md:text-lg leading-snug mb-4 md:mb-6">
              {question.question_text}
            </p>

            <div className="grid grid-cols-1 gap-2 md:gap-3">
              {question.options.map((option: string, i: number) => {
                const letter = option.trim().charAt(0).toUpperCase();
                const isSelected = selectedAnswer === letter;
                const isActuallyCorrect = letter === question.correct_answer;

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
                    onClick={() => handleAnswerClick(option)}
                    className={`group w-full text-left p-3 md:p-4 border-2 rounded-xl transition-all flex items-center gap-3 md:gap-4 select-none touch-manipulation ${buttonStyle}`}
                  >
                    <span className={`w-7 h-7 md:w-8 md:h-8 shrink-0 flex items-center justify-center rounded-lg font-bold text-xs md:text-sm border-2 transition-colors ${
                      isRevealed && isActuallyCorrect 
                        ? "bg-green-500 text-white border-green-500" 
                        : "bg-white text-gray-400 border-gray-200 group-hover:border-blue-400"
                    }`}>
                      {letter}
                    </span>
                    <span className="font-medium text-xs md:text-base leading-tight">
                      {option.includes('.') ? option.split('.').slice(1).join('.').trim() : option}
                    </span>
                  </button>
                );
              })}
            </div>
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
                      ? `${questionQueue.length} More Queued →`
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