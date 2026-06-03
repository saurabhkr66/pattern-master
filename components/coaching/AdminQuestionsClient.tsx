"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";

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
}: {
  initialQuestions: QuestionRow[];
  coachings: CoachingOption[];
  subjects: string[];
}) {
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [coachingId, setCoachingId] = useState("");
  const [loading, setLoading] = useState(false);
  const firstLoad = useRef(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (subject) params.set("subject", subject);
    if (type) params.set("type", type);
    if (coachingId === "__orphaned__") {
      params.set("orphaned", "1");
    } else if (coachingId) {
      params.set("coachingId", coachingId);
    }
    const res = await fetch(`/api/admin/questions?${params}`);
    const data = await res.json();
    if (res.ok) setQuestions(data.questions);
    setLoading(false);
  }, [q, subject, type, coachingId]);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    const t = setTimeout(refetch, 300);
    return () => clearTimeout(t);
  }, [q, subject, type, coachingId, refetch]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-white">All Questions</h1>
      <p className="mt-1 text-sm text-slate-400">
        {questions.length} question{questions.length !== 1 ? "s" : ""} across all coachings
      </p>

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
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All types</option>
          <option value="mcq">MCQ</option>
          <option value="nat">Numerical</option>
          <option value="subjective">Subjective</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
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
    </div>
  );
}
