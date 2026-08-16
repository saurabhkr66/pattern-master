"use client";

import MathRenderer from "@/components/ui/MathRenderer";
import { getCloudinaryUrl } from "@/lib/imageUtils";
import { BE } from "@/lib/theme";

interface ExplanationPanelProps {
  question: any;
  language: string;
  isCorrect: boolean;
  seconds: number;
  isAdmin: boolean;
  isGeneratingExplanation: boolean;
  generatedExplanation: string | null;
  aiUsage: { input: number; output: number; thoughts: number } | null;
  isEditingExplanation: boolean;
  editedExplanation: string;
  isSavingExplanation: boolean;
  onGenerateExplanation: () => void;
  onToggleEdit: () => void;
  onEditChange: (val: string) => void;
  onSaveExplanation: () => void;
}

export default function ExplanationPanel({
  question, language, isCorrect, seconds, isAdmin,
  isGeneratingExplanation, generatedExplanation, aiUsage,
  isEditingExplanation, editedExplanation, isSavingExplanation,
  onGenerateExplanation, onToggleEdit, onEditChange, onSaveExplanation,
}: ExplanationPanelProps) {
  return (
    <div className="mt-6 animate-in slide-in-from-bottom-4 duration-500">
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 16, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BE.line}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, background: BE.lineSoft }}>
          <span style={{
            fontSize: 10, fontWeight: 900, textTransform: "uppercase", padding: "4px 8px", borderRadius: 6,
            background: isCorrect ? BE.goodSoft : BE.badSoft,
            color: isCorrect ? BE.good : BE.bad,
            flexShrink: 0,
          }}>
            {isCorrect ? "✓ Correct" : "× Wrong"}
          </span>
          <div style={{ fontSize: 11, color: BE.textDim, fontWeight: 600, flexShrink: 0 }}>{seconds}s</div>
          <span style={{ fontSize: 11, color: BE.textDim, fontWeight: 500 }}>Explanation & Logic</span>
          <div style={{ flex: 1 }}></div>
          {isAdmin && aiUsage && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-mono text-zinc-500 uppercase tracking-tight">
              <span className="opacity-50">Usage:</span>
              <span>{aiUsage.input} in</span>
              <span className="w-px h-2 bg-zinc-300 dark:bg-zinc-700" />
              <span>{aiUsage.output} out</span>
              {aiUsage.thoughts > 0 && (
                <>
                  <span className="w-px h-2 bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-amber-500 font-bold">{aiUsage.thoughts} thk</span>
                </>
              )}
            </div>
          )}
          {/* Same reason as the generate button below: quickEditExplanation
              writes to GeneratedQuestion / PYQ / MockQuestion. DPP sheets are
              edited in /admin/dpp, which owns their review state. */}
          {isAdmin && !question._isDpp && (
            <button
              onClick={onToggleEdit}
              className="px-2 py-1 text-[10px] font-bold rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              {isEditingExplanation ? "Cancel Edit" : "Edit Explanation"}
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "16px 16px", fontSize: "clamp(13px, 3.5vw, 15px)", lineHeight: 1.75, color: BE.textDim, fontFamily: BE.serif, overflowWrap: "break-word", wordBreak: "break-word" }}>
          {isGeneratingExplanation ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 animate-in fade-in duration-500">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-widest animate-pulse">AI is generating logic...</span>
            </div>
          ) : isEditingExplanation ? (
            <div className="flex flex-col gap-3 animate-in fade-in">
              <textarea
                value={editedExplanation}
                onChange={(e) => onEditChange(e.target.value)}
                className="w-full p-4 rounded-xl text-sm bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 outline-none font-mono"
                rows={6}
              />
              {editedExplanation && (
                <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm">
                  <span className="text-[10px] uppercase font-bold text-amber-500 mb-2 block">Live Preview</span>
                  <MathRenderer content={editedExplanation} />
                </div>
              )}
              <button
                onClick={onSaveExplanation}
                disabled={isSavingExplanation}
                className="self-end px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-all"
              >
                {isSavingExplanation ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <>
              {!question.explanation && !generatedExplanation ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <p className="text-xs text-gray-500 font-medium">No explanation is available for this question yet.</p>
                  {/* The generator resolves the question id against
                      GeneratedQuestion / PYQ / MockQuestion; a DPP row is in
                      none of them, so the button would always fail. DPP
                      explanations are authored in /admin/dpp. */}
                  {!question._isDpp && (
                    <button
                      onClick={onGenerateExplanation}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                      ✨ Generate AI Logic
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <MathRenderer content={(language === "hi" && question.explanation_hindi) ? question.explanation_hindi : (generatedExplanation || question.explanation || "No explanation available.")} />
                  {question.images?.filter((img: any) => img.type === "explanation").map((img: any, idx: number) => (
                    <div key={idx} className="mt-4 flex justify-center rounded-xl p-3 border" style={{ background: BE.surface, borderColor: BE.line, maxHeight: 320, minHeight: 160 }}>
                      <img src={getCloudinaryUrl(img.url || img.filename) || img.base64} alt="Explanation logic" className="max-w-full rounded-lg object-contain" style={{ maxHeight: 294, width: "auto" }} />
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
