"use client";

import { useState } from "react";
import { X, Upload, Loader2, FileText, ImageIcon } from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

type ParsedQ = {
  question_type: "mcq" | "nat" | "subjective";
  question_text: string;
  question_text_hindi?: string | null;
  options?: { label: string; text: string }[];
  options_hindi?: { label: string; text: string }[];
  correct_answer?: string;
  max_marks?: number;
  nat_tolerance?: number | null;
  solution?: string | null;
  solution_hindi?: string | null;
  section?: string | null;
  topic?: string | null;
  images?: { index: number; filename: string }[] | null;
  answer_derived?: boolean;
  _include?: boolean;
};

export default function QuestionImportModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"upload" | "review" | "done">("upload");
  const [exam, setExam] = useState("");
  const [set, setSet] = useState("");
  const [qtype, setQtype] = useState<"objective" | "subjective" | "mixed">("objective");
  const [topics, setTopics] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sections, setSections] = useState<string[]>([]);
  const [topicsBySection, setTopicsBySection] = useState<Record<string, string[]>>({});
  const [questions, setQuestions] = useState<ParsedQ[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: { index: number; reason: string }[] } | null>(null);

  async function runExtract() {
    setError(null);
    if (!exam.trim() || !set.trim()) return setError("Enter an exam and a set name.");
    if (images.length === 0 && !pdf) return setError("Upload at least one image or a PDF.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("exam", exam.trim());
      fd.set("set", set.trim());
      fd.set("qtype", qtype);
      if (topics.trim()) fd.set("topics", topics.trim());
      images.forEach((f) => fd.append("images", f));
      if (pdf) fd.set("pdf", pdf);
      const res = await fetch("/api/coaching/questions/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Extraction failed");
        return;
      }
      setSections(data.sections ?? []);
      setTopicsBySection(data.topicsBySection ?? {});
      setQuestions((data.questions ?? []).map((q: ParsedQ) => ({ ...q, _include: true })));
      setPhase("review");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      const payload = questions
        .filter((q) => q._include)
        .map((q) => {
          const copy = { ...q };
          delete copy._include;
          return copy;
        });
      const res = await fetch("/api/coaching/questions/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam: exam.trim(), set: set.trim(), questions: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      setResult({ created: data.created, skipped: data.skipped ?? [] });
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  const includedCount = questions.filter((q) => q._include).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Bulk import {phase === "review" ? `· review (${includedCount})` : ""}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

        {phase === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Upload photos of a question paper or a PDF. We extract the questions, translate
              EN↔HI, and tag each with a section from this exam — you review before saving.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm text-slate-300">Exam / Class</span>
                <input value={exam} onChange={(e) => setExam(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="e.g. SSC CGL" />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Set / Mock</span>
                <input value={set} onChange={(e) => setSet(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="e.g. Mock 5" />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Topic list (optional, comma-sep)</span>
                <input value={topics} onChange={(e) => setTopics(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="Kinematics, Optics…" />
              </label>
            </div>

            {/* Pre-declared question type → focused (more accurate) extraction. */}
            <div>
              <span className="text-sm text-slate-300">What does this paper contain?</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(
                  [
                    { v: "objective", label: "MCQ / Numerical", hint: "options or numeric answers" },
                    { v: "subjective", label: "Subjective", hint: "written answers + model solutions" },
                    { v: "mixed", label: "Mixed — auto-detect", hint: "AI classifies each question" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setQtype(o.v)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      qtype === o.v
                        ? "border-amber-500 bg-amber-500/10 text-amber-300"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="block font-medium">{o.label}</span>
                    <span className="block text-[11px] text-slate-500">{o.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-6 text-center hover:border-amber-500">
                <ImageIcon className="h-6 w-6 text-slate-500" />
                <span className="text-sm text-slate-300">{images.length ? `${images.length} image(s) selected` : "Choose images"}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setImages(Array.from(e.target.files ?? []))} />
              </label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-6 text-center hover:border-amber-500">
                <FileText className="h-6 w-6 text-slate-500" />
                <span className="text-sm text-slate-300">{pdf ? pdf.name : "Choose a PDF"}</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <button
              onClick={runExtract}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Extracting…</> : <><Upload className="h-4 w-4" /> Extract questions</>}
            </button>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              {questions.length} parsed. Edit/untick any, set sections, then save to{" "}
              <span className="text-slate-200">{exam} → {set}</span>. AI can make mistakes — review.
            </p>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <div key={i} className={`rounded-xl border p-3 ${q._include ? "border-slate-700 bg-slate-950" : "border-slate-800 bg-slate-950/40 opacity-60"}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={q._include ?? true}
                      onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, _include: e.target.checked } : x)))}
                      className="h-4 w-4 accent-amber-500"
                    />
                    {/* Type is correctable here — the safety net for misclassification. */}
                    <select
                      value={q.question_type}
                      onChange={(e) =>
                        setQuestions((qs) =>
                          qs.map((x, j) =>
                            j === i ? { ...x, question_type: e.target.value as ParsedQ["question_type"] } : x
                          )
                        )
                      }
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                    >
                      <option value="mcq">MCQ</option>
                      <option value="nat">NAT</option>
                      <option value="subjective">Subjective</option>
                    </select>
                    <select
                      value={q.section ?? ""}
                      onChange={(e) => {
                        const section = e.target.value || null;
                        // Drop a topic that doesn't belong to the newly chosen section.
                        const valid = section ? topicsBySection[section] ?? [] : [];
                        setQuestions((qs) =>
                          qs.map((x, j) =>
                            j === i
                              ? { ...x, section, topic: valid.includes(x.topic ?? "") ? x.topic : null }
                              : x
                          )
                        );
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                    >
                      <option value="">{sections.length ? "— Unsectioned —" : "No sections"}</option>
                      {sections.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {(topicsBySection[q.section ?? ""]?.length ?? 0) > 0 && (
                      <select
                        value={q.topic ?? ""}
                        onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, topic: e.target.value || null } : x)))}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                      >
                        <option value="">— Topic —</option>
                        {topicsBySection[q.section ?? ""].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    )}
                    {q.images && q.images.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                        <ImageIcon className="h-3 w-3" />
                        {q.images.length} image{q.images.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {q.answer_derived && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400" title="Answer was AI-solved (not found in the paper) — verify it">
                        AI-solved · verify
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="number"
                        min={1}
                        value={q.max_marks ?? 1}
                        onChange={(e) =>
                          setQuestions((qs) =>
                            qs.map((x, j) => (j === i ? { ...x, max_marks: Number(e.target.value) || 1 } : x))
                          )
                        }
                        className="w-14 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-white"
                        title="Max marks"
                      />
                      mk{q.question_type !== "subjective" && <> · ans {q.correct_answer || "—"}</>}
                    </span>
                  </div>
                  {/* Snapshot(s) of a figure question (cropped from the page) — verify they
                      captured the whole question + options. All attached images preview. */}
                  {q.images && q.images.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {q.images.map((img, ii) => (
                        <div key={ii} className="overflow-hidden rounded-lg border border-slate-700 bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.filename}
                            alt={`question image ${ii + 1}`}
                            className="mx-auto max-h-80 w-auto object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={q.question_text}
                    onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, question_text: e.target.value } : x)))}
                    rows={2}
                    className={`${inputCls} font-mono text-xs`}
                  />

                  {/* Answer editor — options/correct answer are the most-missed fields,
                      so they must be reviewable/fixable here before saving. */}
                  {q.question_type === "mcq" && (
                    <div className="mt-2 space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase text-slate-500">Options · select the correct one</p>
                        <button
                          type="button"
                          onClick={() => setQuestions((qs) => qs.map((x, j) => {
                            if (j !== i) return x;
                            const opts = x.options ?? [];
                            const label = String.fromCharCode(65 + opts.length); // A, B, C…
                            return { ...x, options: [...opts, { label, text: "" }] };
                          }))}
                          className="text-[11px] text-amber-400 hover:underline"
                        >
                          + option
                        </button>
                      </div>
                      {(q.options ?? []).length === 0 && (
                        <p className="text-[11px] text-red-400">No options extracted — add them and pick the answer, or untick this question.</p>
                      )}
                      {(q.options ?? []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${i}`}
                            checked={q.correct_answer === opt.label}
                            onChange={() => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, correct_answer: opt.label } : x)))}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span className="w-4 text-xs text-slate-400">{opt.label}</span>
                          <input
                            value={opt.text}
                            onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, options: (x.options ?? []).map((o, k) => (k === oi ? { ...o, text: e.target.value } : o)) } : x)))}
                            placeholder={`Option ${opt.label}`}
                            className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {q.question_type === "nat" && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <span className="text-[10px] uppercase text-slate-500">Numeric answer</span>
                      <input
                        value={q.correct_answer ?? ""}
                        onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, correct_answer: e.target.value } : x)))}
                        placeholder="e.g. 42"
                        className="w-28 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                      />
                    </div>
                  )}
                  {q.question_type === "subjective" && (
                    <div className="mt-2 space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <p className="text-[10px] uppercase text-slate-500">
                        Model answer — the AI grades student photos against this
                      </p>
                      {!String(q.solution ?? "").trim() && (
                        <p className="text-[11px] text-amber-400">
                          No model answer extracted — add one for accurate AI grading.
                        </p>
                      )}
                      <textarea
                        value={q.solution ?? ""}
                        onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, solution: e.target.value } : x)))}
                        rows={3}
                        placeholder="Expected answer / marking points…"
                        className={`${inputCls} font-mono text-xs`}
                      />
                      {String(q.solution ?? "").trim() && (
                        <MathRenderer content={q.solution!} className="text-xs text-slate-300" />
                      )}
                      {String(q.solution_hindi ?? "").trim() && (
                        <MathRenderer content={q.solution_hindi!} className="text-xs text-slate-400" />
                      )}
                    </div>
                  )}

                  {/* Worked solution for objective questions — extracted from the
                      answer key and SAVED, so it must be reviewable here too. */}
                  {q.question_type !== "subjective" && (
                    <div className="mt-2 space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <p className="text-[10px] uppercase text-slate-500">Solution / explanation</p>
                      <textarea
                        value={q.solution ?? ""}
                        onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, solution: e.target.value } : x)))}
                        rows={2}
                        placeholder="Worked solution (optional)…"
                        className={`${inputCls} font-mono text-xs`}
                      />
                      {String(q.solution ?? "").trim() && (
                        <MathRenderer content={q.solution!} className="text-xs text-slate-300" />
                      )}
                      {String(q.solution_hindi ?? "").trim() && (
                        <MathRenderer content={q.solution_hindi!} className="text-xs text-slate-400" />
                      )}
                    </div>
                  )}

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5">
                      <p className="mb-1 text-[10px] uppercase text-slate-500">EN preview</p>
                      <MathRenderer content={q.question_text} className="text-xs text-slate-200" />
                    </div>
                    {q.question_text_hindi && (
                      <div className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5">
                        <p className="mb-1 text-[10px] uppercase text-slate-500">हिन्दी preview</p>
                        <MathRenderer content={q.question_text_hindi} className="text-xs text-slate-200" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPhase("upload")} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Back</button>
              <button
                onClick={commit}
                disabled={busy || includedCount === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : `Save ${includedCount} question(s)`}
              </button>
            </div>
          </div>
        )}

        {phase === "done" && result && (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold text-emerald-400">Imported {result.created} question(s)</p>
            {result.skipped.length > 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-left text-xs text-slate-400">
                <p className="mb-1 text-slate-300">Skipped {result.skipped.length}:</p>
                {result.skipped.slice(0, 10).map((s) => (
                  <p key={s.index}>· row {s.index + 1}: {s.reason}</p>
                ))}
              </div>
            )}
            <button onClick={onDone} className="w-full rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-500">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
