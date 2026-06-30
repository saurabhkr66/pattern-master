"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowLeft, Clock } from "lucide-react";
import { renderMath } from "@/lib/renderMath";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import SubjectiveAnswerInput from "@/components/test/SubjectiveAnswerInput";
import type { TestQuestion } from "@/components/test/testEngineTypes";
import { Card, display, mono, AMBER_GRAD, AMBER_GLOW } from "@/components/coaching/ui";

export type RunnerQuestion = {
  id: string;
  question_type: "mcq" | "msq" | "nat" | "subjective";
  question_text: string;
  question_html: string | null;
  options: string[];
  marks: number;
  images: { index: number; filename: string; type?: string }[] | null;
};

type Feedback = {
  questionId: string;
  type: string;
  awarded: number;
  maxMarks: number;
  correct: boolean | null;
  correctText: string | null;
  solutionHtml: string | null;
};

type CheckResult = {
  status: "in_progress" | "review_locked";
  score: number;
  maxScore: number;
  passPct: number;
  passed: boolean;
  hasSubjective: boolean;
  awaitingReview: boolean;
  feedback: Feedback[];
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function AssignmentRunner({
  slug,
  testId,
  attemptId,
  title,
  passPct,
  questions,
  initialLocked,
}: {
  slug: string;
  testId: string;
  attemptId: string;
  title: string;
  passPct: number;
  questions: RunnerQuestion[];
  initialLocked: boolean;
}) {
  const router = useRouter();
  const [mcq, setMcq] = useState<Record<string, string>>({});
  const [msq, setMsq] = useState<Record<string, string[]>>({});
  const [nat, setNat] = useState<Record<string, string>>({});
  const [subj, setSubj] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<CheckResult | null>(null);
  const [locked, setLocked] = useState(initialLocked);
  const [submitting, setSubmitting] = useState<null | "check" | "review">(null);
  const [error, setError] = useState<string | null>(null);

  const hasSubjective = useMemo(
    () => questions.some((q) => q.question_type === "subjective"),
    [questions]
  );
  const fbById = useMemo(() => {
    const m = new Map<string, Feedback>();
    result?.feedback.forEach((f) => m.set(f.questionId, f));
    return m;
  }, [result]);

  const uploadEndpoint = `/api/student/assignment/${testId}/upload-answer`;

  function buildAnswers() {
    return questions.map((q) => {
      let userAnswer: string | null = null;
      if (q.question_type === "msq") userAnswer = (msq[q.id]?.slice().sort().join(";")) || null;
      else if (q.question_type === "nat") userAnswer = (nat[q.id] ?? "").trim() || null;
      else if (q.question_type === "subjective") userAnswer = (subj[q.id] ?? []).join(";") || null;
      else userAnswer = mcq[q.id] ?? null;
      return { questionId: q.id, userAnswer, timeSpentSecs: 0 };
    });
  }

  async function submit(action: "check" | "review") {
    setSubmitting(action);
    setError(null);
    try {
      const res = await fetch(`/api/student/assignment/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, action, answers: buildAnswers() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.locked) setLocked(true);
        setError(data?.error ?? "Could not submit — try again");
        return;
      }
      setResult(data as CheckResult);
      if (data.status === "review_locked") setLocked(true);
      // Scroll to the top banner so the student sees their score.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error — please retry");
    } finally {
      setSubmitting(null);
    }
  }

  function setMsqToggle(qid: string, letter: string) {
    setMsq((prev) => {
      const cur = prev[qid] ?? [];
      return { ...prev, [qid]: cur.includes(letter) ? cur.filter((l) => l !== letter) : [...cur, letter] };
    });
  }

  const pct = result && result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  const inputsDisabled = locked;

  return (
    <div className="relative min-h-screen" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
        style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
      />
      <main className="relative mx-auto max-w-3xl px-4 py-7 sm:px-6">
        <Link href={`/c/${slug}/dashboard`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold text-white sm:text-[28px]" style={{ fontFamily: display, letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {questions.length} questions · pass at {passPct}% · untimed — retry until you pass
        </p>

        {/* Result / status banner */}
        {locked ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-5 py-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold text-white">Submitted for review</p>
              <p className="mt-0.5 text-sm text-slate-300">
                Your written answers were sent to your teacher. You&apos;ll see your final result once they&apos;ve been graded.
              </p>
            </div>
          </div>
        ) : result ? (
          <div
            className="mt-5 rounded-2xl border px-5 py-4"
            style={{
              borderColor: result.passed ? "rgba(52,211,153,0.4)" : "rgba(251,191,36,0.4)",
              background: result.passed ? "rgba(52,211,153,0.08)" : "rgba(251,191,36,0.08)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white" style={{ fontFamily: display }}>
                  {result.passed ? "You passed! 🎉" : `Keep going — ${pct}%`}
                </p>
                <p className="mt-0.5 text-sm text-slate-300">
                  Objective score {result.score}/{result.maxScore} ({pct}%) · pass needs {result.passPct}%
                  {result.hasSubjective && " · written answers graded by your teacher"}
                </p>
              </div>
              <span className="text-2xl font-extrabold text-white" style={{ fontFamily: display }}>{pct}%</span>
            </div>
          </div>
        ) : null}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {/* Questions */}
        <div className="mt-6 space-y-4">
          {questions.map((q, i) => {
            const fb = fbById.get(q.id);
            return (
              <Card key={q.id} className="overflow-hidden">
                <div className="px-5 py-5 sm:px-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/15 text-sm font-bold text-amber-400">
                      {i + 1}
                    </span>
                    <span className="text-xs text-slate-500" style={{ fontFamily: mono }}>
                      {q.question_type.toUpperCase()} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                    </span>
                    {fb && fb.correct != null && (
                      fb.correct ? (
                        <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />
                      ) : (
                        <XCircle className="ml-auto h-5 w-5 text-red-400" />
                      )
                    )}
                  </div>

                  <div
                    className="text-[15px] leading-relaxed text-slate-100"
                    dangerouslySetInnerHTML={{ __html: renderMath(q.question_html || q.question_text) }}
                  />

                  {/* Question figures */}
                  {q.images && q.images.filter((im) => im.type !== "explanation").length > 0 && (
                    <div className="mt-3 flex flex-col gap-3">
                      {q.images.filter((im) => im.type !== "explanation").map((im) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={im.index} src={getCloudinaryUrl(im.filename)} alt="" className="max-h-[360px] w-full rounded-lg object-contain" />
                      ))}
                    </div>
                  )}

                  {/* Inputs */}
                  <div className="mt-4">
                    {(q.question_type === "mcq" || q.question_type === "msq") && (
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const letter = LETTERS[oi];
                          const selected =
                            q.question_type === "mcq" ? mcq[q.id] === letter : (msq[q.id] ?? []).includes(letter);
                          return (
                            <button
                              key={oi}
                              type="button"
                              disabled={inputsDisabled}
                              onClick={() =>
                                q.question_type === "mcq"
                                  ? setMcq((p) => ({ ...p, [q.id]: letter }))
                                  : setMsqToggle(q.id, letter)
                              }
                              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                                selected
                                  ? "border-amber-500 bg-amber-500/10"
                                  : "border-white/10 bg-white/[0.02] hover:border-amber-500/40"
                              } ${inputsDisabled ? "opacity-70" : ""}`}
                            >
                              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold ${selected ? "bg-amber-500 text-[#1a1205]" : "bg-white/5 text-slate-300"}`}>
                                {letter}
                              </span>
                              <span className="text-sm text-slate-200" dangerouslySetInnerHTML={{ __html: renderMath(opt) }} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.question_type === "nat" && (
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={inputsDisabled}
                        value={nat[q.id] ?? ""}
                        onChange={(e) => setNat((p) => ({ ...p, [q.id]: e.target.value }))}
                        placeholder="Type your answer"
                        className="w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500 disabled:opacity-70"
                      />
                    )}

                    {q.question_type === "subjective" && (
                      <SubjectiveAnswerInput
                        question={q as unknown as TestQuestion}
                        attemptId={attemptId}
                        uploadEndpoint={uploadEndpoint}
                        keys={subj[q.id] ?? []}
                        onChange={(_q, keys) => setSubj((p) => ({ ...p, [q.id]: keys }))}
                      />
                    )}
                  </div>

                  {/* Per-question feedback after a Check */}
                  {fb && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
                      {fb.type === "subjective" ? (
                        <p className="text-slate-400">Your teacher will grade this written answer.</p>
                      ) : (
                        <>
                          <p className={fb.correct ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
                            {fb.correct ? "Correct" : "Not quite"} · {fb.awarded}/{fb.maxMarks}
                          </p>
                          {!fb.correct && fb.correctText && (
                            <p className="mt-1 text-slate-300">
                              Correct answer: <span dangerouslySetInnerHTML={{ __html: renderMath(fb.correctText) }} />
                            </p>
                          )}
                          {fb.solutionHtml && (
                            <div className="mt-2 text-slate-400" dangerouslySetInnerHTML={{ __html: renderMath(fb.solutionHtml) }} />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        {!locked && (
          <div className="sticky bottom-0 mt-6 flex flex-wrap gap-3 border-t border-white/10 bg-[#06060c]/90 py-4 backdrop-blur">
            {result ? (
              <>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5"
                >
                  Retry
                </button>
                {hasSubjective && (
                  <button
                    type="button"
                    disabled={submitting != null}
                    onClick={() => submit("review")}
                    className="rounded-xl px-6 py-3 text-sm font-bold text-[#1a1205] transition hover:brightness-110 disabled:opacity-60"
                    style={{ background: AMBER_GRAD, boxShadow: AMBER_GLOW }}
                  >
                    {submitting === "review" ? "Submitting…" : "Submit for review"}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                disabled={submitting != null}
                onClick={() => submit("check")}
                className="rounded-xl px-6 py-3 text-sm font-bold text-[#1a1205] transition hover:brightness-110 disabled:opacity-60"
                style={{ background: AMBER_GRAD, boxShadow: AMBER_GLOW }}
              >
                {submitting === "check" ? "Checking…" : "Check answers"}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push(`/c/${slug}/dashboard`)}
              className="ml-auto rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Save &amp; exit
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
