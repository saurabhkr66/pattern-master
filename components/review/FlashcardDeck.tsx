"use client";

import { useState } from "react";
import Link from "next/link";

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
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-12 text-center">
        <p className="text-green-400 text-xl font-black mb-1">All Clear!</p>
        <p className="text-green-300/60 text-sm mb-6">No wrong answers to review yet.</p>
        <Link
          href="/practice"
          className="inline-block bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
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
      {/* Progress */}
      <div className="flex items-center gap-3 w-full max-w-2xl">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / cards.length) * 100}%` }}
          />
        </div>
        <span className="text-gray-400 text-sm font-bold shrink-0">
          {index + 1} / {cards.length}
        </span>
      </div>

      {/* Card */}
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
            minHeight: "340px",
          }}
        >
          {/* Front — Question */}
          <div
            className="absolute inset-0 bg-[#111] border border-white/10 rounded-2xl p-8 flex flex-col"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Topic */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {card.subject}
              </span>
              <span className="text-gray-600">·</span>
              <span className="text-[10px] font-bold text-gray-400">{card.topic_name}</span>
              {card.ispyq && card.year && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="text-[10px] font-bold text-orange-400">PYQ {card.year}</span>
                </>
              )}
            </div>

            <p className="text-white font-medium text-base leading-relaxed whitespace-pre-wrap flex-1">
              {card.question_text}
            </p>

            <div className="mt-6 flex items-center justify-between">
              <div className="space-y-1.5 w-full">
                {card.options.map((opt) => (
                  <div
                    key={opt}
                    className="px-3 py-2 rounded-lg text-sm text-gray-400 bg-white/[0.03] border border-white/5"
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-gray-600 text-xs mt-6 font-medium">
              Tap to reveal answer & explanation
            </p>
          </div>

          {/* Back — Answer */}
          <div
            className="absolute inset-0 bg-[#111] border border-indigo-500/30 rounded-2xl p-8 flex flex-col"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {card.subject}
              </span>
              <span className="text-gray-600">·</span>
              <span className="text-[10px] font-bold text-gray-400">{card.topic_name}</span>
            </div>

            {/* Correct answer highlight */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">
                Correct Answer
              </p>
              <p className="text-green-300 font-bold text-sm">{correctOption}</p>
            </div>

            {/* Explanation */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex-1">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                Explanation
              </p>
              <p className="text-blue-200/80 text-sm leading-relaxed">{card.explanation}</p>
            </div>

            <Link
              href={`/practice?patternId=${card.patternId}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-5 text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-colors uppercase tracking-wide"
            >
              Practice This Topic →
            </Link>

            <p className="text-center text-gray-600 text-xs mt-4 font-medium">
              Tap to flip back
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl border border-white/10 transition-colors"
        >
          ← Prev
        </button>

        <button
          onClick={handleFlip}
          className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors"
        >
          {flipped ? "Hide" : "Reveal"}
        </button>

        <button
          onClick={next}
          disabled={index === cards.length - 1}
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl border border-white/10 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
