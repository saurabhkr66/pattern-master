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

  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [questionQueue, setQuestionQueue] = useState<any[]>([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [msqSelections, setMsqSelections] = useState<string[]>([]);
  const [natValue, setNatValue] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [aiModel, setAiModel] = useState<"gemini" | "deepseek" | "gemma">("gemini");
  const [error, setError] = useState<string | null>(null);

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
      handleGenerate();
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
          isCorrect,
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
    <div className="w-full">
      {/* ── Generate Screen (no question loaded) ── */}
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
            <button
              onClick={() => { setQuestion(null); setQuestionQueue([]); }}
              className="text-xs font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors py-1"
            >
              ← Back
            </button>
            {questionQueue.length > 0 && (
              <span className="text-[10px] font-black bg-blue-50 text-blue-500 px-2.5 py-1 rounded-full">
                {questionQueue.length} queued
              </span>
            )}
          </div>

          {/* Question card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 md:p-6 mb-4">
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

            {/* Question text */}
            <p className="text-gray-900 font-bold text-base leading-relaxed mb-5">
              {question.question_text}
            </p>

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

                  let cls = "border-gray-100 bg-gray-50 hover:bg-blue-50/40 hover:border-blue-200";
                  if (isRevealed) {
                    if (isActuallyCorrect) cls = "border-emerald-400 bg-emerald-50";
                    else if (isSelected) cls = "border-red-400 bg-red-50 opacity-80";
                    else cls = "border-gray-100 bg-gray-50 opacity-40";
                  }

                  return (
                    <button
                      key={i}
                      disabled={isRevealed}
                      onClick={() => {
                        if (question.question_type === "MSQ") toggleMsqSelection(letter);
                        else handleSubmit(letter);
                      }}
                      className={`w-full text-left flex items-center gap-3 p-3 border-2 rounded-xl transition-all touch-manipulation ${cls}`}
                    >
                      <span
                        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg font-black text-xs border-2 transition-colors ${
                          isRevealed && isActuallyCorrect
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-gray-200 text-gray-400"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-sm font-medium text-gray-800 leading-snug">
                        {option.includes(".") ? option.split(".").slice(1).join(".").trim() : option}
                      </span>
                    </button>
                  );
                })}

                {question.question_type === "MSQ" && !isRevealed && (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={msqSelections.length === 0}
                    className="mt-3 w-full bg-gray-900 hover:bg-black disabled:bg-gray-200 text-white font-black text-sm py-3 rounded-xl transition-colors"
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
                  className="w-full p-4 border-2 border-gray-100 rounded-xl focus:border-blue-400 focus:outline-none font-bold text-center text-lg bg-gray-50"
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
          </div>

          {/* Explanation (after reveal) */}
          {isRevealed && (
            <div className="animate-in slide-in-from-bottom-3 duration-300 rounded-2xl bg-gray-900 text-white p-5 md:p-6">
              <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-2">Logic Breakdown</p>
              <p className="text-gray-300 text-sm leading-relaxed">{question.explanation}</p>
              <button
                onClick={handleNextFromQueue}
                className="mt-5 w-full bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 text-white text-sm font-bold py-3 rounded-xl transition-colors touch-manipulation"
              >
                {questionQueue.length > 0 ? "Next Question →" : "Generate 5 More →"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
