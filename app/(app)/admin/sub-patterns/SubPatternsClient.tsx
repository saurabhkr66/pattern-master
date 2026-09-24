"use client";

import { useState, useCallback, useEffect } from "react";
import {
  listSubPatternChapters,
  getChapterPiles,
  updateSubPattern,
  createSubPattern,
  mergeSubPatterns,
  moveQuestion,
  deleteSubPattern,
  setChapterReviewed,
  type SubPatternChapter,
  type ChapterPiles,
  type Pile,
  type PileQuestion,
} from "@/app/actions/subPatterns";
import MathRenderer from "@/components/ui/MathRenderer";
import { getImageUrl } from "@/lib/imageUtils";

const card = "rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900";
const input =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-gray-900 dark:text-white";
const btn = "px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50";

export default function SubPatternsClient({ initialChapters }: { initialChapters: SubPatternChapter[] }) {
  const [chapters, setChapters] = useState(initialChapters);
  const [selected, setSelected] = useState<string>(initialChapters[0]?.id ?? "");
  const [data, setData] = useState<ChapterPiles | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (patternId: string) => {
    if (!patternId) return;
    setBusy(true);
    try {
      const [piles, list] = await Promise.all([getChapterPiles(patternId), listSubPatternChapters()]);
      setData(piles);
      setChapters(list);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    reload(selected);
  }, [selected, reload]);

  // Every mutation: run, surface errors, then re-read the chapter.
  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      await reload(selected);
    }
  };

  if (chapters.length === 0) {
    return (
      <div className={`${card} p-6 text-sm text-gray-600 dark:text-gray-400`}>
        No chapters sorted yet. Run{" "}
        <code className="font-mono">PATTERN_ID=… npx tsx --env-file=.env scripts/build-subpatterns.ts</code> first.
      </div>
    );
  }

  const current = chapters.find((c) => c.id === selected);
  const total = data ? data.piles.reduce((s, p) => s + p.questions.length, 0) + data.unassigned.length : 0;

  return (
    <div className="space-y-6">
      <div className={`${card} p-4 flex flex-wrap items-center gap-3`}>
        <select className={`${input} md:w-auto flex-1`} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.reviewed ? "✅" : "🟡"} {c.exam_type} · {c.subject} · {c.topic_name} — {c.types} types, {c.pyqs} PYQs
              {c.unassigned ? `, ${c.unassigned} unassigned` : ""}
            </option>
          ))}
        </select>
        {current && (
          <button
            className={`${btn} ${current.reviewed ? "bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300" : "bg-green-600 text-white"}`}
            disabled={busy}
            onClick={() => act(() => setChapterReviewed(current.id, !current.reviewed))}
          >
            {current.reviewed ? "Unpublish chapter" : "Mark chapter reviewed (publish)"}
          </button>
        )}
      </div>

      {error && <div className="rounded-xl p-3 text-sm bg-red-500/10 text-red-500">{error}</div>}

      {data && (
        <>
          <p className="text-sm text-gray-500">
            {total} PYQs in {data.piles.length} types. Types are shown to students largest-first; only reviewed chapters are public.
          </p>

          {data.piles.map((pile, i) => (
            // Keyed on the saved text so the form's local edits reset after a save.
            <PileCard key={`${pile.id}:${pile.name}:${pile.method}:${pile.trick}`} pile={pile} rank={i + 1} total={total} piles={data.piles} busy={busy} act={act} />
          ))}

          {data.unassigned.length > 0 && (
            <div className={`${card} p-4`}>
              <h3 className="font-black text-gray-900 dark:text-white mb-3">Unassigned ({data.unassigned.length})</h3>
              <QuestionRows questions={data.unassigned} piles={data.piles} currentId={null} busy={busy} act={act} />
            </div>
          )}

          <NewTypeForm patternId={data.pattern.id} busy={busy} act={act} />
        </>
      )}
    </div>
  );
}

type Act = (fn: () => Promise<unknown>) => Promise<void>;

function PileCard({ pile, rank, total, piles, busy, act }: { pile: Pile; rank: number; total: number; piles: Pile[]; busy: boolean; act: Act }) {
  const [name, setName] = useState(pile.name);
  const [method, setMethod] = useState(pile.method);
  const [trick, setTrick] = useState(pile.trick ?? "");
  const [open, setOpen] = useState(false);
  const [mergeInto, setMergeInto] = useState("");

  const dirty = name !== pile.name || method !== pile.method || trick !== (pile.trick ?? "");
  const years = [...new Set(pile.questions.map((q) => q.year))].sort((a, b) => a - b);
  const share = total ? Math.round((pile.questions.length / total) * 100) : 0;

  return (
    <div className={`${card} p-4 space-y-3`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-black text-gray-400">#{rank}</span>
        <span className="text-lg font-black text-orange-500">{pile.questions.length}×</span>
        <span className="text-xs text-gray-500">{share}% · {years.join(", ")}</span>
        {share > 25 && <span className="text-xs font-bold text-amber-500">too broad?</span>}
        {pile.questions.length <= 1 && <span className="text-xs font-bold text-amber-500">tiny — merge?</span>}
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input className={input} value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Method (one line)" />
        <input className={input} value={trick} onChange={(e) => setTrick(e.target.value)} placeholder="Trick / formula (optional)" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`${btn} bg-orange-500 text-white`}
          disabled={busy || !dirty}
          onClick={() => act(() => updateSubPattern(pile.id, { name, method, trick: trick || null }))}
        >
          Save
        </button>
        <button className={`${btn} bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300`} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Show"} {pile.questions.length} questions
        </button>
        <select className={`${input} !w-auto`} value={mergeInto} onChange={(e) => setMergeInto(e.target.value)}>
          <option value="">Merge into…</option>
          {piles.filter((p) => p.id !== pile.id).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          className={`${btn} bg-blue-600 text-white`}
          disabled={busy || !mergeInto}
          onClick={() => act(() => mergeSubPatterns(pile.id, mergeInto))}
        >
          Merge
        </button>
        <button
          className={`${btn} bg-red-500/10 text-red-500 ml-auto`}
          disabled={busy}
          onClick={() => {
            if (confirm(`Delete "${pile.name}"? Its ${pile.questions.length} questions become unassigned.`)) {
              act(() => deleteSubPattern(pile.id));
            }
          }}
        >
          Delete
        </button>
      </div>

      {open && <QuestionRows questions={pile.questions} piles={piles} currentId={pile.id} busy={busy} act={act} />}
    </div>
  );
}

function QuestionRows({ questions, piles, currentId, busy, act }: { questions: PileQuestion[]; piles: Pile[]; currentId: string | null; busy: boolean; act: Act }) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-zinc-800">
      {questions.map((q) => {
        const imgs = (q.images ?? []).filter((im) => im?.filename && im.type !== "explanation");
        return (
          <div key={q.id} className="py-3 flex gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-[11px] font-bold text-orange-400">{q.year}</div>
              <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-4">
                <MathRenderer content={q.text} />
              </div>
              {imgs.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {imgs.map((im) => (
                    <img key={im.index} src={getImageUrl(im.filename)} alt="" className="rounded border border-gray-200 dark:border-zinc-800 object-contain" style={{ maxHeight: 80, maxWidth: 140 }} />
                  ))}
                </div>
              )}
              {q.idea && <div className="text-xs italic text-gray-500">↳ {q.idea}</div>}
            </div>
            <select
              className={`${input} !w-44 shrink-0 self-start`}
              value={currentId ?? ""}
              disabled={busy}
              onChange={(e) => act(() => moveQuestion(q.id, e.target.value || null))}
            >
              <option value="">— unassigned —</option>
              {piles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function NewTypeForm({ patternId, busy, act }: { patternId: string; busy: boolean; act: Act }) {
  const [name, setName] = useState("");
  const [method, setMethod] = useState("");
  return (
    <div className={`${card} p-4 space-y-2`}>
      <h3 className="font-black text-gray-900 dark:text-white">Add a type</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input className={input} value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Method (one line)" />
      </div>
      <button
        className={`${btn} bg-orange-500 text-white`}
        disabled={busy || !name.trim() || !method.trim()}
        onClick={() =>
          act(async () => {
            await createSubPattern(patternId, name, method);
            setName("");
            setMethod("");
          })
        }
      >
        Add
      </button>
    </div>
  );
}
