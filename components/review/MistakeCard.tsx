"use client";

import { useState } from "react";
import MathRenderer from "@/components/ui/MathRenderer";

interface MistakeCardProps {
  attempt: {
    id: string;
    user_answer: string | null;
  };
  question: {
    question_text: string;
    options: any;
    correct_answer: string;
    explanation: string;
    year?: number | null;
  };
  pattern: {
    subject: string;
    topic_name: string;
  };
}

export default function MistakeCard({ attempt, question, pattern }: MistakeCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const options: string[] = Array.isArray(question.options) ? (question.options as string[]) : [];

  // Resolve a letter like "A" or "C" to the full option text
  const resolveOption = (letter: string | null) => {
    if (!letter) return null;
    return options.find((o) => o.charAt(0).toUpperCase() === letter.trim().toUpperCase()) ?? letter;
  };

  const userAnswerDisplay = resolveOption(attempt.user_answer);
  const correctAnswerDisplay = resolveOption(question.correct_answer) ?? question.correct_answer;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111] shadow-sm">
      {/* Topic bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
        <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
          {pattern.subject}
        </span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <MathRenderer
          content={pattern.topic_name}
          className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate"
        />
        {question.year && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-[10px] font-black text-orange-500 dark:text-orange-400">
              PYQ {question.year}
            </span>
          </>
        )}
      </div>

      <div className="px-4 py-4">
        {/* Question */}
        <MathRenderer
          content={question.question_text}
          className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-relaxed mb-4 whitespace-pre-wrap"
        />

        {/* Comparison block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest mb-1">
              Your Answer
            </p>
            {userAnswerDisplay ? (
              <MathRenderer
                content={userAnswerDisplay}
                className="text-red-700 dark:text-red-300 font-black text-sm"
              />
            ) : (
              <span className="text-red-400 dark:text-red-500 font-bold text-sm italic">Not answered</span>
            )}
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-4 py-3">
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
              Correct Answer
            </p>
            <MathRenderer
              content={correctAnswerDisplay}
              className="text-emerald-700 dark:text-emerald-300 font-black text-sm"
            />
          </div>
        </div>

        {/* Options */}
        {options.length > 0 && (
          <div className="space-y-2 mb-4">
            {options.map((opt: string) => {
              const letter = opt.charAt(0);
              const isCorrect = letter === question.correct_answer;
              const isUserSelected = attempt.user_answer?.includes(letter);

              return (
                <div
                  key={opt}
                  className={`px-3 py-2.5 rounded-xl text-sm border flex items-center justify-between transition-colors ${
                    isCorrect
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold"
                      : isUserSelected
                      ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300"
                      : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <div className="flex items-center">
                    {isCorrect && <span className="mr-2 text-emerald-600 dark:text-emerald-400">✓</span>}
                    {!isCorrect && isUserSelected && (
                      <span className="mr-2 text-red-600 dark:text-red-400">✕</span>
                    )}
                    <MathRenderer content={opt} className="inline" />
                  </div>
                  {isUserSelected && (
                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-50">
                      You
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Explanation Toggle */}
        {question.explanation && (
          <div className="mt-4">
            {!showExplanation ? (
              <button
                onClick={() => setShowExplanation(true)}
                className="w-full py-2.5 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-500/10 transition-colors"
              >
                Show Explanation 💡
              </button>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Logic Breakdown
                  </p>
                  <button
                    onClick={() => setShowExplanation(false)}
                    className="text-[10px] font-black text-blue-400 hover:text-blue-600 uppercase tracking-widest"
                  >
                    Hide
                  </button>
                </div>
                <MathRenderer
                  content={question.explanation}
                  className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
