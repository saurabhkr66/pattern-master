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
  images?: { index: number; filename: string; type?: "question" | "explanation" }[] | null;
  answer_derived?: boolean;
  answer_disputed?: boolean;
  verify_answer?: string;
  solution_answer?: string | null;
  solution_mismatch?: boolean;
  solution_review_flag?: boolean;
  solution_review_note?: string;
  options_are_figures?: boolean;
  figure_missing?: boolean;
  solution_figure_missing?: boolean;
  _include?: boolean;
};

type UsageRow = {
  model: string;
  calls: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  costUsd: number | null;
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
  // Independent answer verification is the expensive pass (a stronger model
  // re-solves every objective question blind). Off by default — flash-lite
  // extraction is reliable on easy papers; flip on for hard papers where a wrong
  // answer key is costly.
  const [verify, setVerify] = useState(false);
  const [topics, setTopics] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live extraction progress (NDJSON stream from the import route).
  const [progress, setProgress] = useState<{ label: string; done: number; total: number }>({
    label: "",
    done: 0,
    total: 0,
  });
  const [liveQuestions, setLiveQuestions] = useState<(ParsedQ & { number?: number })[]>([]);

  const [sections, setSections] = useState<string[]>([]);
  const [topicsBySection, setTopicsBySection] = useState<Record<string, string[]>>({});
  const [questions, setQuestions] = useState<ParsedQ[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: { index: number; reason: string }[] } | null>(null);

  // Map a stream phase to a friendly label.
  const PHASE_LABEL: Record<string, string> = {
    enumerate: "Reading the paper…",
    extract: "Extracting questions…",
    answers: "Finding answers & solutions…",
    cropping: "Cropping figures…",
    verify: "Double-checking answers…",
    review: "Reviewing model answers…",
  };

  async function runExtract() {
    setError(null);
    if (!exam.trim() || !set.trim()) return setError("Enter an exam and a set name.");
    if (images.length === 0 && !pdf) return setError("Upload at least one image or a PDF.");
    setBusy(true);
    setLiveQuestions([]);
    setUsage([]);
    setProgress({ label: "Uploading…", done: 0, total: 0 });
    try {
      const fd = new FormData();
      fd.set("exam", exam.trim());
      fd.set("set", set.trim());
      fd.set("qtype", qtype);
      fd.set("verify", verify ? "1" : "0");
      if (topics.trim()) fd.set("topics", topics.trim());
      images.forEach((f) => fd.append("images", f));
      if (pdf) fd.set("pdf", pdf);
      const res = await fetch("/api/coaching/questions/import", { method: "POST", body: fd });

      // The import streams NDJSON: one JSON event per line (phases + per-batch
      // questions for the live view, then a final `done`/`error`). Parse it
      // incrementally so the UI fills in as the model works.
      if (!res.body) {
        setError("Streaming not supported by this browser.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let final: { sections?: string[]; topicsBySection?: Record<string, string[]>; questions?: ParsedQ[] } | null = null;

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue; // heartbeat / blank
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(line);
          } catch {
            continue; // partial line — shouldn't happen post-split, ignore
          }
          if (ev.t === "phase") {
            const phase = String(ev.phase ?? "");
            setProgress((p) => ({
              label: PHASE_LABEL[phase] ?? phase,
              done: phase === "extract" ? 0 : p.done,
              total: typeof ev.total === "number" ? ev.total : p.total,
            }));
          } else if (ev.t === "questions") {
            const items = (ev.items as (ParsedQ & { number?: number })[]) ?? [];
            setLiveQuestions((prev) =>
              [...prev, ...items].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
            );
            setProgress((p) => ({
              ...p,
              done: typeof ev.done === "number" ? ev.done : p.done,
              total: typeof ev.total === "number" ? ev.total : p.total,
            }));
          } else if (ev.t === "usage") {
            setUsage((ev.rows as UsageRow[]) ?? []);
          } else if (ev.t === "done") {
            final = ev as unknown as {
              sections?: string[];
              topicsBySection?: Record<string, string[]>;
              questions?: ParsedQ[];
            };
          } else if (ev.t === "error") {
            setError(String(ev.error ?? "Extraction failed"));
            return;
          }
        }
      }

      if (!final) {
        setError("Extraction ended unexpectedly — try again.");
        return;
      }
      setSections(final.sections ?? []);
      setTopicsBySection(final.topicsBySection ?? {});
      setQuestions((final.questions ?? []).map((q: ParsedQ) => ({ ...q, _include: true })));
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
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

        {/* Live extraction view — progress + questions as they stream in. */}
        {phase === "upload" && busy && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress.label || "Working…"}
            </div>
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: progress.total > 0 ? `${Math.min(100, (progress.done / progress.total) * 100)}%` : "15%" }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {progress.total > 0
                  ? `${progress.done} / ${progress.total} questions`
                  : "Preparing…"}
              </p>
            </div>
            {liveQuestions.length > 0 && (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {liveQuestions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-xs text-slate-500">{q.number ?? i + 1}.</span>
                      <MathRenderer content={q.question_text} className="text-sm text-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-center text-xs text-slate-600">
              Answers, translations and figures are added before the review step.
            </p>
          </div>
        )}

        {phase === "upload" && !busy && (
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

            {/* Answer verification toggle — the expensive Gemini pass. Off by
                default; the admin turns it on only for hard papers. */}
            <div
              onClick={() => setVerify((v) => !v)}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 hover:border-amber-500/60"
            >
              <span
                role="switch"
                aria-checked={verify}
                className={`relative mt-0.5 inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${verify ? "bg-amber-500" : "bg-slate-700"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${verify ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-200">
                  Verify answers (independent AI re-solve)
                </span>
                <span className="block text-[11px] text-slate-500">
                  Off: faster &amp; cheaper — trusts the extracted answer key. On: a second
                  model re-solves each question blind and flags disagreements. Use for hard papers.
                </span>
              </span>
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

            {/* Per-model token usage + rough cost for this import run. */}
            {usage.length > 0 && (
              <details className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                <summary className="cursor-pointer select-none text-slate-300">
                  Token usage &amp; estimated cost
                  {(() => {
                    const known = usage.filter((u) => u.costUsd != null);
                    if (!known.length) return null;
                    const total = known.reduce((s, u) => s + (u.costUsd ?? 0), 0);
                    return (
                      <span className="ml-2 text-amber-300">
                        ≈ ${total.toFixed(4)}
                        {known.length < usage.length ? " (+ unpriced)" : ""}
                      </span>
                    );
                  })()}
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-[11px] text-slate-400">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1 pr-3">Model</th>
                        <th className="py-1 pr-3 text-right">Calls</th>
                        <th className="py-1 pr-3 text-right">Input</th>
                        <th className="py-1 pr-3 text-right">Cached</th>
                        <th className="py-1 pr-3 text-right">Output</th>
                        <th className="py-1 pr-3 text-right">Thinking</th>
                        <th className="py-1 text-right">~Cost (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.map((u) => (
                        <tr key={u.model} className="border-t border-slate-800/60">
                          <td className="py-1 pr-3 text-slate-300">{u.model}</td>
                          <td className="py-1 pr-3 text-right">{u.calls}</td>
                          <td className="py-1 pr-3 text-right">{u.inputTokens.toLocaleString()}</td>
                          <td className="py-1 pr-3 text-right text-emerald-400">{u.cachedTokens.toLocaleString()}</td>
                          <td className="py-1 pr-3 text-right">{u.outputTokens.toLocaleString()}</td>
                          <td className="py-1 pr-3 text-right">{u.thinkingTokens.toLocaleString()}</td>
                          <td className="py-1 text-right">
                            {u.costUsd != null ? `$${u.costUsd.toFixed(4)}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-1 text-[10px] text-slate-600">
                    Estimate at hardcoded prices; thinking tokens bill at the output rate. One import run.
                  </p>
                </div>
              </details>
            )}
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
                    {(() => {
                      const qn = (q.images ?? []).filter((im) => im.type !== "explanation").length;
                      const sn = (q.images ?? []).filter((im) => im.type === "explanation").length;
                      return (
                        <>
                          {qn > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                              <ImageIcon className="h-3 w-3" />
                              {qn} image{qn > 1 ? "s" : ""}
                            </span>
                          )}
                          {sn > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-400" title="Figure(s) attached to the worked solution">
                              <ImageIcon className="h-3 w-3" />
                              {sn} solution fig{sn > 1 ? "s" : ""}
                            </span>
                          )}
                        </>
                      );
                    })()}
                    {q.answer_derived && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400" title="Answer was AI-solved (not found in the paper) — verify it">
                        AI-solved · verify
                      </span>
                    )}
                    {q.answer_disputed && (
                      <span
                        className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400"
                        title={`An independent AI solve got "${q.verify_answer ?? "?"}" but the captured answer is "${q.correct_answer ?? "—"}". Check which is right.`}
                      >
                        ⚠ AI got {q.verify_answer ?? "?"} ≠ {q.correct_answer ?? "—"}
                      </span>
                    )}
                    {q.solution_mismatch && (
                      <span
                        className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400"
                        title={`The worked solution concludes "${q.solution_answer ?? "?"}" but the ticked answer is "${q.correct_answer ?? "—"}". The solution is often the more reliable one — verify.`}
                      >
                        ⚠ solution says {q.solution_answer ?? "?"} ≠ ticked {q.correct_answer ?? "—"}
                      </span>
                    )}
                    {q.solution_review_flag && (
                      <span
                        className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400"
                        title={`An independent AI quality review flagged this model answer: ${q.solution_review_note ?? "may be incorrect or incomplete"}. Check it before saving — students are graded against it.`}
                      >
                        ⚠ model answer: {q.solution_review_note ?? "review"}
                      </span>
                    )}
                    {q.figure_missing && (
                      <span
                        className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400"
                        title="This question was flagged as needing a figure, but none was captured. Add the figure, or untick if it's actually text-only."
                      >
                        ⚠ figure expected — none captured
                      </span>
                    )}
                    {q.solution_figure_missing && (
                      <span
                        className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400"
                        title="The worked solution was flagged as having a figure, but none was captured. Paste it under the solution, or ignore if the solution is text-only."
                      >
                        ⚠ solution figure — none captured
                      </span>
                    )}
                    {q.options_are_figures && (
                      <span
                        className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-400"
                        title="The answer choices are pictures (mirror-image / non-verbal). Check the captured image includes all four option figures."
                      >
                        figure options — check all captured
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
                      captured the whole question + options. When the AI cropped a figure
                      wrong (or missed one), replace it here: paste a screenshot, drop, or
                      pick a file. Always available so any question can get a figure added. */}
                  <QuestionImages
                    images={q.images}
                    kind="question"
                    expected={!!q.figure_missing || !!q.options_are_figures}
                    onChange={(imgs) => setQuestions((qs) => qs.map((x, j) => (j === i ? applyImages(x, imgs) : x)))}
                  />
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
                      {/* A figure can live in the model answer too (a labelled diagram the
                          grader/student needs) — paste or fix it here. */}
                      <p className="pt-1 text-[10px] uppercase text-slate-500">Solution figure (optional)</p>
                      <QuestionImages
                        images={q.images}
                        kind="explanation"
                        expected={!!q.solution_figure_missing}
                        onChange={(imgs) => setQuestions((qs) => qs.map((x, j) => (j === i ? applyImages(x, imgs) : x)))}
                      />
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
                      {/* A worked solution sometimes has its own diagram (construction,
                          graph) — capture it here; it renders with the solution. */}
                      <p className="pt-1 text-[10px] uppercase text-slate-500">Solution figure (optional)</p>
                      <QuestionImages
                        images={q.images}
                        kind="explanation"
                        expected={!!q.solution_figure_missing}
                        onChange={(imgs) => setQuestions((qs) => qs.map((x, j) => (j === i ? applyImages(x, imgs) : x)))}
                      />
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

type QImage = { index: number; filename: string; type?: "question" | "explanation" };

// Upload one pasted/dropped/selected image to ImageKit via the import image route;
// returns its URL, or null on failure.
async function uploadReviewImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.set("image", file);
  const res = await fetch("/api/coaching/questions/import/image", { method: "POST", body: fd });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.url ?? null;
}

const isExplanationImg = (im: QImage) => im.type === "explanation";

// Apply an edited images array to a question and clear the "figure expected but
// missing" flags for whichever kinds are now present. Shared by the question and
// solution image editors (both hand back the full, retyped images array).
function applyImages(q: ParsedQ, imgs: QImage[]): ParsedQ {
  const hasQuestionImg = imgs.some((im) => !isExplanationImg(im));
  const hasSolutionImg = imgs.some((im) => isExplanationImg(im));
  return {
    ...q,
    images: imgs.length ? imgs : null,
    figure_missing: hasQuestionImg ? false : q.figure_missing,
    solution_figure_missing: hasSolutionImg ? false : q.solution_figure_missing,
  };
}

// Figure editor for ONE kind of image (the question's own figure, or a figure in
// its worked solution). Both kinds live in the single `images` array tagged by
// `type`; this component edits only its slice and merges back the rest, so a
// question and a solution editor can coexist on the same question. Shows captured
// figures and lets the admin fix a bad crop (or add a missing one) by pasting a
// screenshot, dropping an image, or picking a file. Collapsed by default for
// plain questions; auto-open when its figure exists or one was expected.
function QuestionImages({
  images,
  kind,
  expected,
  onChange,
}: {
  images?: QImage[] | null;
  kind: "question" | "explanation";
  expected: boolean;
  onChange: (imgs: QImage[]) => void;
}) {
  const all = images ?? [];
  const wantExplanation = kind === "explanation";
  // This editor's images vs. the other kind's (kept untouched and merged back).
  const mine = all.filter((im) => isExplanationImg(im) === wantExplanation);
  const others = all.filter((im) => isExplanationImg(im) !== wantExplanation);

  const [open, setOpen] = useState(mine.length > 0 || expected);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const isQuestion = kind === "question";

  // Recombine this editor's images with the other kind's, reindex the whole
  // array sequentially, and bubble up.
  function commit(nextMine: QImage[]) {
    const tagged = nextMine.map((im) => ({ ...im, type: (wantExplanation ? "explanation" : "question") as QImage["type"] }));
    onChange([...others, ...tagged].map((im, i) => ({ ...im, index: i })));
  }

  // Upload each picked image and append to this kind's list.
  async function addFiles(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    setErr(null);
    setBusy(true);
    try {
      const next = [...mine];
      for (const f of imgs) {
        const url = await uploadReviewImage(f);
        if (url) next.push({ index: next.length, filename: url, type: wantExplanation ? "explanation" : "question" });
        else setErr("Upload failed — try again.");
      }
      commit(next);
    } finally {
      setBusy(false);
    }
  }

  function remove(i: number) {
    commit(mine.filter((_, j) => j !== i));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-2 inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-amber-500 hover:text-amber-300"
      >
        <ImageIcon className="h-3.5 w-3.5" /> {isQuestion ? "Add / fix question image" : "Add / fix solution image"}
      </button>
    );
  }

  return (
    <div className="mb-2 space-y-2">
      {mine.map((img, ii) => (
        <div key={ii} className="relative overflow-hidden rounded-lg border border-slate-700 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.filename}
            alt={`${isQuestion ? "question" : "solution"} image ${ii + 1}`}
            className="mx-auto max-h-80 w-auto object-contain"
          />
          <button
            type="button"
            onClick={() => remove(ii)}
            title="Remove this image"
            className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Paste / drop / pick zone. onPaste only fires while focused, so the zone is
          focusable and tells the admin to click it first. */}
      <div
        tabIndex={0}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files);
          if (files.length) {
            e.preventDefault();
            addFiles(files);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={`flex flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-3 text-center text-xs outline-none transition focus:border-amber-500 ${
          dragOver ? "border-amber-500 bg-amber-500/5" : "border-slate-700 bg-slate-950"
        }`}
      >
        {busy ? (
          <span className="flex items-center gap-2 text-amber-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </span>
        ) : (
          <>
            <span className="text-slate-400">
              Click here, then paste a screenshot (Ctrl/Cmd+V) — or drop an image, or{" "}
              <label className="cursor-pointer text-amber-400 hover:underline">
                choose a file
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                />
              </label>
            </span>
            {mine.length > 0 && (
              <span className="text-[11px] text-slate-600">New images are added below the existing one(s).</span>
            )}
          </>
        )}
        {err && <span className="text-red-400">{err}</span>}
      </div>
    </div>
  );
}
