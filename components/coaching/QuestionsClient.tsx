"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Search, Trash2, Pencil, X, ChevronRight, Folder, FolderOpen, Clock, Upload } from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";
import QuestionImportModal from "@/components/coaching/QuestionImportModal";
import { display, Btn, Card, Pill, PageHead } from "@/components/coaching/ui";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500";

type QType = "mcq" | "nat" | "subjective";
type Option = { label: string; text: string };

type QuestionRow = {
  id: string;
  question_text: string;
  question_type: string;
  grade: string | null;
  subject: string | null;
  topic: string | null;
  set_name: string | null;
  difficulty: string | null;
  max_marks: number;
  correct_answer: string;
  created_at: string;
};

// Folder tree (mirrors lib/coachingTaxonomy's GradeNode; plain JSON from the server):
// grade(exam/class) → subject(section) → set_name(set/mock).
type SetNode = { set: string | null; count: number };
type SubjectNode = { subject: string | null; sets: SetNode[]; count: number };
type GradeNode = { grade: string | null; subjects: SubjectNode[]; count: number };

// A selected leaf folder. null fields mean the Uncategorized bucket at that level.
type Leaf = { grade: string | null; subject: string | null; set: string | null };

const TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  nat: "Numerical",
  subjective: "Subjective",
};

const TYPE_TONE: Record<string, string> = {
  mcq: "bg-sky-500/15 text-sky-400",
  nat: "bg-amber-500/15 text-amber-400",
  subjective: "bg-violet-500/15 text-violet-400",
};

const PAGE_SIZE = 50;
const RECENT_DAYS = 7;

// "__null__" tells the list API to filter `IS NULL` (the Uncategorized bucket),
// as distinct from the param being absent. Mirrors NULL_SENTINEL in the route.
const NULL_PARAM = "__null__";
const param = (v: string | null) => (v === null ? NULL_PARAM : v);

const GRADE_LABEL = (g: string | null) => g ?? "Uncategorized";
const SUBJECT_LABEL = (s: string | null) => s ?? "No section";
const SET_LABEL = (t: string | null) => t ?? "No set";
const leafKey = (l: Leaf) => `${l.grade ?? ""}|${l.subject ?? ""}|${l.set ?? ""}`;

export default function QuestionsClient({
  initialQuestions,
  initialHasMore,
  taxonomy: initialTaxonomy,
  isSuperAdmin = false,
}: {
  initialQuestions: QuestionRow[];
  initialHasMore: boolean;
  taxonomy: GradeNode[];
  isSuperAdmin?: boolean;
}) {
  const [taxonomy, setTaxonomy] = useState<GradeNode[]>(initialTaxonomy);
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [recent, setRecent] = useState(false);
  const [leaf, setLeaf] = useState<Leaf | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Leaf | null>(null);

  // Flat list mode: text search, type filter, or the "recently added" view.
  // Otherwise we're in folder-browse mode.
  const flatMode = q.trim() !== "" || type !== "" || recent;

  // Filter signature the current list reflects. Robust against StrictMode double-mount.
  const loadedKey = useRef("browse|init");

  // Build the API query for the current view (flat vs a selected leaf).
  const viewParams = useCallback(
    (offset: number): URLSearchParams | null => {
      const p = new URLSearchParams();
      if (flatMode) {
        if (q.trim()) p.set("q", q.trim());
        if (type) p.set("type", type);
        if (recent) p.set("days", String(RECENT_DAYS));
      } else if (leaf) {
        p.set("grade", param(leaf.grade));
        p.set("subject", param(leaf.subject));
        p.set("set", param(leaf.set));
      } else {
        return null; // browse mode, no leaf open → nothing to fetch
      }
      p.set("limit", String(PAGE_SIZE));
      p.set("offset", String(offset));
      return p;
    },
    [flatMode, q, type, recent, leaf]
  );

  const fetchPage = useCallback(
    async (offset: number) => {
      const p = viewParams(offset);
      if (!p) {
        setQuestions([]);
        setHasMore(false);
        return;
      }
      const res = await fetch(`/api/coaching/questions?${p}`);
      const data = await res.json();
      if (res.ok) {
        setQuestions((prev) => (offset > 0 ? [...prev, ...data.questions] : data.questions));
        setHasMore(data.hasMore);
      }
    },
    [viewParams]
  );

  const refreshTaxonomy = useCallback(async () => {
    const res = await fetch("/api/coaching/questions/taxonomy");
    if (res.ok) {
      const data = await res.json();
      setTaxonomy(data.taxonomy);
    }
  }, []);

  // Reload current view from the top — used by filter/leaf changes and after add/edit/delete.
  const reload = useCallback(async () => {
    setLoading(true);
    await fetchPage(0);
    setLoading(false);
  }, [fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    await fetchPage(questions.length);
    setLoadingMore(false);
  }

  // Refetch whenever the active view changes (search text, type, recent, or open leaf).
  useEffect(() => {
    const key = flatMode
      ? `flat|${q}|${type}|${recent}`
      : `leaf|${leaf ? leafKey(leaf) : ""}`;
    if (loadedKey.current === key) return;
    const t = setTimeout(
      () => {
        loadedKey.current = key;
        reload();
      },
      q.trim() ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [flatMode, q, type, recent, leaf, reload]);

  // After a mutation, refresh both the folder counts and the open list.
  const afterMutation = useCallback(async () => {
    await Promise.all([refreshTaxonomy(), reload()]);
  }, [refreshTaxonomy, reload]);

  function openAdd(pre: Leaf | null) {
    setEditId(null);
    setPrefill(pre);
    setShowForm(true);
  }

  const showTable = flatMode || leaf !== null;

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <PageHead title="Question Bank" sub="Organize, manage and reuse questions efficiently.">
        {/* AI bulk import is super-admin-only for now. */}
        {isSuperAdmin && (
          <Btn kind="ghost" onClick={() => setShowImport(true)}>
            <Upload className="h-[18px] w-[18px]" /> Bulk import
          </Btn>
        )}
        <Btn onClick={() => openAdd(flatMode ? null : leaf)}>
          <Plus className="h-[18px] w-[18px]" /> Add Question
        </Btn>
      </PageHead>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search all questions…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-3 text-sm text-white outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white outline-none focus:border-amber-500"
        >
          <option value="">All types</option>
          <option value="mcq">MCQ</option>
          <option value="nat">Numerical</option>
          <option value="subjective">Subjective</option>
        </select>
        {/* "Recently added" view so questions you just added never get lost. */}
        <button
          onClick={() => setRecent((r) => !r)}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-3 text-sm font-semibold transition ${
            recent
              ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
              : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
          }`}
        >
          <Clock className="h-[18px] w-[18px]" /> Recently added
        </button>
      </div>

      {/* Browse mode: folder tree (Exam/Class → Section → Set). */}
      {!flatMode && (
        <FolderBrowser
          taxonomy={taxonomy}
          activeLeaf={leaf}
          onSelectLeaf={setLeaf}
          onAddInLeaf={openAdd}
        />
      )}

      {/* Leaf breadcrumb (browse mode, a set open). */}
      {!flatMode && leaf && (
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-400">
          <span className="font-medium text-slate-200">{GRADE_LABEL(leaf.grade)}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{SUBJECT_LABEL(leaf.subject)}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{SET_LABEL(leaf.set)}</span>
          <button onClick={() => setLeaf(null)} className="ml-2 text-xs text-amber-400 hover:underline">
            Clear
          </button>
          {/* One-click: build a test prefilled from this exam+set. */}
          {leaf.grade && leaf.set && (
            <a
              href={`/coaching-admin/tests/new?exam=${encodeURIComponent(leaf.grade)}&set=${encodeURIComponent(leaf.set)}`}
              className="ml-auto rounded-xl px-4 py-2 text-xs font-bold transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#fb923c 0%,#f59e0b 100%)", color: "#1a1205" }}
            >
              Create test from this set →
            </a>
          )}
        </div>
      )}

      {recent && (
        <p className="mt-5 text-sm text-slate-400">
          Questions added in the last {RECENT_DAYS} days (newest first).
        </p>
      )}

      {showTable && (
        <QuestionsTable
          questions={questions}
          loading={loading}
          onEdit={(id) => {
            setEditId(id);
            setPrefill(null);
            setShowForm(true);
          }}
          onReload={afterMutation}
        />
      )}

      {showTable && hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {showForm && (
        <QuestionFormModal
          editId={editId}
          prefill={prefill}
          taxonomy={taxonomy}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            afterMutation();
          }}
        />
      )}

      {showImport && (
        <QuestionImportModal
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            afterMutation();
          }}
        />
      )}
    </div>
  );
}

// ── Folder browser (Exam/Class → Section → Set) ───────────────────────────────
function FolderBrowser({
  taxonomy,
  activeLeaf,
  onSelectLeaf,
  onAddInLeaf,
}: {
  taxonomy: GradeNode[];
  activeLeaf: Leaf | null;
  onSelectLeaf: (l: Leaf) => void;
  onAddInLeaf: (l: Leaf) => void;
}) {
  if (taxonomy.length === 0) {
    return (
      <div className="mt-5 rounded-[18px] border border-white/[0.07] bg-white/[0.02] px-4 py-10 text-center text-slate-500">
        No questions yet. Click “Add Question” to create your first one.
      </div>
    );
  }
  return (
    <div className="mt-5 space-y-2">
      {taxonomy.map((g) => (
        <GradeFolder
          key={GRADE_LABEL(g.grade)}
          node={g}
          activeLeaf={activeLeaf}
          onSelectLeaf={onSelectLeaf}
          onAddInLeaf={onAddInLeaf}
        />
      ))}
    </div>
  );
}

function GradeFolder({
  node,
  activeLeaf,
  onSelectLeaf,
  onAddInLeaf,
}: {
  node: GradeNode;
  activeLeaf: Leaf | null;
  onSelectLeaf: (l: Leaf) => void;
  onAddInLeaf: (l: Leaf) => void;
}) {
  // Auto-open the grade that contains the active leaf.
  const [open, setOpen] = useState(activeLeaf?.grade === node.grade);
  return (
    <div className="overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.02]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition hover:bg-white/[0.03]"
      >
        <ChevronRight className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-90" : ""}`} />
        {open ? <FolderOpen className="h-[19px] w-[19px] text-amber-400" /> : <Folder className="h-[19px] w-[19px] text-amber-400" />}
        <span className="font-bold text-white">{GRADE_LABEL(node.grade)}</span>
        <span className="ml-auto rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-bold text-slate-400">{node.count}</span>
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-white/[0.06] px-3 py-2">
          {node.subjects.map((s) => (
            <SubjectFolder
              key={SUBJECT_LABEL(s.subject)}
              grade={node.grade}
              node={s}
              activeLeaf={activeLeaf}
              onSelectLeaf={onSelectLeaf}
              onAddInLeaf={onAddInLeaf}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectFolder({
  grade,
  node,
  activeLeaf,
  onSelectLeaf,
  onAddInLeaf,
}: {
  grade: string | null;
  node: SubjectNode;
  activeLeaf: Leaf | null;
  onSelectLeaf: (l: Leaf) => void;
  onAddInLeaf: (l: Leaf) => void;
}) {
  const [open, setOpen] = useState(activeLeaf?.grade === grade && activeLeaf?.subject === node.subject);
  return (
    <div className="rounded-xl border border-white/[0.05]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
      >
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="text-sm font-semibold text-slate-200">{SUBJECT_LABEL(node.subject)}</span>
        <span className="ml-auto text-xs font-bold text-slate-500">{node.count}</span>
      </button>
      {open && (
        <div className="space-y-0.5 px-2 pb-2">
          {node.sets.map((t) => {
            const thisLeaf: Leaf = { grade, subject: node.subject, set: t.set };
            const active =
              activeLeaf != null && leafKey(activeLeaf) === leafKey(thisLeaf);
            return (
              <div
                key={SET_LABEL(t.set)}
                className="group flex items-center gap-2 rounded-lg px-2 py-2 transition"
                style={
                  active
                    ? {
                        background: "linear-gradient(90deg, rgba(245,158,11,0.14), transparent)",
                        borderLeft: "3px solid #f59e0b",
                      }
                    : { borderLeft: "3px solid transparent" }
                }
              >
                <button
                  onClick={() => onSelectLeaf(thisLeaf)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className={`truncate text-sm font-medium ${active ? "text-amber-300" : "text-slate-300"}`}>
                    {SET_LABEL(t.set)}
                  </span>
                  <span className="ml-auto text-xs font-bold text-slate-500">{t.count}</span>
                </button>
                <button
                  onClick={() => onAddInLeaf(thisLeaf)}
                  title="Add question here"
                  className="shrink-0 rounded p-1 text-slate-500 opacity-0 transition hover:bg-white/[0.06] hover:text-amber-400 group-hover:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Questions table (shared by browse-leaf and flat views) ────────────────────
function QuestionsTable({
  questions,
  loading,
  onEdit,
  onReload,
}: {
  questions: QuestionRow[];
  loading: boolean;
  onEdit: (id: string) => void;
  onReload: () => void;
}) {
  return (
    <>
      {/* Desktop: table. Mobile: stacked cards (below). */}
      <div className="mt-5 hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead
                className="text-[13px] font-semibold text-slate-400"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th className="px-6 py-3.5 font-semibold">Question</th>
                  <th className="px-6 py-3.5 font-semibold">Type</th>
                  <th className="px-6 py-3.5 font-semibold">Section</th>
                  <th className="px-6 py-3.5 font-semibold">Set</th>
                  <th className="px-6 py-3.5 font-semibold">Marks</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : questions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      No questions here.
                    </td>
                  </tr>
                ) : (
                  questions.map((qq, i) => (
                    <tr
                      key={qq.id}
                      className="text-slate-200 transition hover:bg-white/[0.02]"
                      style={{ borderBottom: i < questions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                    >
                      <td className="max-w-md px-6 py-4">
                        <span className="line-clamp-2 text-slate-300">{qq.question_text}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Pill tone={qq.question_type === "mcq" ? "amber" : qq.question_type === "subjective" ? "accent" : "slate"}>
                          {TYPE_LABELS[qq.question_type] ?? qq.question_type}
                        </Pill>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{qq.subject ?? "—"}</td>
                      <td className="px-6 py-4 text-slate-400">{qq.set_name ?? "—"}</td>
                      <td className="px-6 py-4 text-slate-400">{qq.max_marks}</td>
                      <td className="px-6 py-4">
                        <QuestionActions id={qq.id} onEdit={() => onEdit(qq.id)} onReload={onReload} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="mt-4 space-y-3 md:hidden">
        {loading ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">Loading…</p>
        ) : questions.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">No questions here.</p>
        ) : (
          questions.map((qq) => (
            <article key={qq.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-3 min-w-0 text-sm leading-relaxed text-slate-200">{qq.question_text}</p>
                <QuestionActions id={qq.id} onEdit={() => onEdit(qq.id)} onReload={onReload} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
                <span className={`rounded-full px-2 py-0.5 font-medium ${TYPE_TONE[qq.question_type] ?? "bg-slate-800 text-slate-300"}`}>
                  {TYPE_LABELS[qq.question_type] ?? qq.question_type}
                </span>
                {qq.subject && <span>{qq.subject}</span>}
                {qq.set_name && <span>· {qq.set_name}</span>}
                <span>{qq.max_marks} {qq.max_marks === 1 ? "mark" : "marks"}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}

// Row actions shared by the desktop table and the mobile cards.
function QuestionActions({
  id,
  onEdit,
  onReload,
}: {
  id: string;
  onEdit: () => void;
  onReload: () => void;
}) {
  const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border transition";
  return (
    <div className="flex shrink-0 justify-end gap-2.5">
      <button
        onClick={onEdit}
        className={`${iconBtn} border-white/10 bg-white/[0.03] text-slate-300 hover:text-white`}
        title="Edit"
      >
        <Pencil className="h-[17px] w-[17px]" />
      </button>
      <button
        onClick={async () => {
          if (!confirm("Delete this question?")) return;
          const res = await fetch(`/api/coaching/questions/${id}`, { method: "DELETE" });
          if (res.ok) onReload();
        }}
        className={`${iconBtn} text-red-400`}
        style={{ background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.3)" }}
        title="Delete"
      >
        <Trash2 className="h-[17px] w-[17px]" />
      </button>
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
  prefill,
  taxonomy,
  isSuperAdmin,
  onClose,
  onSaved,
}: {
  editId: string | null;
  prefill: Leaf | null;
  taxonomy: GradeNode[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<QType>("mcq");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<Option[]>(DEFAULT_OPTIONS);
  const [correct, setCorrect] = useState("A");
  const [natTolerance, setNatTolerance] = useState("0");
  const [solution, setSolution] = useState("");
  const [grade, setGrade] = useState(prefill?.grade ?? "");
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [setName, setSetName] = useState(prefill?.set ?? "");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [maxMarks, setMaxMarks] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  // Bilingual (Hindi) — optional collapsible section.
  const [showHindi, setShowHindi] = useState(false);
  const [questionTextHi, setQuestionTextHi] = useState("");
  const [optionsHi, setOptionsHi] = useState<Record<string, string>>({});
  const [solutionHi, setSolutionHi] = useState("");

  // Section options bound to the chosen exam's catalog (ExamSection), merged with
  // any sections already present in the bank for this grade.
  const [catalogSections, setCatalogSections] = useState<string[]>([]);

  // Combobox suggestions derived from the folder tree.
  const gradeOptions = useMemo(
    () => taxonomy.map((g) => g.grade).filter((g): g is string => !!g),
    [taxonomy]
  );
  const subjectOptions = useMemo(() => {
    const node = taxonomy.find((g) => g.grade === grade);
    const fromBank = node ? node.subjects : taxonomy.flatMap((g) => g.subjects);
    const bankNames = fromBank.map((s) => s.subject).filter((s): s is string => !!s);
    return [...new Set([...catalogSections, ...bankNames])];
  }, [taxonomy, grade, catalogSections]);
  const setNameOptions = useMemo(() => {
    const gNode = taxonomy.find((g) => g.grade === grade);
    const subjects = gNode ? gNode.subjects : taxonomy.flatMap((g) => g.subjects);
    const sNode = subjects.find((s) => s.subject === subject);
    const src = sNode ? sNode.sets : subjects.flatMap((s) => s.sets);
    return [...new Set(src.map((t) => t.set).filter((t): t is string => !!t))];
  }, [taxonomy, grade, subject]);

  // Fetch the exam's section catalog whenever the chosen exam/class changes.
  useEffect(() => {
    const exam = grade.trim();
    if (!exam) {
      setCatalogSections([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/coaching/exam-sections?exam=${encodeURIComponent(exam)}`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        setCatalogSections((data.sections ?? []).map((s: { name: string }) => s.name));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [grade]);

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
        setOptions(Array.isArray(x.options) && x.options.length ? x.options : DEFAULT_OPTIONS);
        setCorrect(x.correct_answer ?? "A");
        setNatTolerance(String(x.nat_tolerance ?? 0));
        setSolution(x.solution ?? "");
        setGrade(x.grade ?? "");
        setSubject(x.subject ?? "");
        setSetName(x.set_name ?? "");
        setTopic(x.topic ?? "");
        setDifficulty(x.difficulty ?? "");
        setMaxMarks(String(x.max_marks ?? 1));
        setQuestionTextHi(x.question_text_hindi ?? "");
        setSolutionHi(x.solution_hindi ?? "");
        if (Array.isArray(x.options_hindi)) {
          const map: Record<string, string> = {};
          for (const o of x.options_hindi) if (o?.label) map[o.label] = o.text ?? "";
          setOptionsHi(map);
        }
        if (x.question_text_hindi || x.solution_hindi || (Array.isArray(x.options_hindi) && x.options_hindi.length)) {
          setShowHindi(true);
        }
      }
      setLoadingEdit(false);
    })();
  }, [editId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        question_type: type,
        question_text: questionText,
        solution,
        grade,
        subject,
        set_name: setName,
        topic,
        difficulty,
        max_marks: Number(maxMarks),
        question_text_hindi: questionTextHi,
        solution_hindi: solutionHi,
      };
      if (type === "mcq") {
        const kept = options.filter((o) => o.text.trim());
        body.options = kept;
        body.correct_answer = correct;
        // Align Hindi options by label with the kept English options.
        body.options_hindi = kept.map((o) => ({ label: o.label, text: optionsHi[o.label] ?? "" }));
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="my-8 w-full max-w-3xl rounded-[18px] border p-6"
        style={{ background: "#0f1218", borderColor: "rgba(255,255,255,0.07)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: display }}>
            {editId ? "Edit Question" : "Add Question"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.06]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingEdit ? (
          <p className="py-8 text-center text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {/* Placement: Exam/Class → Section → Set. Section suggests the exam's
                catalog sections; Set is the grouping that keeps questions findable. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Combobox label="Exam / Class" value={grade} onChange={setGrade} options={gradeOptions} placeholder="e.g. SSC CGL / Class 8" listId="grade-list" />
              <Combobox label="Section / Subject" value={subject} onChange={setSubject} options={subjectOptions} placeholder="e.g. Quant / Science" listId="subject-list" />
              <Combobox label="Set / Mock" value={setName} onChange={setSetName} options={setNameOptions} placeholder="e.g. Mock 5 / Ch-5 Test" listId="set-list" />
            </div>

            {/* Type + marks */}
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
                  {/* Authoring subjective is super-admin-only (AI import). Coaching
                      admins can't pick it when creating, but the option still shows
                      when they're editing an already-subjective question so the type
                      renders correctly and they can fix its content. */}
                  {(isSuperAdmin || type === "subjective") && (
                    <option value="subjective">Subjective</option>
                  )}
                </select>
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
                Students answer on paper and photograph it; AI grades the photo against
                the model answer below, and you can review or override the marks.
              </p>
            )}

            {/* Solution / model answer + preview */}
            <PreviewField
              label={type === "subjective" ? "Model answer (AI grades against this)" : "Solution (optional)"}
              value={solution}
              onChange={setSolution}
              rows={3}
            />
            {type === "subjective" && !solution.trim() && (
              <p className="-mt-3 text-xs text-amber-400">
                Add a model answer for accurate AI grading.
              </p>
            )}

            {/* Optional fine-grained topic tag + difficulty */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-300">Topic (optional)</span>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="e.g. Kinematics" />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Difficulty (optional)</span>
                <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="easy / medium / hard" />
              </label>
            </div>

            {/* Bilingual (Hindi) — optional. Empty fields fall back to English at render. */}
            <div className="rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setShowHindi((s) => !s)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
              >
                <ChevronRight className={`h-4 w-4 transition-transform ${showHindi ? "rotate-90" : ""}`} />
                हिन्दी (optional)
              </button>
              {showHindi && (
                <div className="space-y-3 border-t border-slate-800 p-3">
                  <PreviewField label="प्रश्न (Hindi)" value={questionTextHi} onChange={setQuestionTextHi} rows={3} />
                  {type === "mcq" && (
                    <div className="space-y-2">
                      <span className="block text-sm text-slate-300">विकल्प (Hindi)</span>
                      {options.map((opt) => (
                        <div key={opt.label} className="flex items-center gap-2">
                          <span className="w-5 text-slate-400">{opt.label}</span>
                          <input
                            value={optionsHi[opt.label] ?? ""}
                            onChange={(e) => setOptionsHi((m) => ({ ...m, [opt.label]: e.target.value }))}
                            placeholder={`विकल्प ${opt.label}`}
                            className={inputCls}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <PreviewField label="हल (Hindi, optional)" value={solutionHi} onChange={setSolutionHi} rows={2} />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl py-2.5 font-bold transition hover:brightness-110 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#fb923c 0%,#f59e0b 100%)", color: "#1a1205" }}
            >
              {saving ? "Saving…" : editId ? "Save changes" : "Add question"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Suggest-but-allow text input: a free-text field backed by a <datalist> of
// existing values so folders stay consistent without rigid enums.
function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  listId: string;
}) {
  return (
    <label>
      <span className="block text-sm text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={listId}
        placeholder={placeholder}
        className={`mt-1 ${inputCls}`}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
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
