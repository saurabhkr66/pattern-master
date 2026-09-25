"use client";

import { useState, useEffect, useRef } from "react";
import {
  listSortExams,
  listSortableChapters,
  startSortChapter,
  getSortProgress,
  getGeminiBudget,
  type SortableChapter,
  type SortProgress,
} from "@/app/actions/subPatterns";
import type { DailyUsage } from "@/lib/geminiPacing";
import { estimateSortCalls } from "@/lib/subPatternEstimate";

const card = "rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900";
const input =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-gray-900 dark:text-white";

const STEPS = [
  { key: "notes", label: "Writing a solving note for each question" },
  { key: "discover", label: "Finding the question types" },
  { key: "assign", label: "Putting each question into a type" },
  { key: "cleanup", label: "Cleaning up (splitting big piles, placing leftovers)" },
  { key: "write", label: "Saving" },
] as const;

const POLL_MS = 3000;

// Pick exam → chapter → "Sort with AI". The run happens server-side (after());
// this polls its progress and hands the chapter to the review UI when done.
export default function SortPanel({ onSorted }: { onSorted: (patternId: string) => void }) {
  const [exams, setExams] = useState<string[]>([]);
  const [exam, setExam] = useState("");
  const [chapters, setChapters] = useState<SortableChapter[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [redo, setRedo] = useState(false);
  const [progress, setProgress] = useState<SortProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [budget, setBudget] = useState<DailyUsage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getGeminiBudget().then(setBudget);
    listSortExams().then((list) => {
      setExams(list);
      setExam(list.includes("JEE_MAIN") ? "JEE_MAIN" : list[0] ?? "");
    });
  }, []);

  useEffect(() => {
    if (!exam) return;
    listSortableChapters(exam).then((list) => {
      setChapters(list);
      setChapterId(list.find((c) => c.types === 0)?.id ?? list[0]?.id ?? "");
    });
  }, [exam]);

  // Poll the selected chapter's job; keeps polling only while it's running.
  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    const tick = async () => {
      const [p, b] = await Promise.all([getSortProgress(chapterId), getGeminiBudget()]);
      if (cancelled) return;
      setProgress(p);
      setBudget(b);
      if (p.active) timer.current = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [chapterId]);

  const chapter = chapters.find((c) => c.id === chapterId);
  const job = progress?.job ?? null;
  const running = !!progress?.active;

  const start = async () => {
    if (!chapterId) return;
    setError(null);
    setStarting(true);
    try {
      await startSortChapter(chapterId, redo);
      const poll = async () => {
        const [p, b] = await Promise.all([getSortProgress(chapterId), getGeminiBudget()]);
        setProgress(p);
        setBudget(b);
        if (p.active) {
          timer.current = setTimeout(poll, POLL_MS);
          return;
        }
        // Finished: refresh chapter statuses and open the result for review.
        setChapters(await listSortableChapters(exam));
        if (p.job?.state === "done") onSorted(chapterId);
      };
      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  // Free-tier budget for the selected chapter.
  const needed = chapter ? estimateSortCalls(chapter.pyqs, redo || chapter.types === 0 ? chapter.pendingNotes : 0) : 0;
  const left = budget ? Math.max(0, budget.limit - budget.used) : Infinity;
  const tooBig = !!budget && needed > left;
  const minutes = budget ? Math.max(1, Math.ceil(needed / budget.rpm)) : null;

  const stepIndex = job?.step ? STEPS.findIndex((s) => s.key === job.step) : -1;
  const notesPct = progress?.total ? Math.round((progress.notesDone / progress.total) * 100) : 0;

  return (
    <div className={`${card} p-4 space-y-3`}>
      <h3 className="font-black text-gray-900 dark:text-white">Sort a chapter with AI</h3>

      <div className="grid gap-2 md:grid-cols-[180px_1fr]">
        <select className={input} value={exam} onChange={(e) => setExam(e.target.value)} disabled={running}>
          {exams.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
        <select className={input} value={chapterId} onChange={(e) => { setChapterId(e.target.value); setRedo(false); }} disabled={running}>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.reviewed ? "✅ published" : c.types ? "🟡 sorted" : "⚪ not sorted"} · {c.subject} · {c.topic_name}
              {c.branch && c.branch !== "common" ? ` (${c.branch})` : ""} — {c.pyqs} PYQs
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="px-4 py-2 rounded-lg text-sm font-bold bg-orange-500 text-white disabled:opacity-50"
          disabled={!chapter || running || starting || chapter.reviewed || (chapter.types > 0 && !redo) || tooBig}
          onClick={start}
        >
          {running ? "Sorting…" : "✨ Sort with AI"}
        </button>
        {chapter && chapter.types > 0 && !chapter.reviewed && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={redo} onChange={(e) => setRedo(e.target.checked)} disabled={running} />
            Redo (throw away the current unreviewed piles)
          </label>
        )}
        {chapter?.reviewed && (
          <span className="text-sm text-gray-500">Already published — edit its types below.</span>
        )}
        {chapter && chapter.types > 0 && !chapter.reviewed && !redo && (
          <button className="text-sm font-bold text-orange-500 hover:underline" onClick={() => onSorted(chapter.id)}>
            Review it ↓
          </button>
        )}
      </div>

      {budget && (
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <span>
              {`Gemini free tier: ${budget.used} / ${budget.limit} requests used today · ${budget.rpm}/min · resets in ~${Math.ceil(budget.resetsInMs / 3600_000)}h`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full ${budget.used / budget.limit > 0.85 ? "bg-red-500" : "bg-green-500"}`}
              style={{ width: `${Math.min(100, (budget.used / budget.limit) * 100)}%` }}
            />
          </div>
          {chapter && !chapter.reviewed && (
            <p className={tooBig ? "text-red-500 font-bold" : ""}>
              {tooBig
                ? `This chapter needs ~${needed} requests but only ${left} are left today — try after the reset.`
                : `This chapter: ~${needed} requests, about ${minutes} min at the free-tier pace.`}
            </p>
          )}
        </div>
      )}

      {running && (
        <div className="space-y-2 pt-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-center">{i < stepIndex ? "✅" : i === stepIndex ? "⏳" : "·"}</span>
              <span className={i === stepIndex ? "font-bold text-gray-900 dark:text-white" : "text-gray-500"}>
                {s.label}
                {s.key === "notes" && i === stepIndex && progress ? ` — ${progress.notesDone}/${progress.total}` : ""}
              </span>
            </div>
          ))}
          {job?.step === "notes" && (
            <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-orange-500 transition-all" style={{ width: `${notesPct}%` }} />
            </div>
          )}
          <p className="text-xs text-gray-500">
            {`Paced to ${budget?.rpm ?? 12} requests/min for the free tier, so it's slow on purpose. You can leave this page; it keeps running.`}
          </p>
        </div>
      )}

      {!running && job && job.state !== "running" && job.message && (
        <div
          className={`rounded-xl p-3 text-sm ${
            job.state === "done" ? "bg-green-500/10 text-green-600" : job.state === "skipped" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500"
          }`}
        >
          {job.message}
        </div>
      )}
      {error && <div className="rounded-xl p-3 text-sm bg-red-500/10 text-red-500">{error}</div>}
    </div>
  );
}
