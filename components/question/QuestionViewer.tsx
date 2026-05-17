"use client";
// components/question/QuestionViewer.tsx
// Client component that handles "Show Answer" toggle.

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import katex from "katex";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getCloudinaryUrl } from "@/lib/imageUtils";

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
  questionTextHindi?: string;
  options: string[];
  optionsHindi?: string[];
  correctAnswer: string;
  explanation: string;
  explanationHindi?: string;
  questionType: string;
  images?: { index: number; filename: string; type?: string }[];
}

// Constrained image with click-to-expand lightbox
function QuestionImage({ src, alt }: { src: string; alt: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="relative inline-block group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={() => setExpanded(true)}
          className="rounded-lg cursor-zoom-in"
          style={{
            maxWidth:   "100%",
            maxHeight:  240,
            width:      "auto",
            height:     "auto",
            objectFit:  "contain",
            display:    "block",
          }}
        />
        {/* Expand hint */}
        <button
          onClick={() => setExpanded(true)}
          className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.55)" }}
          aria-label="Expand image"
        >
          <Maximize2 size={13} className="text-white" />
        </button>
      </div>

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setExpanded(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12 }}
          />
        </div>
      )}
    </>
  );
}

export default function QuestionViewer({
  question: q,
  practiceHref,
}: {
  question: QuestionData;
  /**
   * Override the "Solve in Practice Mode" link. Callers on the topic page
   * pass a fully-qualified URL with exam/branch/subject/patternId/questionId
   * so the practice page lands in the right context. Defaults to the legacy
   * shorthand if not provided.
   */
  practiceHref?: string;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const { language, setLanguage } = useLanguage();

  // Render math directly during render (runs server-side too) so Googlebot
  // sees the fully-rendered question text + explanation in the initial HTML
  // rather than empty <div>s populated only after JS hydration. katex's
  // renderToString is synchronous and SSR-safe.
  const questionHtml = renderMath(
    (language === "hi" && q.questionTextHindi) ? q.questionTextHindi : q.questionText,
  );
  const explanationHtml = renderMath(
    ((language === "hi" && q.explanationHindi) ? q.explanationHindi : q.explanation) || "",
  );

  const correctLetters = q.correctAnswer
    .split(/[;,]/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>

      {/* Question text */}
      <div className="p-6 md:p-8">
        <div
          className="text-base leading-relaxed font-medium"
          style={{ color: "var(--text-primary)" }}
          dangerouslySetInnerHTML={{ __html: questionHtml }}
        />

        {/* Question images (exclude explanation-type images) */}
        {q.images && q.images.filter(img => img.type !== "explanation").length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {q.images.filter(img => img.type !== "explanation").map((img) => (
              <QuestionImage key={img.index} src={getCloudinaryUrl(img.filename)} alt={`Figure ${img.index}`} />
            ))}
          </div>
        )}
      </div>

      {/* Options */}
      {q.questionType !== "NAT" && q.options.length > 0 && (
        <div className="px-6 pb-2 md:px-8 grid gap-2">
          {q.options.map((opt, i) => {
            const letter = opt.trim().match(/^([A-Z])[.)]/)?.[1] ?? String.fromCharCode(65 + i);
            const isCorrect = showAnswer && correctLetters.includes(letter.toUpperCase());
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
                dangerouslySetInnerHTML={{ 
                  __html: renderMath(
                    (language === "hi" && q.optionsHindi && q.optionsHindi[i]) ? q.optionsHindi[i] : opt
                  ) 
                }}
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

        <a
          href={practiceHref ?? `/practice?q=${q.prefix}-${q.id}`}
          className="hidden sm:inline-flex rounded-xl px-6 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: "var(--bg-surface-2)",
            color: "var(--accent)",
            border: "1px solid var(--accent)",
          }}
        >
          🚀 Solve in Practice Mode
        </a>

        {q.questionType === "NAT" && showAnswer && (
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Answer: <strong style={{ color: "var(--text-primary)" }}>{q.correctAnswer}</strong>
          </span>
        )}

        {/* Language Toggle */}
        {(q.questionTextHindi || (q.optionsHindi && q.optionsHindi.length > 0)) && (
          <div className="ml-auto flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setLanguage("en")}
              className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
              style={{
                background: language === "en" ? "var(--accent)" : "transparent",
                color: language === "en" ? "#fff" : "var(--text-secondary)",
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
              style={{
                background: language === "hi" ? "var(--accent)" : "transparent",
                color: language === "hi" ? "#fff" : "var(--text-secondary)",
              }}
            >
              हिन्दी
            </button>
          </div>
        )}
      </div>

      {/* Explanation — always in the DOM for SEO indexing, visually hidden
          until the user clicks "Show Answer". `display: none` is used (not
          `visibility: hidden`) so the block doesn't reserve layout space; Google
          still indexes content inside `display: none` nodes. */}
      {(q.explanation || (q.images && q.images.some(img => img.type === "explanation"))) && (
        <div
          className="px-6 md:px-8 pb-8"
          style={{ display: showAnswer ? "block" : "none" }}
        >
          <div
            className="rounded-xl p-5 text-sm leading-relaxed"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              📖 Explanation
            </p>
            <div
              style={{ color: "var(--text-primary)" }}
              dangerouslySetInnerHTML={{ __html: explanationHtml }}
            />
            {/* Explanation images */}
            {q.images && q.images.filter(img => img.type === "explanation").length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {q.images.filter(img => img.type === "explanation").map((img) => (
                  <QuestionImage key={img.index} src={getCloudinaryUrl(img.filename)} alt={`Explanation Figure ${img.index}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
