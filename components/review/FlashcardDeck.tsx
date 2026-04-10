"use client";

import { useState } from "react";
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
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-12 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-emerald-700 text-lg font-black mb-1">All Clear!</p>
        <p className="text-emerald-600/70 text-sm mb-6">No wrong answers to review yet.</p>
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
  const correctOption = card.options.find((o) => o.charAt(0) === card.correct_answer) ?? card.correct_answer;

  const prev = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.max(0, i - 1)), 150);
  };

  const next = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.min(cards.length - 1, i + 1)), 150);
  };

  const handleFlip = () => setFlipped((f) => !f);

  return (
    <div className="flex flex-col items-center gap-6">

      {/* Progress bar */}
      <div className="flex items-center gap-3 w-full max-w-2xl">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / cards.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-black shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {index + 1}/{cards.length}
        </span>
      </div>

      {/* Flip card */}
      <div
        className="w-full max-w-2xl cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={handleFlip}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "clamp(280px, 50vh, 360px)",
          }}
        >
          {/* Front — Question */}
          <div
            className="absolute inset-0 rounded-2xl p-6 md:p-8 flex flex-col border bg-white"
            style={{ backfaceVisibility: "hidden", borderColor: "var(--border)" }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{card.subject}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[10px] font-bold text-gray-400 truncate">{card.topic_name}</span>
              {card.ispyq && card.year && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-[10px] font-black text-orange-500">PYQ {card.year}</span>
                </>
              )}
            </div>

            <MathRenderer 
              content={card.question_text} 
              className="text-white font-medium text-base leading-relaxed whitespace-pre-wrap flex-1" 
            />

            <div className="mt-6 flex items-center justify-between">
              <div className="space-y-1.5 w-full">
                {card.options.map((opt) => (
                    <MathRenderer 
                      content={opt} 
                      className="px-3 py-2 rounded-lg text-sm text-gray-400 bg-white/[0.03] border border-white/5" 
                      key={opt}
                    />
                ))}
              </div>
            </div>

            <p className="text-center text-gray-400 text-xs mt-5 font-medium">Tap to reveal answer</p>
          </div>

          {/* Back — Answer */}
          <div
            className="absolute inset-0 rounded-2xl p-6 md:p-8 flex flex-col border bg-white"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              borderColor: "rgba(99,102,241,0.25)",
            }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{card.subject}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[10px] font-bold text-gray-400 truncate">{card.topic_name}</span>
            </div>

            {/* Correct answer highlight */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">
                Correct Answer
              </p>
              <MathRenderer 
                content={correctOption} 
                className="text-green-300 font-bold text-sm" 
              />
            </div>

            {/* Explanation */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex-1">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                Explanation
              </p>
              <MathRenderer 
                content={card.explanation} 
                className="text-blue-200/80 text-sm leading-relaxed" 
              />
            </div>

            <Link
              href={`/practice?patternId=${card.patternId}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-5 text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-3 rounded-xl transition-colors uppercase tracking-wide"
            >
              Practice This Topic →
            </Link>

            <p className="text-center text-gray-400 text-xs mt-4 font-medium">Tap to flip back</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors border disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          ← Prev
        </button>

        <button
          onClick={handleFlip}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors"
        >
          {flipped ? "Hide" : "Reveal"}
        </button>

        <button
          onClick={next}
          disabled={index === cards.length - 1}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors border disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
