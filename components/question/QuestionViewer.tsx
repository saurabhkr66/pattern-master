"use client";
// components/question/QuestionViewer.tsx
// Client component that handles "Show Answer" toggle.

import { useState, useEffect, useRef } from "react";
import katex from "katex";

// ------------------- Math rendering helper -----------------------------------
function renderMath(text: string): string {
  // Block math: \[ ... \]
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      return `<div class="math-block">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<div class="math-block">[math]</div>`; }
  });
  // Inline math: \( ... \)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch { return "[math]"; }
  });
  // Inline math: $ ... $ (single dollar, non-greedy)
  text = text.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch { return "[math]"; }
  });
  return text;
}

interface QuestionData {
  id: string;
  prefix: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  questionType: string;
  images?: { index: number; filename: string }[];
}

export default function QuestionViewer({ question: q }: { question: QuestionData }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const qRef = useRef<HTMLDivElement>(null);
  const expRef = useRef<HTMLDivElement>(null);

  // Render math into DOM refs after mount
  useEffect(() => {
    if (qRef.current) qRef.current.innerHTML = renderMath(q.questionText);
  }, [q.questionText]);

  useEffect(() => {
    if (showAnswer && expRef.current) {
      expRef.current.innerHTML = renderMath(q.explanation);
    }
  }, [showAnswer, q.explanation]);

  const correctLetters = q.correctAnswer.split(";").map(s => s.trim());

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>

      {/* Question text */}
      <div className="p-6 md:p-8">
        <div
          ref={qRef}
          className="text-base leading-relaxed font-medium"
          style={{ color: "var(--text-primary)" }}
        />

        {/* Optional images (linked, not embedded – avoids CDN dependency) */}
        {q.images && q.images.length > 0 && (
          <p className="mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
            📎 This question contains {q.images.length} image(s). Please refer to the original GATE paper for the figure.
          </p>
        )}
      </div>

      {/* Options */}
      {q.questionType !== "NAT" && q.options.length > 0 && (
        <div className="px-6 pb-2 md:px-8 grid gap-2">
          {q.options.map((opt, i) => {
            const letter = opt.trim().match(/^([A-Z])[.)]/)?.[1] ?? String.fromCharCode(65 + i);
            const isCorrect = showAnswer && correctLetters.includes(letter);
            return (
              <div
                key={i}
                className="rounded-xl px-4 py-3 text-sm transition-colors"
                style={{
                  background: isCorrect ? "rgba(34,197,94,0.12)" : "var(--bg-surface-2)",
                  border: `1px solid ${isCorrect ? "rgba(34,197,94,0.4)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                  fontWeight: isCorrect ? 700 : 400,
                }}
                dangerouslySetInnerHTML={{ __html: renderMath(opt) }}
              />
            );
          })}
        </div>
      )}

      {/* Show Answer button */}
      <div className="px-6 md:px-8 py-6 flex items-center gap-4">
        <button
          onClick={() => setShowAnswer(v => !v)}
          className="rounded-xl px-6 py-2.5 text-sm font-bold transition-all"
          style={{
            background: showAnswer ? "var(--bg-surface-2)" : "var(--accent)",
            color: showAnswer ? "var(--text-secondary)" : "#fff",
            border: "1px solid var(--border)",
          }}
        >
          {showAnswer ? "Hide Answer" : "Show Answer"}
        </button>

        {q.questionType === "NAT" && showAnswer && (
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Answer: <strong style={{ color: "var(--text-primary)" }}>{q.correctAnswer}</strong>
          </span>
        )}
      </div>

      {/* Explanation – only visible after Show Answer */}
      {showAnswer && q.explanation && (
        <div
          className="px-6 md:px-8 pb-8"
        >
          <div
            className="rounded-xl p-5 text-sm leading-relaxed"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              📖 Explanation
            </p>
            <div
              ref={expRef}
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
