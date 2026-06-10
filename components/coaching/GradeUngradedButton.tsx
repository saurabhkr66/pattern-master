"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

// Admin retry net for the async AI grading pipeline: runs the grading worker
// for every submitted attempt whose subjective answers are still ungraded or
// flagged. Sequential on purpose — each attempt already grades its questions
// in parallel; stacking attempts on top would slam the Gemini rate limit.
export default function GradeUngradedButton({ attemptIds }: { attemptIds: string[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setProgress(0);
    let failed = 0;
    for (let i = 0; i < attemptIds.length; i++) {
      try {
        const res = await fetch(`/api/coaching/attempts/${attemptIds[i]}/grade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
      setProgress(i + 1);
    }
    if (failed > 0) setError(`${failed} attempt(s) failed — try again`);
    setRunning(false);
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60"
      >
        {running ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Grading {progress}/{attemptIds.length}…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Grade ungraded ({attemptIds.length})
          </>
        )}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
