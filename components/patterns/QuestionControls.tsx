"use client";

import { BE } from "@/lib/theme";

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

interface QuestionControlsProps {
  difficulty: string;
  aiModel: "gemini" | "deepseek" | "gemma";
  isLoading: boolean;
  error: string | null;
  onDifficultyChange: (d: string) => void;
  onModelChange: (m: "gemini" | "deepseek" | "gemma") => void;
  onGenerate: () => void;
}

export default function QuestionControls({
  difficulty, aiModel, isLoading, error,
  onDifficultyChange, onModelChange, onGenerate,
}: QuestionControlsProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Difficulty</p>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {Object.entries(difficultyConfig).map(([lvl, cfg]) => (
            <button
              key={lvl}
              onClick={() => onDifficultyChange(lvl)}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                difficulty === lvl ? cfg.active : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">AI Engine</p>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {modelConfig.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => onModelChange(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                aiModel === id ? "bg-white text-amber-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-black py-3.5 px-6 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
  );
}
