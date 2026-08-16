"use client";

import { Bookmark } from "lucide-react";
import { BE } from "@/lib/theme";
import { normalizeDifficulty, DIFFICULTY_COLORS } from "@/lib/difficulty";
interface QuestionMetaBarProps {
  question: any;
  topicName: string;
  hasReported: boolean;
  isBookmarked: boolean;
  isBookmarking: boolean;
  language: string;
  onReport: () => void;
  onToggleBookmark: () => void;
  onLanguageChange: (lang: "en" | "hi") => void;
}

export default function QuestionMetaBar({
  question, topicName, hasReported, isBookmarked, isBookmarking,
  language, onReport, onToggleBookmark, onLanguageChange,
}: QuestionMetaBarProps) {
  // Bank questions carry difficulty_level, PYQs carry difficulty (AI-classified).
  const difficulty = normalizeDifficulty(question.difficulty_level, question.difficulty);
  // Report and Bookmark both key off a FK to GeneratedQuestion / PYQ /
  // MockQuestion. A DPP question is in none of those tables, so both actions
  // would 500 — hide them rather than ship two buttons that always fail.
  const canPersist = !question._isDpp;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10.5, color: BE.textMute, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, marginBottom: 20 }}>
      <span style={{ color: BE.accent }}>{topicName}</span>
      <span>·</span>
      {difficulty && (
        <>
          <span style={{ color: DIFFICULTY_COLORS[difficulty].fg }}>{difficulty}</span>
          <span>·</span>
        </>
      )}
      <span>{question.question_type || "MCQ"}{/* · {question.marks || 1} mark{(question.marks || 1) > 1 ? "s" : ""} */}</span>
      <span style={{ flex: 1 }} />
      {canPersist && (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          onClick={onReport}
          disabled={hasReported}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            color: hasReported ? "#ef4444" : BE.textDim,
            transition: "all 0.2s", cursor: hasReported ? "default" : "pointer",
            background: "transparent", border: "none", padding: 4, borderRadius: 6,
          }}
          title={hasReported ? "Report submitted" : "Report an issue"}
          className={hasReported ? "" : "hover:text-red-500"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={hasReported ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
            <line x1="4" x2="4" y1="22" y2="15"></line>
          </svg>
        </button>
        <button
          onClick={onToggleBookmark}
          disabled={isBookmarking}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            color: isBookmarked ? BE.accent : BE.textDim,
            transition: "all 0.2s", cursor: "pointer",
            background: "transparent", border: "none", padding: 4, borderRadius: 6,
          }}
          className="hover:bg-white/5 active:scale-90"
          title={isBookmarked ? "Remove Bookmark" : "Bookmark Question"}
        >
          <Bookmark size={14} fill={isBookmarked ? BE.accent : "none"} strokeWidth={isBookmarked ? 0 : 2} />
        </button>
      </div>
      )}
      <span style={{ fontFamily: BE.mono, textTransform: "none", letterSpacing: 0, fontWeight: 500, opacity: 0.6 }}>
        #{question.id?.slice(-5)}
      </span>

      {question.question_text_hindi && (
        <div className="flex gap-0.5 p-0.5 bg-white/5 rounded-lg border border-white/10 ml-2">
          <button
            onClick={() => onLanguageChange("en")}
            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
              language === "en" ? "bg-amber-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => onLanguageChange("hi")}
            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
              language === "hi" ? "bg-amber-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            हिन्दी
          </button>
        </div>
      )}
    </div>
  );
}
