"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Check, Loader2, Trash2 } from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

type Option = { label: string; text: string };

// Full editable question, as returned by /api/admin/questions?full=1.
type ReviewQ = {
  id: string;
  coaching_id: string | null;
  coaching: { id: string; name: string } | null;
  question_type: string;
  question_text: string;
  max_marks: number;
  options: Option[] | null;
  correct_answer: string | null;
  solution: string | null;
  nat_tolerance: number | null;
  grade: string | null;
  subject: string | null;
  set_name: string | null;
  topic: string | null;
  difficulty: string | null;
  question_text_hindi: string | null;
  options_hindi: Option[] | null;
  solution_hindi: string | null;
};

type Status = "clean" | "edited" | "saving" | "saved" | "error";

const asOptions = (raw: unknown): Option[] =>
  Array.isArray(raw)
    ? (raw as { label?: unknown; text?: unknown }[]).map((o) => ({
        label: String(o?.label ?? ""),
        text: String(o?.text ?? ""),
      }))
    : [];

/** Types that carry answer choices — mcq picks one label, msq picks several. */
const hasOptions = (t: string) => t === "mcq" || t === "msq";

/** Split a stored answer into labels ("A;C" → ["A","C"]); mcq yields one. */
const answerLabels = (raw: string | null | undefined): string[] =>
  (raw ?? "")
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Add/remove one label from an msq answer, keeping the stored string canonical:
 * ordered by option order and ";"-joined, matching what the validator writes and
 * what AssignmentRunner submits.
 */
function toggleLabel(current: string | null | undefined, label: string, opts: Option[]): string {
  const picked = new Set(answerLabels(current));
  if (picked.has(label)) picked.delete(label);
  else picked.add(label);
  return opts
    .map((o) => o.label)
    .filter((l) => picked.has(l))
    .join(";");
}

export default function AdminQuestionReview() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  // These come from the list page's filters and stay fixed for the session; the
  // free-text search is the only live filter here.
  const coachingId = sp.get("coachingId") ?? "";
  const grade = sp.get("grade") ?? "";
  const subject = sp.get("subject") ?? "";
  const type = sp.get("type") ?? "";
  const setName = sp.get("set") ?? "";
  const orphaned = sp.get("orphaned") === "1";

  const [items, setItems] = useState<ReviewQ[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const loadedKey = useRef("__init__");

  const coachingName = items.find((x) => x.coaching)?.coaching?.name ?? null;

  const refetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ full: "1" });
    if (q) params.set("q", q);
    if (grade) params.set("grade", grade);
    if (subject) params.set("subject", subject);
    if (type) params.set("type", type);
    if (setName) params.set("set", setName);
    if (orphaned) params.set("orphaned", "1");
    else if (coachingId) params.set("coachingId", coachingId);
    const res = await fetch(`/api/admin/questions?${params}`);
    const data = await res.json();
    if (res.ok) {
      setItems(
        (data.questions ?? []).map((x: ReviewQ) => ({
          ...x,
          options: asOptions(x.options),
          options_hindi: asOptions(x.options_hindi),
        }))
      );
      setStatus({});
      setErrors({});
    }
    setLoading(false);
  }, [q, grade, subject, type, setName, coachingId, orphaned]);

  useEffect(() => {
    const key = `${q}|${grade}|${subject}|${type}|${setName}|${coachingId}|${orphaned}`;
    if (loadedKey.current === key) return;
    const t = setTimeout(() => {
      loadedKey.current = key;
      refetch();
    }, 300);
    return () => clearTimeout(t);
  }, [q, grade, subject, type, setName, coachingId, orphaned, refetch]);

  // Patch one field of a question and flag it dirty.
  const update = useCallback((id: string, patch: Partial<ReviewQ>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setStatus((s) => ({ ...s, [id]: "edited" }));
  }, []);

  async function save(item: ReviewQ) {
    setStatus((s) => ({ ...s, [item.id]: "saving" }));
    setErrors((e) => ({ ...e, [item.id]: "" }));

    const body: Record<string, unknown> = {
      question_type: item.question_type,
      question_text: item.question_text,
      solution: item.solution ?? "",
      grade: item.grade ?? "",
      subject: item.subject ?? "",
      set_name: item.set_name ?? "",
      topic: item.topic ?? "",
      difficulty: item.difficulty ?? "",
      max_marks: item.max_marks > 0 ? item.max_marks : 1,
      question_text_hindi: item.question_text_hindi ?? "",
      solution_hindi: item.solution_hindi ?? "",
    };
    if (hasOptions(item.question_type)) {
      const kept = (item.options ?? []).filter((o) => o.text.trim());
      body.options = kept;
      body.correct_answer = item.correct_answer ?? "";
      const hiMap = new Map((item.options_hindi ?? []).map((o) => [o.label, o.text]));
      body.options_hindi = kept.map((o) => ({ label: o.label, text: hiMap.get(o.label) ?? "" }));
    } else if (item.question_type === "nat") {
      body.correct_answer = item.correct_answer ?? "";
      body.nat_tolerance = item.nat_tolerance ?? 0;
    }

    try {
      const res = await fetch(`/api/admin/questions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus((s) => ({ ...s, [item.id]: "error" }));
        setErrors((e) => ({ ...e, [item.id]: data.error ?? "Failed to save" }));
        return;
      }
      setStatus((s) => ({ ...s, [item.id]: "saved" }));
    } catch {
      setStatus((s) => ({ ...s, [item.id]: "error" }));
      setErrors((e) => ({ ...e, [item.id]: "Network error" }));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this question permanently?")) return;
    setStatus((s) => ({ ...s, [id]: "saving" }));
    const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== id));
    } else {
      setStatus((s) => ({ ...s, [id]: "error" }));
      setErrors((e) => ({ ...e, [id]: "Failed to delete" }));
    }
  }

  const editedCount = Object.values(status).filter((s) => s === "edited").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin/questions" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All questions
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-white">Review &amp; correct questions</h1>
      <p className="mt-1 text-sm text-slate-400">
        {orphaned ? "Deleted coachings" : coachingName ?? "All coachings"}
        {grade && <> · {grade}</>}
        {setName && <> · {setName}</>} · {items.length} shown
        {editedCount > 0 && <span className="text-amber-400"> · {editedCount} unsaved</span>}
        . Edit any field inline, then Save that card.
      </p>

      <div className="relative mt-5 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search question text…"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-500"
        />
      </div>

      {loading ? (
        <p className="mt-10 text-center text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-slate-500">No questions found.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <Card
              key={item.id}
              item={item}
              status={status[item.id] ?? "clean"}
              error={errors[item.id]}
              onChange={(patch) => update(item.id, patch)}
              onSave={() => save(item)}
              onDelete={() => remove(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({
  item,
  status,
  error,
  onChange,
  onSave,
  onDelete,
}: {
  item: ReviewQ;
  status: Status;
  error?: string;
  onChange: (patch: Partial<ReviewQ>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const opts = item.options ?? [];
  const isMulti = item.question_type === "msq";
  const picked = answerLabels(item.correct_answer);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      {/* Header row: type + placement + actions */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={item.question_type}
          onChange={(e) => onChange({ question_type: e.target.value })}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
        >
          <option value="mcq">MCQ</option>
          <option value="msq">MSQ</option>
          <option value="nat">NAT</option>
          <option value="subjective">Subjective</option>
        </select>
        <input
          value={item.grade ?? ""}
          onChange={(e) => onChange({ grade: e.target.value })}
          placeholder="Exam / Class"
          className="w-32 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
        />
        <input
          value={item.subject ?? ""}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Section"
          className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
        />
        <input
          value={item.set_name ?? ""}
          onChange={(e) => onChange({ set_name: e.target.value })}
          placeholder="Set"
          className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
        />
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input
            type="number"
            min={1}
            value={item.max_marks}
            onChange={(e) => onChange({ max_marks: Number(e.target.value) || 1 })}
            className="w-14 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-white"
            title="Max marks"
          />
          mk
        </label>
        {item.coaching && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{item.coaching.name}</span>
        )}
        <button
          onClick={onDelete}
          title="Delete question"
          className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Question text + live preview */}
      <textarea
        value={item.question_text}
        onChange={(e) => onChange({ question_text: e.target.value })}
        rows={2}
        className={`${inputCls} font-mono text-xs`}
      />
      {item.question_text.trim() && (
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5">
          <p className="mb-1 text-[10px] uppercase text-slate-500">Preview</p>
          <MathRenderer content={item.question_text} className="text-sm text-slate-200" />
        </div>
      )}

      {/* MCQ/MSQ options + correct answer picker (radio for one, checkbox for many) */}
      {hasOptions(item.question_type) && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
          <p className="text-[10px] uppercase text-slate-500">
            Options · select the correct {isMulti ? "ones (one or more)" : "one"}
          </p>
          {opts.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input
                type={isMulti ? "checkbox" : "radio"}
                name={`correct-${item.id}`}
                checked={isMulti ? picked.includes(opt.label) : item.correct_answer === opt.label}
                onChange={() =>
                  onChange({
                    correct_answer: isMulti
                      ? toggleLabel(item.correct_answer, opt.label, opts)
                      : opt.label,
                  })
                }
                className="h-3.5 w-3.5 accent-amber-500"
              />
              <span className="w-4 text-xs text-slate-400">{opt.label}</span>
              <input
                value={opt.text}
                onChange={(e) =>
                  onChange({ options: opts.map((o, k) => (k === oi ? { ...o, text: e.target.value } : o)) })
                }
                placeholder={`Option ${opt.label}`}
                className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
              />
            </div>
          ))}
        </div>
      )}

      {/* NAT numeric answer */}
      {item.question_type === "nat" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
          <span className="text-[10px] uppercase text-slate-500">Numeric answer</span>
          <input
            value={item.correct_answer ?? ""}
            onChange={(e) => onChange({ correct_answer: e.target.value })}
            placeholder="e.g. 42"
            className="w-28 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
          />
          <span className="text-[10px] uppercase text-slate-500">± tolerance</span>
          <input
            type="number"
            step="any"
            min={0}
            value={item.nat_tolerance ?? 0}
            onChange={(e) => onChange({ nat_tolerance: Number(e.target.value) })}
            className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
          />
        </div>
      )}

      {/* Solution / model answer */}
      <div className="mt-2 space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <p className="text-[10px] uppercase text-slate-500">
          {item.question_type === "subjective" ? "Model answer (AI grades against this)" : "Solution / explanation"}
        </p>
        <textarea
          value={item.solution ?? ""}
          onChange={(e) => onChange({ solution: e.target.value })}
          rows={2}
          placeholder="Worked solution…"
          className={`${inputCls} font-mono text-xs`}
        />
        {(item.solution ?? "").trim() && (
          <MathRenderer content={item.solution!} className="text-xs text-slate-300" />
        )}
      </div>

      {/* Footer: status + save */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={status === "saving"}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </button>
        {status === "saved" && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
        {status === "edited" && <span className="text-xs text-amber-400">Unsaved changes</span>}
        {status === "error" && <span className="text-xs text-red-400">{error ?? "Error"}</span>}
      </div>
    </div>
  );
}
