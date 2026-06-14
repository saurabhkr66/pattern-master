"use client";

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, Loader2, Sparkles, User } from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";

// Teacher grading panel for one attempt's subjective answers. Each card shows
// the question, the student's photographed answer, the AI's verdict, and an
// override input. Saving an override PATCHes
// /api/coaching/attempts/[attemptId]/subjective and the score updates live.

export type ReviewQuestion = {
  questionId: string;
  number: number;
  questionText: string;
  questionHtml: string | null;
  modelAnswer: string | null;
  /** Answer Gemini wrote itself because none existed in the source. */
  generatedModelAnswer: string | null;
  maxMarks: number;
  answered: boolean;
  imageUrls: string[];
  geminiMarks: number | null;
  geminiFeedback: string | null;
  geminiConfidence: string | null;
  flagged: boolean;
  manualOverride: number | null;
  gradedBy: string | null;
  pending: boolean;
  finalMarks: number | null;
};

const CONFIDENCE_TONE: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-red-500/15 text-red-400",
};

export default function SubjectiveReviewPanel({
  attemptId,
  studentName,
  testTitle,
  initialScore,
  maxScore,
  gradingStatus,
  questions,
}: {
  attemptId: string;
  studentName: string;
  testTitle: string;
  initialScore: number;
  maxScore: number;
  gradingStatus: string;
  questions: ReviewQuestion[];
}) {
  const [items, setItems] = useState(questions);
  const [score, setScore] = useState(initialScore);
  const [status, setStatus] = useState(gradingStatus);

  const needsAttention = items.filter((q) => q.answered && (q.pending || q.flagged)).length;

  return (
    <div className="mx-auto mt-4 max-w-3xl">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">{studentName}</h1>
            <p className="text-sm text-slate-400">{testTitle} · written answers</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold text-white">
              {score} <span className="text-sm font-normal text-slate-500">/ {maxScore}</span>
            </p>
            <p className="text-xs text-slate-500">
              {status === "done" ? (
                <span className="text-emerald-400">All graded</span>
              ) : needsAttention > 0 ? (
                <span className="text-amber-400">{needsAttention} need review</span>
              ) : (
                "Grading in progress"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {items.map((q, i) => (
          <ReviewCard
            key={q.questionId}
            attemptId={attemptId}
            q={q}
            onSaved={(entryMarks, newScore, newStatus) => {
              setItems((prev) =>
                prev.map((x, j) =>
                  j === i
                    ? {
                        ...x,
                        manualOverride: entryMarks,
                        finalMarks: entryMarks,
                        pending: false,
                        flagged: false,
                        gradedBy: "you",
                      }
                    : x
                )
              );
              setScore(newScore);
              setStatus(newStatus);
            }}
          />
        ))}
        {items.length === 0 && (
          <p className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
            This test has no subjective questions.
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewCard({
  attemptId,
  q,
  onSaved,
}: {
  attemptId: string;
  q: ReviewQuestion;
  onSaved: (marks: number, score: number, status: string) => void;
}) {
  const [marksInput, setMarksInput] = useState<string>(
    q.manualOverride != null
      ? String(q.manualOverride)
      : q.geminiMarks != null
        ? String(q.geminiMarks)
        : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  async function save() {
    const marks = Number(marksInput);
    if (!Number.isFinite(marks) || marks < 0 || marks > q.maxMarks) {
      setError(`Marks must be between 0 and ${q.maxMarks}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/coaching/attempts/${attemptId}/subjective`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.questionId, marks }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSaved(marks, data.score, data.gradingStatus);
    } finally {
      setSaving(false);
    }
  }

  const attention = q.answered && (q.pending || q.flagged);

  return (
    <article
      className={`rounded-2xl border bg-slate-950 p-5 ${
        attention ? "border-amber-500/50" : "border-slate-800"
      }`}
    >
      {/* Header: number + state pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-slate-500">Q{q.number}</span>
        <span className="text-xs text-slate-500">{q.maxMarks} marks</span>
        {q.flagged && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
            <AlertTriangle className="h-3 w-3" /> grading failed
          </span>
        )}
        {!q.flagged && q.geminiConfidence && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              CONFIDENCE_TONE[q.geminiConfidence] ?? "bg-slate-800 text-slate-300"
            }`}
          >
            AI: {q.geminiConfidence} confidence
          </span>
        )}
        {q.manualOverride != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
            <User className="h-3 w-3" /> teacher graded
          </span>
        )}
        <span className="ml-auto font-mono text-sm font-bold text-white">
          {q.answered ? (q.pending ? "—" : `${q.finalMarks} / ${q.maxMarks}`) : "not answered"}
        </span>
      </div>

      {/* Question */}
      <div className="mt-3 text-sm leading-relaxed text-slate-200">
        <MathRenderer content={q.questionText} />
      </div>

      {/* Model answer (collapsible). Falls back to the answer Gemini wrote
          itself when the question had no model answer in its source. */}
      {(q.modelAnswer || q.generatedModelAnswer) && (
        <div className="mt-3 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setShowModel((s) => !s)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-400 hover:bg-slate-900"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showModel ? "" : "-rotate-90"}`}
            />
            Model answer
            {!q.modelAnswer && q.generatedModelAnswer && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400">
                <Sparkles className="h-2.5 w-2.5" /> AI-written
              </span>
            )}
          </button>
          {showModel && (
            <div className="border-t border-slate-800 px-3 py-2 text-sm text-slate-300">
              <MathRenderer content={q.modelAnswer || q.generatedModelAnswer!} />
            </div>
          )}
        </div>
      )}

      {!q.answered ? (
        <p className="mt-3 text-sm text-slate-500">The student did not upload an answer.</p>
      ) : (
        <>
          {/* Student's photos */}
          <div className="mt-3 flex flex-wrap gap-3">
            {q.imageUrls.map((url, i) => (
              <button key={i} type="button" onClick={() => setZoomUrl(url)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Answer page ${i + 1}`}
                  className="h-44 w-32 rounded-lg border border-slate-700 object-cover hover:border-amber-500"
                />
              </button>
            ))}
            {q.imageUrls.length === 0 && (
              <p className="text-xs text-red-400">Photos could not be loaded.</p>
            )}
          </div>

          {/* AI verdict */}
          {q.geminiMarks != null && !q.flagged && (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                AI suggestion: <span className="font-mono text-white">{q.geminiMarks} / {q.maxMarks}</span>
              </p>
              {q.geminiFeedback && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{q.geminiFeedback}</p>
              )}
            </div>
          )}

          {/* Override input */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-400">
              {q.pending || q.flagged ? "Award marks" : "Override marks"}
            </label>
            <input
              type="number"
              min={0}
              max={q.maxMarks}
              step={0.5}
              value={marksInput}
              onChange={(e) => setMarksInput(e.target.value)}
              className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-sm text-white outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-500">/ {q.maxMarks}</span>
            <button
              type="button"
              onClick={save}
              disabled={saving || marksInput === ""}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </>
      )}

      {/* Photo zoom overlay */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomUrl} alt="Answer" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </article>
  );
}
