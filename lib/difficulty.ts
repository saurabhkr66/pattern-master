// Display helpers for question difficulty. Client-safe (no deps) — the AI
// classifier itself lives in lib/pyqDifficulty.ts, which pulls in the Gemini SDK
// and must never be imported from a component.
//
// Two columns feed this: PYQ.difficulty ("EASY"|"MEDIUM"|"HARD", written by
// scripts/backfill-pyq-difficulty.ts) and GeneratedQuestion.difficulty_level
// ("Easy"|"Medium"|"Hard"). Both normalize to the same title-case label here so
// a single badge renders either kind.

export type DifficultyLabel = "Easy" | "Medium" | "Hard";

const LABELS: Record<string, DifficultyLabel> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/**
 * First recognizable difficulty among the given values, or null when none is
 * classified. Pass the candidates in priority order, e.g.
 * `normalizeDifficulty(q.difficulty_level, q.difficulty)`.
 *
 * Returns null rather than defaulting to "Medium" — an unclassified question
 * should show no badge instead of a made-up rating.
 */
export function normalizeDifficulty(...values: unknown[]): DifficultyLabel | null {
  for (const v of values) {
    if (typeof v !== "string") continue;
    const label = LABELS[v.trim().toUpperCase()];
    if (label) return label;
  }
  return null;
}

/** Hex/token colors for the three levels, keyed for the inline-style call sites. */
export const DIFFICULTY_COLORS: Record<DifficultyLabel, { fg: string; bg: string }> = {
  Easy: { fg: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  Medium: { fg: "#ff8f00", bg: "rgba(255, 143, 0, 0.1)" },
  Hard: { fg: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
};

/** Tailwind classes for the same three levels, for the SEO/topic pages. */
export const DIFFICULTY_CLASSES: Record<DifficultyLabel, string> = {
  Easy: "bg-emerald-500/10 text-emerald-400",
  Medium: "bg-yellow-500/10 text-yellow-400",
  Hard: "bg-red-500/10 text-red-400",
};
