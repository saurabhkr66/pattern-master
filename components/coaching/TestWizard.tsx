"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

type BankQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  subject: string | null;
  max_marks: number;
};

type PyqQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  marks: number;
  year: number;
  topic: string | null;
};

type Selected = { id: string; source: "coaching" | "pyq"; marks: number; title: string };

const STEPS = ["Basics", "Questions", "Settings"];
const keyOf = (source: string, id: string) => `${source}:${id}`;

export default function TestWizard({ questions, isSuperAdmin = false }: { questions: BankQuestion[]; isSuperAdmin?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 — basics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMins, setDurationMins] = useState("60");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  // Step 2 — questions (mixed sources, keyed by source:id)
  const [selected, setSelected] = useState<Map<string, Selected>>(new Map());
  const [tab, setTab] = useState<"coaching" | "pyq" | "all">("coaching");

  // Step 3 — settings
  const [shuffle, setShuffle] = useState(true);
  const [negMarks, setNegMarks] = useState("0");
  const [usePool, setUsePool] = useState(false);
  const [poolSize, setPoolSize] = useState("");
  const [publishNow, setPublishNow] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(sel: Selected) {
    setSelected((prev) => {
      const next = new Map(prev);
      const k = keyOf(sel.source, sel.id);
      next.has(k) ? next.delete(k) : next.set(k, sel);
      return next;
    });
  }
  function addMany(sels: Selected[]) {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const s of sels) next.set(keyOf(s.source, s.id), s);
      return next;
    });
  }
  const isSelected = (source: string, id: string) => selected.has(keyOf(source, id));

  function next() {
    setError(null);
    if (step === 0) {
      if (!title.trim()) return setError("Title is required");
      if (!(Number(durationMins) > 0)) return setError("Duration must be greater than 0");
    }
    if (step === 1 && selected.size === 0) {
      return setError("Select at least one question");
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    setError(null);
    if (usePool) {
      const ps = Number(poolSize);
      if (!(ps >= 1 && ps <= selected.size)) {
        return setError(`Pool size must be between 1 and ${selected.size}`);
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/coaching/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          durationMins: Number(durationMins),
          startAt: startAt || null,
          endAt: endAt || null,
          shuffle,
          poolSize: usePool ? Number(poolSize) : null,
          negMarks: Math.abs(Number(negMarks) || 0),
          status: publishNow ? "active" : "draft",
          questions: [...selected.values()].map((s) => ({ id: s.id, source: s.source, marks: s.marks })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create test");
        return;
      }
      router.push("/coaching-admin/tests");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold text-white">New Test</h1>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i < step ? "bg-amber-600 text-white" : i === step ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={i === step ? "text-white" : "text-slate-400"}>{label}</span>
            {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-slate-700" />}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-300">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Description (optional)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`mt-1 ${inputCls}`} />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm text-slate-300">Duration (min)</span>
                <input type="number" min={1} value={durationMins} onChange={(e) => setDurationMins(e.target.value)} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Opens (optional)</span>
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Closes (optional)</span>
                <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={`mt-1 ${inputCls}`} />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            {/* Source tabs */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
                <button
                  onClick={() => setTab("coaching")}
                  className={`rounded-md px-3 py-1.5 text-sm ${tab === "coaching" ? "bg-amber-600 text-white" : "text-slate-300"}`}
                >
                  My question bank
                </button>
                <button
                  onClick={() => setTab("pyq")}
                  className={`rounded-md px-3 py-1.5 text-sm ${tab === "pyq" ? "bg-amber-600 text-white" : "text-slate-300"}`}
                >
                  PYQ bank
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => setTab("all")}
                    className={`rounded-md px-3 py-1.5 text-sm ${tab === "all" ? "bg-amber-600 text-white" : "text-slate-300"}`}
                  >
                    All coachings
                  </button>
                )}
              </div>
              <span className="text-sm text-slate-400">{selected.size} selected</span>
            </div>

            {tab === "coaching" ? (
              <CoachingPicker
                questions={questions}
                isSelected={(id) => isSelected("coaching", id)}
                onToggle={(q) =>
                  toggle({ id: q.id, source: "coaching", marks: q.max_marks, title: q.question_text })
                }
              />
            ) : tab === "pyq" ? (
              <PyqPicker
                isSelected={(id) => isSelected("pyq", id)}
                onToggle={(q) => toggle({ id: q.id, source: "pyq", marks: q.marks, title: q.question_text })}
                onAddAll={(qs) =>
                  addMany(qs.map((q) => ({ id: q.id, source: "pyq", marks: q.marks, title: q.question_text })))
                }
              />
            ) : (
              <AllCoachingsPicker
                isSelected={(id) => isSelected("coaching", id)}
                onToggle={(q) =>
                  toggle({ id: q.id, source: "coaching", marks: q.max_marks, title: q.question_text })
                }
              />
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Shuffle questions &amp; options per student</span>
              <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="h-4 w-4 accent-amber-500" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Negative marking per wrong MCQ</span>
              <input type="number" step="any" min={0} value={negMarks} onChange={(e) => setNegMarks(e.target.value)} className={`mt-1 ${inputCls} max-w-[160px]`} />
            </label>
            <div className="rounded-lg border border-slate-800 p-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Question pool — each student gets a random subset</span>
                <input type="checkbox" checked={usePool} onChange={(e) => setUsePool(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              </label>
              {usePool && (
                <label className="mt-3 block">
                  <span className="text-sm text-slate-300">Questions per student (of {selected.size} selected)</span>
                  <input type="number" min={1} max={selected.size} value={poolSize} onChange={(e) => setPoolSize(e.target.value)} className={`mt-1 ${inputCls} max-w-[160px]`} />
                </label>
              )}
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Publish immediately</span>
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="h-4 w-4 accent-amber-500" />
            </label>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500">
              Next
            </button>
          ) : (
            <button onClick={submit} disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50">
              {saving ? "Creating…" : publishNow ? "Create & Publish" : "Create Draft"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CoachingPicker({
  questions,
  isSelected,
  onToggle,
}: {
  questions: BankQuestion[];
  isSelected: (id: string) => boolean;
  onToggle: (q: BankQuestion) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return questions;
    return questions.filter((x) => x.question_text.toLowerCase().includes(s));
  }, [questions, search]);

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions" className={`${inputCls} mb-3 max-w-xs`} />
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No mcq/nat questions in your bank. Add some in Question Bank, or use the PYQ tab.
          </p>
        ) : (
          filtered.map((q) => (
            <QuestionRow
              key={q.id}
              checked={isSelected(q.id)}
              onToggle={() => onToggle(q)}
              text={q.question_text}
              meta={[q.question_type.toUpperCase(), q.subject, `${q.max_marks} marks`].filter(Boolean) as string[]}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PyqPicker({
  isSelected,
  onToggle,
  onAddAll,
}: {
  isSelected: (id: string) => boolean;
  onToggle: (q: PyqQuestion) => void;
  onAddAll: (qs: PyqQuestion[]) => void;
}) {
  const [filters, setFilters] = useState<{ exams: string[]; branches: string[]; subjects: string[]; topics: string[] }>({
    exams: [],
    branches: [],
    subjects: [],
    topics: [],
  });
  const [exam, setExam] = useState("");
  const [branch, setBranch] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [questions, setQuestions] = useState<PyqQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [addCount, setAddCount] = useState("10");

  // Load cascading filter options whenever a higher level changes.
  const loadFilters = useCallback(async () => {
    const params = new URLSearchParams();
    if (exam) params.set("exam", exam);
    if (branch) params.set("branch", branch);
    if (subject) params.set("subject", subject);
    const res = await fetch(`/api/coaching/pyq/filters?${params}`);
    if (res.ok) setFilters(await res.json());
  }, [exam, branch, subject]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // Load questions once a subject is chosen (+ debounce search).
  const loadQuestions = useCallback(async () => {
    if (!subject) {
      setQuestions([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ subject });
    if (exam) params.set("exam", exam);
    if (branch) params.set("branch", branch);
    if (topic) params.set("topic", topic);
    if (q) params.set("q", q);
    params.set("limit", "30");
    const res = await fetch(`/api/coaching/pyq?${params}`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [exam, branch, subject, topic, q]);

  useEffect(() => {
    const t = setTimeout(loadQuestions, 300);
    return () => clearTimeout(t);
  }, [loadQuestions]);

  // Add the first N (year-desc) of the current filter/search. N is capped by the
  // API at 200; the input is clamped to the available total.
  async function addFirstN() {
    if (!subject) return;
    const n = Math.min(Math.max(Number(addCount) || 0, 1), Math.min(total, 200));
    if (n < 1) return;
    setAddingAll(true);
    const params = new URLSearchParams({ subject, limit: String(n) });
    if (exam) params.set("exam", exam);
    if (branch) params.set("branch", branch);
    if (topic) params.set("topic", topic);
    if (q) params.set("q", q);
    const res = await fetch(`/api/coaching/pyq?${params}`);
    if (res.ok) {
      const data = await res.json();
      onAddAll(data.questions ?? []);
    }
    setAddingAll(false);
  }

  const sel = (set: (v: string) => void, resetBelow: (() => void)[]) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    set(e.target.value);
    resetBelow.forEach((r) => r());
  };

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={exam} onChange={sel(setExam, [() => setBranch(""), () => setSubject(""), () => setTopic("")])} className={inputCls}>
          <option value="">Exam</option>
          {filters.exams.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select value={branch} onChange={sel(setBranch, [() => setSubject(""), () => setTopic("")])} disabled={!exam} className={inputCls}>
          <option value="">Branch</option>
          {filters.branches.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select value={subject} onChange={sel(setSubject, [() => setTopic("")])} disabled={!branch} className={inputCls}>
          <option value="">Subject</option>
          {filters.subjects.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!subject} className={inputCls}>
          <option value="">All topics</option>
          {filters.topics.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search within selection" disabled={!subject} className={`${inputCls} flex-1`} />
        {subject && total > 0 && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={Math.min(total, 200)}
              value={addCount}
              onChange={(e) => setAddCount(e.target.value)}
              title="How many to add"
              className={`${inputCls} w-20`}
            />
            <button
              onClick={addFirstN}
              disabled={addingAll}
              className="whitespace-nowrap rounded-lg border border-amber-700 px-3 py-2 text-sm text-amber-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {addingAll ? "Adding…" : "Add"}
            </button>
          </div>
        )}
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto">
        {!subject ? (
          <p className="py-6 text-center text-sm text-slate-500">Choose an exam → branch → subject to browse PYQs.</p>
        ) : loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
        ) : questions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No PYQs match.</p>
        ) : (
          questions.map((qq) => (
            <QuestionRow
              key={qq.id}
              checked={isSelected(qq.id)}
              onToggle={() => onToggle(qq)}
              text={qq.question_text}
              meta={[qq.question_type.toUpperCase(), qq.topic, qq.year ? `${qq.year}` : null, `${qq.marks} marks`].filter(Boolean) as string[]}
            />
          ))
        )}
      </div>
      {subject && total > questions.length && (
        <p className="mt-2 text-xs text-slate-500">
          Showing {questions.length} of {total}. Narrow by topic/search, or use “Add all”.
        </p>
      )}
    </div>
  );
}

function AllCoachingsPicker({
  isSelected,
  onToggle,
}: {
  isSelected: (id: string) => boolean;
  onToggle: (q: BankQuestion) => void;
}) {
  const [questions, setQuestions] = useState<(BankQuestion & { coachingName: string | null })[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [coachingId, setCoachingId] = useState("");
  const [coachings, setCoachings] = useState<{ id: string; name: string }[]>([]);
  const firstLoad = useRef(true);

  // Load coaching list once for the filter dropdown.
  useEffect(() => {
    fetch("/api/admin/questions?")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.questions) return;
        const seen = new Map<string, string>();
        for (const qq of d.questions) {
          if (qq.coaching) seen.set(qq.coaching.id, qq.coaching.name);
        }
        setCoachings([...seen.entries()].map(([id, name]) => ({ id, name })));
        setQuestions(
          d.questions.map((qq: any) => ({
            id: qq.id,
            question_text: qq.question_text,
            question_type: qq.question_type,
            subject: qq.subject,
            max_marks: qq.max_marks,
            coachingName: qq.coaching?.name ?? null,
          }))
        );
      });
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (subject) params.set("subject", subject);
    if (type) params.set("type", type);
    if (coachingId === "__orphaned__") params.set("orphaned", "1");
    else if (coachingId) params.set("coachingId", coachingId);
    const res = await fetch(`/api/admin/questions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(
        (data.questions ?? []).map((qq: any) => ({
          id: qq.id,
          question_text: qq.question_text,
          question_type: qq.question_type,
          subject: qq.subject,
          max_marks: qq.max_marks,
          coachingName: qq.coaching?.name ?? null,
        }))
      );
    }
    setLoading(false);
  }, [q, subject, type, coachingId]);

  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    const t = setTimeout(refetch, 300);
    return () => clearTimeout(t);
  }, [q, subject, type, coachingId, refetch]);

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className={`${inputCls} col-span-2 sm:col-span-2`}
        />
        <select value={coachingId} onChange={(e) => setCoachingId(e.target.value)} className={inputCls}>
          <option value="">All coachings</option>
          {coachings.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
          <option value="__orphaned__">Deleted coachings</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
          <option value="">All types</option>
          <option value="mcq">MCQ</option>
          <option value="nat">Numerical</option>
        </select>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
        ) : questions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No questions found.</p>
        ) : (
          questions
            .filter((qq) => qq.question_type === "mcq" || qq.question_type === "nat")
            .map((qq) => (
              <QuestionRow
                key={qq.id}
                checked={isSelected(qq.id)}
                onToggle={() => onToggle(qq)}
                text={qq.question_text}
                meta={[
                  qq.question_type.toUpperCase(),
                  qq.coachingName ?? "Deleted coaching",
                  qq.subject,
                  `${qq.max_marks} marks`,
                ].filter(Boolean) as string[]}
              />
            ))
        )}
      </div>
    </div>
  );
}

function QuestionRow({
  checked,
  onToggle,
  text,
  meta,
}: {
  checked: boolean;
  onToggle: () => void;
  text: string;
  meta: string[];
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 hover:border-slate-700">
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-4 w-4 accent-amber-500" />
      <span className="flex-1">
        <span className="line-clamp-2 text-sm text-slate-200">{text}</span>
        <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
          {meta.map((m, i) => (
            <span key={i}>{i > 0 ? `· ${m}` : m}</span>
          ))}
        </span>
      </span>
    </label>
  );
}
