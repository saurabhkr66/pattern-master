"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, PencilLine } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  nat: "Numerical",
  subjective: "Subjective",
};

type QuestionRow = {
  id: string;
  question_text: string;
  question_type: string;
  subject: string | null;
  topic: string | null;
  difficulty: string | null;
  max_marks: number;
  coaching_id: string | null;
  coaching: { id: string; name: string } | null;
  created_at: string;
};

type CoachingOption = { id: string; name: string };

export default function AdminQuestionsClient({
  initialQuestions,
  coachings,
  subjects,
  sets,
  grades,
}: {
  initialQuestions: QuestionRow[];
  coachings: CoachingOption[];
  subjects: string[];
  sets: string[];
  grades: string[];
}) {
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [setName, setSetName] = useState("");
  const [coachingId, setCoachingId] = useState("");
  const [loading, setLoading] = useState(false);
  // Filter signature the current list already reflects (initially the SSR query:
  // all blank). Refetch only when it changes — robust against React StrictMode's
  // double-mount, which made a "skip first render" ref refetch and flash the list.
  const loadedKey = useRef("|||||");

  const refetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (grade) params.set("grade", grade);
    if (subject) params.set("subject", subject);
    if (type) params.set("type", type);
    if (setName) params.set("set", setName);
    if (coachingId === "__orphaned__") {
      params.set("orphaned", "1");
    } else if (coachingId) {
      params.set("coachingId", coachingId);
    }
    const res = await fetch(`/api/admin/questions?${params}`);
    const data = await res.json();
    if (res.ok) setQuestions(data.questions);
    setLoading(false);
  }, [q, grade, subject, type, setName, coachingId]);

  useEffect(() => {
    const key = `${q}|${grade}|${subject}|${type}|${setName}|${coachingId}`;
    if (loadedKey.current === key) return;
    const t = setTimeout(() => {
      loadedKey.current = key;
      refetch();
    }, 300);
    return () => clearTimeout(t);
  }, [q, grade, subject, type, setName, coachingId, refetch]);

  // Carry the active filters into the review editor so it opens the same slice.
  const reviewHref = (() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (grade) params.set("grade", grade);
    if (subject) params.set("subject", subject);
    if (type) params.set("type", type);
    if (setName) params.set("set", setName);
    if (coachingId === "__orphaned__") params.set("orphaned", "1");
    else if (coachingId) params.set("coachingId", coachingId);
    const qs = params.toString();
    return qs ? `/admin/questions/review?${qs}` : "/admin/questions/review";
  })();

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">All Questions</h1>
          <p className="mt-1 text-sm text-slate-400">
            {questions.length} question{questions.length !== 1 ? "s" : ""} across all coachings
          </p>
        </div>
        <Link
          href={reviewHref}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          <PencilLine className="h-4 w-4" /> Review &amp; edit
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search question text…"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={coachingId}
          onChange={(e) => setCoachingId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All coachings</option>
          {coachings.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="__orphaned__">Deleted coachings</option>
        </select>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All exams / classes</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All sets / mocks</option>
          {sets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All types</option>
          <option value="mcq">MCQ</option>
          <option value="msq">MSQ</option>
          <option value="nat">Numerical</option>
          <option value="subjective">Subjective</option>
        </select>
      </div>

      {/* Desktop: table. Mobile: stacked cards (below). */}
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Question</th>
              <th className="px-4 py-3 font-medium">Coaching</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Marks</th>
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
                  No questions found.
                </td>
              </tr>
            ) : (
              questions.map((qq) => (
                <tr key={qq.id} className="text-slate-200">
                  <td className="max-w-sm px-4 py-3">
                    <span className="line-clamp-2 text-slate-300">{qq.question_text}</span>
                    {qq.topic && (
                      <span className="mt-0.5 block text-xs text-slate-500">{qq.topic}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {qq.coaching ? (
                      <span className="text-slate-300">{qq.coaching.name}</span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                        Deleted coaching
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {TYPE_LABELS[qq.question_type] ?? qq.question_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{qq.subject ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{qq.max_marks}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-4 space-y-3 md:hidden">
        {loading ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">Loading…</p>
        ) : questions.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">No questions found.</p>
        ) : (
          questions.map((qq) => (
            <div key={qq.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="line-clamp-3 text-sm text-slate-200">{qq.question_text}</p>
              {qq.topic && <p className="mt-0.5 text-xs text-slate-500">{qq.topic}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                  {TYPE_LABELS[qq.question_type] ?? qq.question_type}
                </span>
                {qq.coaching ? (
                  <span>{qq.coaching.name}</span>
                ) : (
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-500">Deleted coaching</span>
                )}
                {qq.subject && <span>{qq.subject}</span>}
                <span>{qq.max_marks} marks</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
