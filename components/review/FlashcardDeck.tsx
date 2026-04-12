"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MathRenderer from "@/components/ui/MathRenderer";

type Flashcard = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic_name: string;
  subject: string;
  patternId: string;
  ispyq?: boolean;
  year?: number;
};

export default function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-12 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-emerald-700 dark:text-emerald-400 text-lg font-black mb-1">All Clear!</p>
        <p className="text-emerald-600/70 dark:text-emerald-500/60 text-sm mb-6">No wrong answers to review yet.</p>
        <Link
          href="/practice"
          className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
        >
          Start Practicing →
        </Link>
      </div>
    );
  }

  const card = cards[index];
  const options: string[] = Array.isArray(card.options) ? card.options : [];

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setRevealed(false);
  }, []);

  const prev = () => { if (index > 0) goTo(index - 1); };
  const next = () => { if (index < cards.length - 1) goTo(index + 1); };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setRevealed((r) => !r);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, cards.length]);

  return (
    <div className="flex flex-col gap-6">

      {/* Card counter + dots */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black tabular-nums" style={{ color: "var(--text-muted)" }}>
          {index + 1} <span className="font-normal opacity-50">/ {cards.length}</span>
        </span>
        {/* Dot progress — show up to 15 dots, collapse rest */}
        <div className="flex items-center gap-1">
          {cards.slice(0, Math.min(cards.length, 15)).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-200 ${
                i === index
                  ? "w-4 h-2 bg-indigo-500"
                  : "w-2 h-2 bg-gray-200 dark:bg-white/10 hover:bg-indigo-300 dark:hover:bg-indigo-500/40"
              }`}
            />
          ))}
          {cards.length > 15 && (
            <span className="text-[10px] font-bold ml-1" style={{ color: "var(--text-muted)" }}>
              +{cards.length - 15}
            </span>
          )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
          {revealed ? "Answer" : "Question"}
        </span>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl border overflow-hidden cursor-pointer select-none transition-shadow duration-200 hover:shadow-lg"
        style={{
          background: "var(--bg-surface)",
          borderColor: revealed ? "rgba(99,102,241,0.3)" : "var(--border)",
          boxShadow: revealed ? "0 0 0 1px rgba(99,102,241,0.15)" : undefined,
        }}
        onClick={() => setRevealed((r) => !r)}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{
            background: revealed ? "rgba(99,102,241,0.06)" : "var(--bg-surface-2)",
            borderColor: revealed ? "rgba(99,102,241,0.15)" : "var(--border)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest shrink-0">
              {card.subject}
            </span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span className="text-[10px] font-bold truncate" style={{ color: "var(--text-muted)" }}>
              {card.topic_name}
            </span>
            {card.ispyq && card.year && (
              <>
                <span style={{ color: "var(--border)" }}>·</span>
                <span className="text-[10px] font-black text-orange-500 shrink-0">PYQ {card.year}</span>
              </>
            )}
          </div>
          <span
            className={`shrink-0 ml-3 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${
              revealed
                ? "bg-indigo-500/10 text-indigo-500"
                : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500"
            }`}
          >
            {revealed ? "Answer" : "Question"}
          </span>
        </div>

        {/* Question */}
        <div className="px-5 pt-5 pb-4">
          <MathRenderer
            content={card.question_text}
            className="text-base font-bold leading-relaxed"
            style={{ color: "var(--text-primary)" } as any}
          />
        </div>

        {/* Options */}
        {options.length > 0 && (
          <div className="px-5 pb-5 space-y-2">
            {options.map((opt) => {
              const letter = opt.charAt(0).toUpperCase();
              const isCorrect = letter === card.correct_answer.trim().toUpperCase();

              return (
                <div
                  key={opt}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-all duration-300 ${
                    revealed && isCorrect
                      ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10"
                      : "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-black border transition-all duration-300 ${
                      revealed && isCorrect
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {letter}
                  </span>
                  <MathRenderer
                    content={opt.includes(".") ? opt.split(".").slice(1).join(".").trim() : opt}
                    className={`flex-1 leading-snug font-medium transition-colors duration-300 ${
                      revealed && isCorrect
                        ? "text-emerald-800 dark:text-emerald-300 font-bold"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  />
                  {revealed && isCorrect && (
                    <span className="shrink-0 text-emerald-500 font-black text-xs mt-0.5">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Explanation — slides in after reveal */}
        {revealed && card.explanation && (
          <div
            className="mx-5 mb-5 rounded-xl px-4 py-4 border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 animate-in slide-in-from-bottom-2 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-2">
              Logic Breakdown
            </p>
            <MathRenderer
              content={card.explanation}
              className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
            />
          </div>
        )}

        {/* Tap hint */}
        {!revealed && (
          <div className="px-5 pb-5">
            <p className="text-center text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
              Tap card · Space · Enter to reveal answer
            </p>
          </div>
        )}
      </div>

      {/* Navigation + Practice button */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex-1 py-3 rounded-xl font-bold text-sm border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-400 dark:hover:border-indigo-500"
          style={{
            background: "var(--bg-surface-2)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          ← Prev
        </button>

        <Link
          href={`/practice?patternId=${card.patternId}`}
          className="flex-1 py-3 text-center rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Practice Topic
        </Link>

        <button
          onClick={next}
          disabled={index === cards.length - 1}
          className="flex-1 py-3 rounded-xl font-bold text-sm border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-400 dark:hover:border-indigo-500"
          style={{
            background: "var(--bg-surface-2)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          Next →
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        ← → arrow keys to navigate
      </p>
    </div>
  );
}
