"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Upload,
  Loader2,
  FileText,
  ImageIcon,
  UploadCloud,
  GraduationCap,
  ClipboardList,
  Tag,
  Info,
  Check,
  CheckSquare,
  NotebookPen,
  Cpu,
  ShieldCheck,
  Languages,
  Undo2,
} from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

// Icon-prefixed field used on the redesigned upload step (left padding leaves
// room for the absolutely-positioned icon).
const fieldCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.02] py-2.5 pl-11 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-500/60";

// "What does this paper contain?" choices. Each carries its own icon + accent
// colour for the icon tile; the selected card always reads amber.
const CONTENT_OPTS = [
  { v: "objective", label: "MCQ / Numerical", hint: "Options or numeric answers", Icon: CheckSquare, accent: "amber" },
  { v: "subjective", label: "Subjective", hint: "Written answers + model solutions", Icon: NotebookPen, accent: "sky" },
  { v: "mixed", label: "Mixed — auto-detect", hint: "AI classifies each question automatically", Icon: Cpu, accent: "violet" },
] as const;

// Where DeepSeek passes land when the DeepSeek toggle is off — mirrors
// DEEPSEEK_OFF_MODEL in lib/coachingImport.ts.
const DEEPSEEK_OFF_MODEL = "gemini-3.5-flash-lite";

// Selectable verifier models — mirrors VERIFY_MODEL_OPTIONS in lib/coachingImport.ts
// (the server re-validates against that allowlist). First entry is the default.
const VERIFY_MODELS = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", hint: "Default · strong reader, multimodal" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", hint: "Different vendor · decorrelated errors, cheap" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", hint: "Same as extractor · cheapest" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash", hint: "Previous default" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", hint: "Older generation" },
] as const;

// Selectable answer-key models — mirrors GENERATION_MODEL_OPTIONS in
// lib/coachingImport.ts. Drives the Pass-2 pass that READS the printed answer key off
// the page. Gemini-only: it needs to see the images, and DeepSeek is text-only.
// (V4 Pro's reasoning powers the worked SOLUTIONS via "Compare two solutions" below.)
const GENERATION_MODELS = [
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", hint: "Default · reads the printed key" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", hint: "Stronger reader" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", hint: "Older generation" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash", hint: "Previous stronger reader" },
] as const;

const ACCENT: Record<string, string> = {
  amber: "bg-amber-500/15 text-amber-400",
  sky: "bg-sky-500/15 text-sky-400",
  violet: "bg-violet-500/15 text-violet-400",
};

// Pill toggle switch shared by the two AI-pass rows on the upload step.
function Switch({ checked }: { checked: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      className={`relative mt-0.5 inline-block h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-amber-500" : "bg-slate-700"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </span>
  );
}

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
  // Comparison mode: a second model's worked solution, shown beside `solution` so the
  // admin keeps the better one. Stripped before commit.
  solution_alt?: string | null;
  solution_alt_hindi?: string | null;
  solution_alt_model?: string;
  blind_answer?: string; // V4's own (blind) answer — for the agreement badge
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
  // The seeded exam/class catalog — offered as a datalist on the exam input so the
  // typed value matches a catalog key exactly. Section lookup on the server is an
  // exact (now case-insensitive) match on this string; a free-typed mismatch is
  // why sections come back empty.
  const [examOptions, setExamOptions] = useState<string[]>([]);
  const [set, setSet] = useState("");
  const [qtype, setQtype] = useState<"objective" | "subjective" | "mixed">("objective");
  // Independent answer verification is the expensive pass (a stronger model
  // re-solves every objective question blind). Off by default — flash-lite
  // extraction is reliable on easy papers; flip on for hard papers where a wrong
  // answer key is costly.
  const [verify, setVerify] = useState(false);
  // Which model runs the verify/review pass when it's on. Default = Gemini 3 Flash.
  const [verifyModel, setVerifyModel] = useState<string>(VERIFY_MODELS[0].id);
  // Answer-key model (Pass 2, reads the printed key). Default = Gemini flash-lite.
  const [answerModel, setAnswerModel] = useState<string>(GENERATION_MODELS[0].id);
  // DeepSeek V4 Pro powers the always-on blind cross-check (and is offered as a
  // verifier). ON by default — a different vendor makes its mistakes decorrelated
  // from Gemini's. Off keeps the cross-check running on gemini-3.5-flash-lite.
  const [deepseek, setDeepseek] = useState(true);
  // Turning DeepSeek off also has to move a DeepSeek verifier pick off it, or the
  // select would render blank against a filtered option list (the server would fall
  // back anyway, but the UI would be lying about what's going to run).
  const toggleDeepseek = () => {
    const next = !deepseek;
    setDeepseek(next);
    if (!next && verifyModel.startsWith("deepseek")) setVerifyModel(DEEPSEEK_OFF_MODEL);
  };
  // Hindi translation is opt-in (default OFF) — most papers are English-only and
  // translating every field roughly doubles the token cost. Turn on for bilingual papers.
  const [hindi, setHindi] = useState(false);
  const [topics, setTopics] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Drag-highlight for the image drop zone on the upload step.
  const [imgDragOver, setImgDragOver] = useState(false);

  // Append (never replace) image files — so pasting/dropping screenshots one at a
  // time accumulates instead of clobbering the previous ones. Non-images ignored.
  function addImageFiles(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length) setImages((prev) => [...prev, ...imgs]);
  }

  // Paste-anywhere: while on the upload step, Ctrl/Cmd+V drops clipboard
  // screenshots straight into the image list — no need to focus a specific box.
  // Text pastes carry no files, so typing in the exam/set inputs is unaffected.
  useEffect(() => {
    if (phase !== "upload" || busy) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        setImages((prev) => [...prev, ...files]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [phase, busy]);

  // Load the distinct exam/class catalog (global + this coaching's) once, to
  // suggest exact catalog keys on the exam input. Without an exact match the
  // server finds no sections for the paper.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/coaching/exam-sections");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setExamOptions((data.exams ?? []) as string[]);
        }
      } catch {
        /* non-fatal — the input still works as free text */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Object-URL thumbnails for the picked images; revoked when the list changes or
  // the modal unmounts so we don't leak blobs across re-renders.
  const imagePreviews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);
  useEffect(() => () => imagePreviews.forEach((u) => URL.revokeObjectURL(u)), [imagePreviews]);

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
    compare: "Generating comparison solutions…",
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
      if (verify) fd.set("verifyModel", verifyModel);
      fd.set("answerModel", answerModel);
      fd.set("deepseek", deepseek ? "1" : "0");
      fd.set("hindi", hindi ? "1" : "0");
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
          // Cross-check-only fields never get saved — the chosen text is already in `solution`.
          delete copy.solution_alt;
          delete copy.solution_alt_hindi;
          delete copy.solution_alt_model;
          delete copy.blind_answer;
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-6 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-y-auto rounded-3xl border border-white/[0.08] bg-[#08090d] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400">
              <UploadCloud className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Bulk import {phase === "review" ? `· review (${includedCount})` : ""}
              </h2>
              {phase === "upload" && (
                <p className="mt-0.5 max-w-2xl text-[13px] leading-snug text-slate-400">
                  Upload a question paper or PDF. We extract the questions and tag each with a
                  section. You review before saving. Hindi translation is optional (off by default).
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-400 hover:bg-white/[0.07] hover:text-white"
          >
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
          <div className="space-y-3">
            {/* Meta inputs — each with an icon prefix and an info hint. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                  Exam / Class <Info className="h-3.5 w-3.5 text-slate-500" />
                </label>
                <div className="relative mt-1.5">
                  <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-400/80" />
                  <input
                    value={exam}
                    onChange={(e) => setExam(e.target.value)}
                    list="import-exam-options"
                    className={fieldCls}
                    placeholder="e.g. SSC CGL"
                  />
                  <datalist id="import-exam-options">
                    {examOptions.map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                </div>
                {examOptions.length > 0 && exam.trim() && !examOptions.some((x) => x.toLowerCase() === exam.trim().toLowerCase()) && (
                  <p className="mt-1 text-[11px] text-amber-400/90">
                    No section catalog for &ldquo;{exam.trim()}&rdquo; — pick a listed exam/class to auto-tag sections.
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                  Set / Mock <Info className="h-3.5 w-3.5 text-slate-500" />
                </label>
                <div className="relative mt-1.5">
                  <ClipboardList className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-400/80" />
                  <input value={set} onChange={(e) => setSet(e.target.value)} className={fieldCls} placeholder="e.g. Mock 5" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                  Topic list (optional, comma-separated) <Info className="h-3.5 w-3.5 text-slate-500" />
                </label>
                <div className="relative mt-1.5">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-400/80" />
                  <input value={topics} onChange={(e) => setTopics(e.target.value)} className={fieldCls} placeholder="Kinematics, Optics…" />
                </div>
              </div>
            </div>

            {/* Pre-declared question type → focused (more accurate) extraction. */}
            <div>
              <p className="text-sm font-semibold text-white">What does this paper contain?</p>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {CONTENT_OPTS.map((o) => {
                  const selected = qtype === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setQtype(o.v)}
                      className={`relative overflow-hidden rounded-2xl border p-3 text-left transition ${
                        selected
                          ? "border-amber-500 bg-amber-500/[0.08] shadow-[0_0_30px_rgba(245,158,11,0.12)]"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-0 top-0 h-0 w-0 border-r-[34px] border-t-[34px] border-r-amber-500 border-t-transparent">
                          <Check className="absolute -right-8 top-0.5 h-3 w-3 text-black" strokeWidth={3} />
                        </span>
                      )}
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ACCENT[o.accent]}`}>
                        <o.Icon className="h-5 w-5" />
                      </span>
                      <div className="mt-2.5 text-[15px] font-semibold text-white">{o.label}</div>
                      <div className="mt-0.5 text-[13px] text-slate-400">{o.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Answer-key model — reads the printed answers off the page (a vision task,
                so Gemini only). V4 Pro is text-only and can't read the page, so it powers
                the worked SOLUTIONS via "Compare two solutions" below instead. */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <label className="flex items-center gap-1.5 text-[15px] font-semibold text-white">
                <Cpu className="h-[18px] w-[18px] text-amber-400/80" /> Answer-key model
              </label>
              <p className="mt-0.5 text-[13px] leading-snug text-slate-400">
                Reads the printed answers/solutions off the paper. Gemini only — V4 Pro can&apos;t see the page.
              </p>
              <select
                value={answerModel}
                onChange={(e) => setAnswerModel(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60 sm:max-w-md"
              >
                {GENERATION_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.hint}
                  </option>
                ))}
              </select>

              {/* The blind cross-check itself always runs; this toggle only picks WHO
                  runs it. On = DeepSeek V4 Pro (different vendor → decorrelated
                  mistakes). Off = gemini-3.5-flash-lite, same family as the extractor. */}
              <div
                onClick={toggleDeepseek}
                className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
              >
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-white">
                    Blind cross-check with DeepSeek V4 Pro
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-400">
                    {deepseek ? (
                      <>
                        V4 Pro independently re-solves every <em>text</em> question (blind — never shown the answer) and
                        becomes the default solution; review flags where its answer differs. Figure questions stay on
                        Gemini (V4 can&apos;t see images). Turn on Verify below for a 3-way check.
                      </>
                    ) : (
                      <>
                        Off — the cross-check still runs, but on <strong>gemini-3.5-flash-lite</strong> instead. Same
                        family as the extractor, so its mistakes are more correlated and it&apos;ll catch fewer bad
                        answers. Any DeepSeek verifier pick below falls back to it too.
                      </>
                    )}
                  </p>
                </div>
                <Switch checked={deepseek} />
              </div>
            </div>

            {/* Expensive AI passes — both off by default, grouped in one card. */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              {/* Answer verification toggle — the expensive Gemini pass. */}
              <div
                onClick={() => setVerify((v) => !v)}
                className="flex cursor-pointer items-center gap-3 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-white">Verify answers (independent AI re-solve)</div>
                  <p className="mt-0.5 text-[13px] leading-snug text-slate-400">
                    Off trusts the extracted key. On re-solves each question blind &amp; flags disagreements.
                  </p>
                </div>
                <Switch checked={verify} />
              </div>

              {/* Verifier model picker — only relevant when verify is on. The server
                  re-validates against its allowlist. Use a different vendor than the
                  Gemini extractor (e.g. DeepSeek) for decorrelated second opinions. */}
              {verify && (
                <div className="border-t border-white/10 px-3 pb-3 pt-2.5 pl-[60px]">
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300">
                    <Cpu className="h-3.5 w-3.5 text-amber-400/80" /> Verifier model
                  </label>
                  <select
                    value={verifyModel}
                    onChange={(e) => setVerifyModel(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60 sm:max-w-md"
                  >
                    {VERIFY_MODELS.filter((m) => deepseek || !m.id.startsWith("deepseek")).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.hint}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mx-3.5 h-px bg-white/10" />

              {/* Hindi translation toggle — off by default. */}
              <div
                onClick={() => setHindi((v) => !v)}
                className="flex cursor-pointer items-center gap-3 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Languages className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-white">Generate Hindi translation</div>
                  <p className="mt-0.5 text-[13px] leading-snug text-slate-400">
                    Off is English only. On also translates questions, options &amp; solutions to Hindi.
                  </p>
                </div>
                <Switch checked={hindi} />
              </div>
            </div>

            {/* Upload zones — paste/drop/browse images, or pick a PDF. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setImgDragOver(true);
                }}
                onDragLeave={() => setImgDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImgDragOver(false);
                  addImageFiles(Array.from(e.dataTransfer.files));
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-5 py-3.5 text-center transition ${
                  imgDragOver ? "border-amber-500 bg-amber-500/10" : "border-amber-500/40 bg-amber-500/[0.03] hover:border-amber-500"
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-500/40 text-amber-400">
                  <ImageIcon className="h-5 w-5" />
                </span>
                <span className="text-[15px] font-bold text-white">
                  {images.length ? `${images.length} image(s) added` : "Add images"}
                </span>
                <span className="text-[13px] text-slate-400">
                  Paste (Ctrl/Cmd+V), drop, or{" "}
                  <label className="cursor-pointer font-semibold text-amber-400 hover:underline">
                    browse
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addImageFiles(Array.from(e.target.files ?? []));
                        e.target.value = ""; // allow re-picking the same file
                      }}
                    />
                  </label>
                </span>
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-sky-500/40 bg-sky-500/[0.03] px-5 py-3.5 text-center hover:border-sky-500">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-500/40 text-sky-400">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="text-[15px] font-bold text-white">{pdf ? pdf.name : "Choose a PDF"}</span>
                <span className="text-[13px] text-slate-400">PDF of the question paper (max 50MB)</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            {/* Thumbnails of the picked/pasted images, in order, each removable. */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((f, i) => (
                  <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-700 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreviews[i]} alt={f.name || `image ${i + 1}`} className="h-full w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      title="Remove this image"
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="absolute bottom-0 left-0 rounded-tr bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setImages([])}
                  className="self-center text-xs text-slate-400 hover:text-red-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Footer actions. */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]"
              >
                <Undo2 className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={runExtract}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-6 py-3 text-base font-bold text-black shadow-lg shadow-amber-500/25 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 sm:max-w-2xl"
              >
                {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Extracting…</> : <><Upload className="h-5 w-5" /> Extract questions</>}
              </button>
            </div>
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
                    {/* Blind cross-check: recorded answer (Flash) vs V4 Pro's independent
                        solve, plus the Verify model when it ran. Green = agree, red = differ. */}
                    {(q.question_type === "mcq" || q.question_type === "nat") && q.blind_answer && (() => {
                      const flash = (q.correct_answer ?? "").trim();
                      const v4 = (q.blind_answer ?? "").trim();
                      const ver = (q.verify_answer ?? "").trim();
                      const norm = (s: string) => s.toUpperCase().replace(/[$`\s]/g, "");
                      const vals = [flash, v4, ver].filter(Boolean);
                      const agree = vals.length > 1 && vals.every((x) => norm(x) === norm(vals[0]));
                      const parts = [`Flash: ${flash || "—"}`, `V4: ${v4 || "—"}`, ...(ver ? [`Verify: ${ver}`] : [])];
                      return (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${agree ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}
                          title={agree ? "Independent solve(s) agree with the recorded answer." : "An independent solve disagrees with the recorded answer — check which is right."}
                        >
                          {agree ? "✓ " : "⚠ "}{parts.join(" · ")}
                        </span>
                      );
                    })()}
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
                      {q.solution_alt && (
                        <AltSolutionCard
                          altText={q.solution_alt}
                          altHindi={q.solution_alt_hindi}
                          model={q.solution_alt_model}
                          inUse={(q.solution ?? "").trim() === (q.solution_alt ?? "").trim()}
                          onUse={() =>
                            setQuestions((qs) =>
                              qs.map((x, j) =>
                                j === i
                                  ? { ...x, solution: x.solution_alt ?? x.solution, solution_hindi: x.solution_alt_hindi ?? x.solution_hindi }
                                  : x
                              )
                            )
                          }
                        />
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
                      {q.solution_alt && (
                        <AltSolutionCard
                          altText={q.solution_alt}
                          altHindi={q.solution_alt_hindi}
                          model={q.solution_alt_model}
                          inUse={(q.solution ?? "").trim() === (q.solution_alt ?? "").trim()}
                          onUse={() =>
                            setQuestions((qs) =>
                              qs.map((x, j) =>
                                j === i
                                  ? { ...x, solution: x.solution_alt ?? x.solution, solution_hindi: x.solution_alt_hindi ?? x.solution_hindi }
                                  : x
                              )
                            )
                          }
                        />
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

// Comparison mode: the alternate model's worked solution, shown beside the primary
// one with a "Use this" button that copies it into `solution` (the saved field).
function AltSolutionCard({
  altText,
  altHindi,
  model,
  inUse,
  onUse,
}: {
  altText: string;
  altHindi?: string | null;
  model?: string;
  inUse: boolean;
  onUse: () => void;
}) {
  return (
    <div className="rounded-lg border border-sky-500/30 bg-sky-500/[0.05] p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase text-sky-300">
          Alternate solution{model ? ` · ${model}` : ""}
        </p>
        <button
          type="button"
          onClick={onUse}
          disabled={inUse}
          className="shrink-0 rounded border border-sky-500/40 px-2 py-0.5 text-[11px] font-medium text-sky-300 transition hover:bg-sky-500/15 disabled:opacity-40"
          title={inUse ? "This is the solution currently kept" : "Replace the kept solution with this one"}
        >
          {inUse ? "✓ In use" : "Use this solution"}
        </button>
      </div>
      <MathRenderer content={altText} className="text-xs text-slate-300" />
      {String(altHindi ?? "").trim() && (
        <MathRenderer content={altHindi!} className="mt-1 text-xs text-slate-400" />
      )}
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
