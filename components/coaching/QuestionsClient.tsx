"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Trash2, Pencil, X } from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

type QType = "mcq" | "nat" | "subjective";
type Option = { label: string; text: string };

type QuestionRow = {
  id: string;
  question_text: string;
  question_type: string;
  subject: string | null;
  topic: string | null;
  difficulty: string | null;
  max_marks: number;
  correct_answer: string;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  nat: "Numerical",
  subjective: "Subjective",
};

export default function QuestionsClient({
  initialQuestions,
  subjects,
}: {
  initialQuestions: QuestionRow[];
  subjects: string[];
}) {
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const firstLoad = useRef(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (subject) params.set("subject", subject);
    if (type) params.set("type", type);
    const res = await fetch(`/api/coaching/questions?${params}`);
    const data = await res.json();
    if (res.ok) setQuestions(data.questions);
    setLoading(false);
  }, [q, subject, type]);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    const t = setTimeout(refetch, 300);
    return () => clearTimeout(t);
  }, [q, subject, type, refetch]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Question Bank</h1>
        <button
          onClick={() => {
            setEditId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          <Plus className="h-4 w-4" /> Add Question
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search question text"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-500"
          />
        </div>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
          <option value="">All types</option>
          <option value="mcq">MCQ</option>
          <option value="nat">Numerical</option>
          <option value="subjective">Subjective</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Question</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Marks</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No questions yet.
                </td>
              </tr>
            ) : (
              questions.map((qq) => (
                <tr key={qq.id} className="text-slate-200">
                  <td className="max-w-md px-4 py-3">
                    <span className="line-clamp-2 text-slate-300">{qq.question_text}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {TYPE_LABELS[qq.question_type] ?? qq.question_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{qq.subject ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{qq.max_marks}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditId(qq.id);
                          setShowForm(true);
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this question?")) return;
                          const res = await fetch(`/api/coaching/questions/${qq.id}`, {
                            method: "DELETE",
                          });
                          if (res.ok) refetch();
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <QuestionFormModal
          editId={editId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

const DEFAULT_OPTIONS: Option[] = [
  { label: "A", text: "" },
  { label: "B", text: "" },
  { label: "C", text: "" },
  { label: "D", text: "" },
];

function QuestionFormModal({
  editId,
  onClose,
  onSaved,
}: {
  editId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<QType>("mcq");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<Option[]>(DEFAULT_OPTIONS);
  const [correct, setCorrect] = useState("A");
  const [natTolerance, setNatTolerance] = useState("0");
  const [solution, setSolution] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [maxMarks, setMaxMarks] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  // Load existing question when editing.
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const res = await fetch(`/api/coaching/questions/${editId}`);
      const data = await res.json();
      if (res.ok && data.question) {
        const x = data.question;
        setType((x.question_type as QType) ?? "mcq");
        setQuestionText(x.question_text ?? "");
        setOptions(
          Array.isArray(x.options) && x.options.length ? x.options : DEFAULT_OPTIONS
        );
        setCorrect(x.correct_answer ?? "A");
        setNatTolerance(String(x.nat_tolerance ?? 0));
        setSolution(x.solution ?? "");
        setSubject(x.subject ?? "");
        setTopic(x.topic ?? "");
        setDifficulty(x.difficulty ?? "");
        setMaxMarks(String(x.max_marks ?? 1));
      }
      setLoadingEdit(false);
    })();
  }, [editId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: any = {
        question_type: type,
        question_text: questionText,
        solution,
        subject,
        topic,
        difficulty,
        max_marks: Number(maxMarks),
      };
      if (type === "mcq") {
        body.options = options.filter((o) => o.text.trim());
        body.correct_answer = correct;
      } else if (type === "nat") {
        body.correct_answer = correct; // reused field holds the numeric answer
        body.nat_tolerance = Number(natTolerance);
      }

      const res = await fetch(
        editId ? `/api/coaching/questions/${editId}` : "/api/coaching/questions",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  // For NAT the "correct" state doubles as the numeric answer field.
  const natAnswer = type === "nat" ? correct : "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {editId ? "Edit Question" : "Add Question"}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingEdit ? (
          <p className="py-8 text-center text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {/* Type + meta */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="col-span-2 sm:col-span-1">
                <span className="block text-sm text-slate-300">Type</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as QType)}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="mcq">MCQ</option>
                  <option value="nat">Numerical (NAT)</option>
                  <option value="subjective">Subjective</option>
                </select>
              </label>
              <label>
                <span className="block text-sm text-slate-300">Subject</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={`mt-1 ${inputCls}`} />
              </label>
              <label>
                <span className="block text-sm text-slate-300">Topic</span>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} className={`mt-1 ${inputCls}`} />
              </label>
              <label>
                <span className="block text-sm text-slate-300">Max marks</span>
                <input
                  type="number"
                  min={1}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  className={`mt-1 ${inputCls}`}
                />
              </label>
            </div>

            {/* Question text + live preview */}
            <PreviewField
              label="Question (LaTeX / markdown supported)"
              value={questionText}
              onChange={setQuestionText}
              rows={4}
            />

            {/* Type-specific answer fields */}
            {type === "mcq" && (
              <div className="space-y-2">
                <span className="block text-sm text-slate-300">Options (select the correct one)</span>
                {options.map((opt, i) => (
                  <div key={opt.label} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={correct === opt.label}
                      onChange={() => setCorrect(opt.label)}
                      className="h-4 w-4 accent-amber-500"
                    />
                    <span className="w-5 text-slate-400">{opt.label}</span>
                    <input
                      value={opt.text}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = { ...opt, text: e.target.value };
                        setOptions(next);
                      }}
                      placeholder={`Option ${opt.label}`}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            )}

            {type === "nat" && (
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="block text-sm text-slate-300">Correct answer (number)</span>
                  <input
                    type="number"
                    step="any"
                    value={natAnswer}
                    onChange={(e) => setCorrect(e.target.value)}
                    className={`mt-1 ${inputCls}`}
                  />
                </label>
                <label>
                  <span className="block text-sm text-slate-300">Tolerance (±)</span>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={natTolerance}
                    onChange={(e) => setNatTolerance(e.target.value)}
                    className={`mt-1 ${inputCls}`}
                  />
                </label>
              </div>
            )}

            {type === "subjective" && (
              <p className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
                Subjective questions are graded manually after submission. The solution
                below is shown to graders as the model answer.
              </p>
            )}

            {/* Solution / model answer + preview */}
            <PreviewField
              label={type === "subjective" ? "Model answer (for graders)" : "Solution (optional)"}
              value={solution}
              onChange={setSolution}
              rows={3}
            />

            <label className="block">
              <span className="text-sm text-slate-300">Difficulty (optional)</span>
              <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="easy / medium / hard" />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : editId ? "Save changes" : "Add question"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Textarea with a live KaTeX/markdown preview underneath.
function PreviewField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div>
      <span className="block text-sm text-slate-300">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`mt-1 ${inputCls} font-mono`}
      />
      {value.trim() && (
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Preview</p>
          <MathRenderer content={value} className="text-slate-100" />
        </div>
      )}
    </div>
  );
}
