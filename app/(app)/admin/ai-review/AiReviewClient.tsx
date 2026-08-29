"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getQuestionsForReview,
  getReviewExamTypes,
  getReviewTopics,
  getMockReviewFilters,
  reviewQuestionAnswer,
  solveBatchReviewQuestions,
  commitReviewBatch,
  resolveReviewMismatch,
  resolveExplanation,
} from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";
import { displayBranch } from "@/lib/seo";
import { getImageUrl } from "@/lib/imageUtils";
import { AI_MODEL_OPTIONS, type AIModel } from "@/lib/aiModels";

type QuestionImage = { index: number; filename: string; type?: string };
type ReviewSource = "PYQ" | "GeneratedQuestion" | "Mock";

type ReviewRow = {
  id: string;
  question_text: string;
  options: any;
  correct_answer: string;
  question_type: string;
  explanation: string | null;
  questionType: ReviewSource;
  subject: string;
  topic?: string;
  year?: number | null;
  images?: QuestionImage[] | null;
  mockTestId: string | null;
};

type InitialData = Awaited<ReturnType<typeof getQuestionsForReview>>;
type ExamTypeOption = { examType: string; branch: string | null };
type TopicOption = { topic: string; subject: string };

interface Props {
  initialExamTypes: ExamTypeOption[];
  initialData: InitialData;
}

const SOURCE_LABELS: Record<ReviewSource, string> = {
  PYQ: "PYQ",
  GeneratedQuestion: "Generated",
  Mock: "Mock",
};

// Handles both single ("A") and multi ("A, C") correct_answer formats.
function isCorrectOption(optionKey: string, optionLabel: string, correctAnswer: string): boolean {
  const correct = new Set((correctAnswer || "").split(",").map(s => s.trim().toUpperCase()));
  return correct.has(optionKey.toUpperCase()) || correct.has(optionLabel.toUpperCase());
}

function QuestionImages({ images, compact = false }: { images?: QuestionImage[] | null; compact?: boolean }) {
  if (!images || !Array.isArray(images) || images.length === 0) return null;
  const qImages = images.filter(img => img && img.filename && img.type !== "explanation");
  if (qImages.length === 0) return null;
  return (
    <div className={compact ? "mt-2 flex gap-2 flex-wrap" : "mt-3 flex flex-col gap-3"}>
      {qImages.map(img => (
        <img
          key={img.index}
          src={getImageUrl(img.filename)}
          alt=""
          className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-black/30 object-contain"
          style={compact ? { maxHeight: 96, maxWidth: 160 } : { maxHeight: 400, width: "100%" }}
        />
      ))}
    </div>
  );
}

type ExplanationVerdict = "ok" | "error" | "no_derive" | "incomplete" | "skipped";

type ReviewResult = {
  verifyText: string;
  aiDetectedAnswer: string | null;
  isMismatch: boolean;
  explanationVerdict: ExplanationVerdict;
  explanationIssue: string | null;
  explanationReviewText: string;
  explanationFlagged: boolean;
  usage: { input: number; output: number; thoughts: number };
};

const EXPL_VERDICT_LABEL: Record<ExplanationVerdict, string> = {
  ok: "OK",
  error: "Has error",
  no_derive: "Doesn't derive answer",
  incomplete: "Incomplete",
  skipped: "No explanation",
};

export default function AiReviewClient({ initialExamTypes, initialData }: Props) {
  const [source, setSource] = useState<ReviewSource>("PYQ");
  const [examTypes, setExamTypes] = useState<ExamTypeOption[]>(initialExamTypes);
  const [questions, setQuestions] = useState<ReviewRow[]>(initialData.rows);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedExam, setSelectedExam] = useState<string>(
    initialExamTypes.length > 0 ? `${initialExamTypes[0].examType}::${initialExamTypes[0].branch ?? ""}` : "GATE::CSE",
  );
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  // Mock papers are filtered by title/year instead of subject/topic.
  const [mockFilters, setMockFilters] = useState<{ title: string; year: number | null }[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [aiModel, setAiModel] = useState<AIModel>("gemini");

  const parseExam = (val: string) => {
    const [examType, branch] = val.split("::");
    return { examType, branch: branch || null };
  };

  // Loads the right filter options for the source: subject/topic for PYQ &
  // Generated, title/year for Mock papers.
  const loadFilters = async (src: ReviewSource, examVal: string) => {
    const { examType, branch } = parseExam(examVal);
    setLoadingTopics(true);
    try {
      if (src === "Mock") {
        setMockFilters(await getMockReviewFilters(examType, branch));
      } else {
        setTopics(await getReviewTopics(src, examType, branch));
      }
    } finally {
      setLoadingTopics(false);
    }
  };

  // Load filters for the default exam on first render.
  useEffect(() => {
    loadFilters("PYQ", selectedExam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subjects = Array.from(new Set(topics.map(t => t.subject))).sort();
  const filteredTopics = selectedSubject ? topics.filter(t => t.subject === selectedSubject) : topics;
  const years = Array.from(new Set(mockFilters.map(m => m.year).filter((y): y is number => y != null))).sort((a, b) => b - a);
  const filteredTitles = selectedYear ? mockFilters.filter(m => String(m.year) === selectedYear) : mockFilters;

  // Switching source re-pulls its exam types + first page.
  const handleSourceChange = async (src: ReviewSource) => {
    if (src === source || batchRunning) return;
    setSource(src);
    setSelectedSubject("");
    setSelectedTopic("");
    setSelectedYear("");
    setSelectedTitle("");
    setTopics([]);
    setMockFilters([]);
    setLoading(true);
    try {
      const ets = await getReviewExamTypes(src);
      setExamTypes(ets);
      const examVal = ets.length > 0 ? `${ets[0].examType}::${ets[0].branch ?? ""}` : "GATE::CSE";
      setSelectedExam(examVal);
      const { examType, branch } = parseExam(examVal);
      const [data] = await Promise.all([
        getQuestionsForReview(src, 0, 50, examType, branch, null, null),
        loadFilters(src, examVal),
      ]);
      setQuestions(data.rows);
      setTotal(data.total);
      setPage(0);
    } finally {
      setLoading(false);
    }
  };

  const handleExamChange = async (val: string) => {
    setSelectedExam(val);
    setSelectedSubject("");
    setSelectedTopic("");
    setSelectedYear("");
    setSelectedTitle("");
    await loadFilters(source, val);
  };

  const fetchPage = async (nextPage: number, append: boolean) => {
    const { examType, branch } = parseExam(selectedExam);
    setLoading(true);
    try {
      const data = await getQuestionsForReview(
        source, nextPage, 50, examType, branch,
        selectedSubject || null, selectedTopic || null,
        source === "Mock" ? (selectedTitle || null) : null,
        source === "Mock" && selectedYear ? Number(selectedYear) : null,
      );
      setQuestions(prev => (append ? [...prev, ...data.rows] : data.rows));
      setTotal(data.total);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  };

  const removeFromList = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
  };

  // ── Batch run ──────────────────────────────────────────────────────────────
  type BatchEntry = {
    id: string;
    label: string;
    status: "ok" | "fail";
    isMismatch?: boolean;
    aiDetectedAnswer?: string | null;
    verifyText?: string;
    explanationVerdict?: ExplanationVerdict;
    explanationIssue?: string | null;
    explanationReviewText?: string;
    explanationFlagged?: boolean;
    resolution?: { decision: "use_ai" | "keep_stored"; answer: string };
    explResolution?: { decision: "use_ai" | "keep_stored" | "edit" };
    question?: ReviewRow;
    tokens?: { input: number; output: number; thoughts: number };
  };
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [batchLog, setBatchLog] = useState<BatchEntry[]>([]);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, failed: 0, mismatches: 0, explFlags: 0 });
  const [detailEntry, setDetailEntry] = useState<BatchEntry | null>(null);
  const [batchCommitted, setBatchCommitted] = useState(false);
  const [batchCommitError, setBatchCommitError] = useState(false);
  const [committing, setCommitting] = useState(false);
  // Retained after a run so a failed DB commit can be retried from the staged
  // Redis verdicts WITHOUT re-running the (paid) AI prompts.
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  // Which batch entry has its inline explanation editor open, plus its draft text.
  const [editingExplId, setEditingExplId] = useState<string | null>(null);
  const [explDraft, setExplDraft] = useState("");
  // Ids resolved from the batch panel DURING a run. Refs, not state: the run loop
  // closes over its initial render, so a state value read at commit time would be
  // stale and the commit would re-flag questions the admin had just fixed.
  const resolvedAnswersRef = useRef<Set<string>>(new Set());
  const resolvedExplRef = useRef<Set<string>>(new Set());
  // Abort controller lets us stop the batch loop on unmount (page refresh) or
  // when the admin clicks the Stop button. In-flight server actions finish, but
  // no NEW chunks are dispatched.
  const batchAbortRef = useRef<AbortController | null>(null);

  // Cleanup: abort any running batch when the component unmounts.
  useEffect(() => {
    return () => { batchAbortRef.current?.abort(); };
  }, []);

  // Resolve an answer mismatch straight from the batch detail popup.
  const handleResolveEntry = async (entry: BatchEntry, decision: "use_ai" | "keep_stored") => {
    if (!entry.question) return;
    setResolvingId(entry.id);
    try {
      await resolveReviewMismatch(entry.id, entry.question.questionType, entry.question.mockTestId, decision, entry.aiDetectedAnswer ?? null);
      resolvedAnswersRef.current.add(entry.id);
      const resolution = { decision, answer: decision === "use_ai" ? (entry.aiDetectedAnswer ?? "") : entry.question.correct_answer };
      setBatchLog(prev => prev.map(x => (x.id === entry.id ? { ...x, resolution } : x)));
      setDetailEntry(prev => (prev && prev.id === entry.id ? { ...prev, resolution } : prev));
    } catch {
      /* surfaced via no state change; user can retry */
    } finally {
      setResolvingId(null);
    }
  };

  // Resolve a flagged explanation from the batch detail popup. "edit" saves the
  // admin's own corrected text; like the other two it clears the pending flag, so a
  // question fixed here never reaches /admin/reports.
  const handleResolveExplEntry = async (
    entry: BatchEntry,
    decision: "use_ai" | "keep_stored" | "edit",
    edited?: string,
  ) => {
    if (!entry.question) return;
    setResolvingId(entry.id);
    try {
      const text =
        decision === "use_ai" ? (entry.verifyText ?? null) : decision === "edit" ? (edited ?? "") : null;
      await resolveExplanation(entry.id, entry.question.questionType, entry.question.mockTestId, decision, text);
      // Keep the in-memory row in step with the DB so the panel shows the saved text.
      if (decision !== "keep_stored" && text) entry.question.explanation = text;
      resolvedExplRef.current.add(entry.id);
      setEditingExplId(null);
      const explResolution = { decision };
      setBatchLog(prev => prev.map(x => (x.id === entry.id ? { ...x, explResolution } : x)));
      setDetailEntry(prev => (prev && prev.id === entry.id ? { ...prev, explResolution } : prev));
    } catch {
      /* user can retry */
    } finally {
      setResolvingId(null);
    }
  };

  const handleStopBatch = useCallback(() => {
    batchAbortRef.current?.abort();
  }, []);

  const handleBatchRun = async () => {
    if (batchRunning || questions.length === 0) return;
    if (!window.confirm(`Blind-solve and review ${questions.length} shown ${SOURCE_LABELS[source]} questions using ${aiModel} (3 per prompt)?\n\nResults are staged in Redis during the run and written to the DB once at the end. Mismatches get flagged into Reports; reviewed questions won't reappear.`)) return;

    // Abort any previous run, then create a fresh controller for this one.
    batchAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    batchAbortRef.current = abortCtrl;

    // One batch id ties this run's verdicts together in Redis until we commit.
    const batchId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const batch = [...questions];
    setLastBatchId(batchId);
    setBatchRunning(true);
    setBatchDone(false);
    setBatchLog([]);
    resolvedAnswersRef.current = new Set();
    resolvedExplRef.current = new Set();
    setBatchCommitted(false);
    setBatchCommitError(false);
    setBatchProgress({ done: 0, total: batch.length, failed: 0, mismatches: 0, explFlags: 0 });

    let done = 0, failed = 0, mismatches = 0, explFlags = 0;
    let anySolved = false;
    const CHUNK_SIZE = 3;
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      // ── Check abort before dispatching a new chunk ──────────────────────
      if (abortCtrl.signal.aborted) break;

      const chunk = batch.slice(i, i + CHUNK_SIZE);
      try {
        // AI call: packs up to 3 questions into one prompt, stages verdicts in Redis.
        const results = await solveBatchReviewQuestions(
          batchId,
          chunk.map(q => ({
            id: q.id, source: q.questionType, mockTestId: q.mockTestId,
            question_text: q.question_text, options: q.options, correct_answer: q.correct_answer,
            question_type: q.question_type, explanation: q.explanation, images: q.images,
          })),
          aiModel,
        );

        // Check abort again after the call returns — don't process stale results
        // if the user stopped or refreshed while we were waiting.
        if (abortCtrl.signal.aborted) break;

        for (let j = 0; j < chunk.length; j++) {
          const q = chunk[j];
          const res = results[j];
          const label = `${q.year ? q.year + " · " : ""}${q.subject} · ${q.question_text.substring(0, 60)}...`;
          if (res) {
            done++;
            anySolved = true;
            if (res.isMismatch) mismatches++;
            if (res.explanationFlagged) explFlags++;
            setBatchLog(prev => [...prev, {
              id: q.id, label, status: "ok", isMismatch: res.isMismatch,
              aiDetectedAnswer: res.aiDetectedAnswer, verifyText: res.verifyText,
              explanationVerdict: res.explanationVerdict, explanationIssue: res.explanationIssue,
              explanationReviewText: res.explanationReviewText, explanationFlagged: res.explanationFlagged,
              question: q, tokens: res.usage,
            }]);
            removeFromList(q.id);
          } else {
            failed++;
            setBatchLog(prev => [...prev, { id: q.id, label, status: "fail" }]);
          }
        }
      } catch {
        if (abortCtrl.signal.aborted) break;
        // Entire chunk failed — mark all questions in it as failed.
        for (const q of chunk) {
          failed++;
          const label = `${q.year ? q.year + " · " : ""}${q.subject} · ${q.question_text.substring(0, 60)}...`;
          setBatchLog(prev => [...prev, { id: q.id, label, status: "fail" }]);
        }
      }
      setBatchProgress({ done: done + failed, total: batch.length, failed, mismatches, explFlags });
      if (i + CHUNK_SIZE < batch.length && !abortCtrl.signal.aborted) {
        await new Promise(r => setTimeout(r, 2200));
      }
    }

    // Single DB write for the whole batch (skip if aborted with nothing solved).
    if (anySolved && !abortCtrl.signal.aborted) {
      await runCommit(batchId);
    }
    setBatchRunning(false);
    setBatchDone(true);
  };

  // Flushes already-staged Redis verdicts to the DB. Reused by the initial run
  // and the "Retry save" button — neither re-runs the AI prompts.
  const runCommit = async (batchId: string) => {
    setCommitting(true);
    setBatchCommitError(false);
    try {
      await commitReviewBatch(batchId, {
        answers: [...resolvedAnswersRef.current],
        explanations: [...resolvedExplRef.current],
      });
      setBatchCommitted(true);
    } catch {
      setBatchCommitError(true);
    } finally {
      setCommitting(false);
    }
  };

  const handleRetryCommit = async () => {
    if (!lastBatchId || committing) return;
    await runCommit(lastBatchId);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* DETAIL POPUP */}
      {detailEntry?.question && (() => {
        const e = detailEntry;
        const q = e.question!;
        const opts = (q.options as Record<string, string>) ?? {};
        const hasOpts = Object.keys(opts).length > 0;
        const optLabels: Record<string, string> = { "0": "A", "1": "B", "2": "C", "3": "D" };
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }} onClick={() => setDetailEntry(null)}>
            <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 flex flex-col max-h-[90vh]" onClick={ev => ev.stopPropagation()}>
              <div className="px-5 py-4 border-b dark:border-zinc-800 flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 px-2 py-0.5 rounded">{SOURCE_LABELS[q.questionType]}</span>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{q.subject}</span>
                  {q.topic && <span className="text-[10px] text-gray-400">{q.topic}</span>}
                  {e.isMismatch && <span className="text-[10px] font-black bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 px-2 py-0.5 rounded">⚠️ Answer</span>}
                  {!e.isMismatch && <span className="text-[10px] font-black bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400 px-2 py-0.5 rounded">✓ Answer OK</span>}
                  {e.explanationVerdict && e.explanationVerdict !== "skipped" && (
                    e.explanationFlagged
                      ? <span className="text-[10px] font-black bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 px-2 py-0.5 rounded">📖 {EXPL_VERDICT_LABEL[e.explanationVerdict]}</span>
                      : <span className="text-[10px] font-black bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400 px-2 py-0.5 rounded">📖 Explanation OK ✓</span>
                  )}
                </div>
                <button onClick={() => setDetailEntry(null)} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {e.tokens && (
                  <div className="flex items-center justify-between text-[11px] font-mono bg-purple-50/70 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-200/60 dark:border-purple-800/40">
                    <span className="font-bold">📊 Token Usage ({aiModel})</span>
                    <div className="flex gap-3">
                      <span>Input: <strong>{e.tokens.input.toLocaleString()}</strong></span>
                      <span>Output: <strong>{e.tokens.output.toLocaleString()}</strong></span>
                      {e.tokens.thoughts > 0 && (
                        <span>Thinking: <strong>{e.tokens.thoughts.toLocaleString()}</strong></span>
                      )}
                    </div>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  <MathRenderer content={q.question_text} />
                  <QuestionImages images={q.images} />
                </div>
                {hasOpts ? (
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(opts).map(([k, v]) => {
                      const label = optLabels[k] ?? k;
                      const isCorrect = isCorrectOption(k, label, q.correct_answer);
                      const cleanValue = String(v).replace(/^[A-D][.)]\s*/i, "");
                      return (
                        <div key={k} className={`px-4 py-2.5 rounded-xl text-sm border flex items-start gap-2 ${isCorrect ? "bg-green-50 border-green-300 dark:bg-green-500/10 dark:border-green-500/40 font-bold text-green-700 dark:text-green-400" : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-400"}`}>
                          <span className="font-black flex-shrink-0">{label}.</span>
                          <div className="flex-1 min-w-0"><MathRenderer content={cleanValue} /></div>
                          {isCorrect && <span className="ml-auto flex-shrink-0 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded font-black">✓ STORED</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Stored Answer</span>
                    <span className="px-4 py-2 rounded-xl text-sm font-black bg-green-50 border border-green-300 dark:bg-green-500/10 dark:border-green-500/40 text-green-700 dark:text-green-400"><MathRenderer content={q.correct_answer} /></span>
                    <span className="text-xs text-gray-400 italic">NAT</span>
                  </div>
                )}
                {e.isMismatch && !e.resolution && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm font-bold text-red-600 dark:text-red-400 flex flex-col gap-2">
                    <div>⚠️ AI's independent answer was <span className="underline">{e.aiDetectedAnswer}</span> but stored is <span className="underline">{q.correct_answer}</span>. Choose which to keep:</div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleResolveEntry(e, "keep_stored")}
                        disabled={resolvingId === e.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-50"
                      >Keep stored ({q.correct_answer})</button>
                      <button
                        onClick={() => handleResolveEntry(e, "use_ai")}
                        disabled={resolvingId === e.id || !e.aiDetectedAnswer}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                      >→ Use AI answer ({e.aiDetectedAnswer})</button>
                    </div>
                  </div>
                )}
                {e.resolution && (
                  <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-sm font-bold text-green-700 dark:text-green-400">
                    ✓ Resolved — stored answer is now <span className="underline">{e.resolution.answer}</span>{e.resolution.decision === "keep_stored" ? " (unchanged)" : " (updated to AI's answer)"}.
                  </div>
                )}
                {e.verifyText && (
                  <div>
                    <div className="text-xs font-bold text-purple-500 uppercase mb-2 flex items-center gap-2">
                      <span>🧠 Independent Solution (AI)</span>
                      {e.aiDetectedAnswer && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${e.isMismatch ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"}`}>answer: {e.aiDetectedAnswer}</span>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/20 text-sm text-gray-700 dark:text-gray-300 leading-relaxed"><MathRenderer content={e.verifyText} /></div>
                  </div>
                )}
                {e.explanationVerdict && e.explanationVerdict !== "skipped" && (
                  <div className={`px-4 py-3 rounded-xl text-sm font-bold border ${e.explanationFlagged ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400" : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400"}`}>
                    {e.explanationFlagged ? `📖 Explanation: ${EXPL_VERDICT_LABEL[e.explanationVerdict]}${e.explanationIssue ? ` — ${e.explanationIssue}` : ""}` : "✓ Explanation looks correct"}
                    {e.explanationFlagged && e.explanationReviewText && (
                      <div className="mt-2 text-xs font-normal text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap"><MathRenderer content={e.explanationReviewText} /></div>
                    )}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-blue-500 uppercase mb-2">📖 Stored Explanation (DB)</div>
                  {q.explanation ? (
                    <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 text-sm text-gray-700 dark:text-gray-300 leading-relaxed"><MathRenderer content={q.explanation} /></div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">No stored explanation for this question.</div>
                  )}
                </div>

                {/* Explanation choice — available for every question */}
                {/* Inline editor — correcting it here clears the pending flag, so the
                    question never lands on /admin/reports. */}
                {editingExplId === e.id && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-amber-500 uppercase">✏️ Editing explanation — LaTeX in $…$</div>
                    <textarea
                      value={explDraft}
                      onChange={ev => setExplDraft(ev.target.value)}
                      rows={10}
                      className="w-full p-3 rounded-xl bg-white dark:bg-zinc-950 border border-amber-300 dark:border-amber-500/40 text-xs text-gray-800 dark:text-gray-200 font-mono leading-relaxed outline-none focus:border-amber-500"
                    />
                    {explDraft.trim() && (
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-950/60 border border-gray-200 dark:border-zinc-800">
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Preview</div>
                        <MathRenderer content={explDraft} />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleResolveExplEntry(e, "edit", explDraft)} disabled={resolvingId === e.id || !explDraft.trim()} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">{resolvingId === e.id ? "Saving…" : "💾 Save explanation"}</button>
                      <button onClick={() => setEditingExplId(null)} disabled={resolvingId === e.id} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                      {e.verifyText && (
                        <button onClick={() => setExplDraft(e.verifyText!)} disabled={resolvingId === e.id} className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50">Load AI&apos;s solution</button>
                      )}
                    </div>
                  </div>
                )}
                {!e.explResolution ? (
                  editingExplId !== e.id && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Explanation:</span>
                      {q.explanation && (
                        <button onClick={() => handleResolveExplEntry(e, "keep_stored")} disabled={resolvingId === e.id} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-50">Keep stored</button>
                      )}
                      <button onClick={() => handleResolveExplEntry(e, "use_ai")} disabled={resolvingId === e.id || !e.verifyText} title={!e.verifyText ? "No AI solution text available" : "Store the AI's independent solution as the explanation"} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50">{q.explanation ? "→ Use AI's solution" : "+ Add AI's solution"}</button>
                      <button onClick={() => { setExplDraft(q.explanation || e.verifyText || ""); setEditingExplId(e.id); }} disabled={resolvingId === e.id} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-50">✏️ Edit &amp; fix</button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-xs font-bold text-green-700 dark:text-green-400">✓ {e.explResolution.decision === "edit" ? "Explanation saved — flag cleared, won't appear in Reports." : e.explResolution.decision === "use_ai" ? (q.explanation ? "Explanation replaced with AI's solution." : "AI's solution stored as explanation.") : "Kept stored explanation."}</div>
                    <button onClick={() => { setExplDraft(q.explanation || ""); setEditingExplId(e.id); }} className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline">edit again</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* BATCH MODAL */}
      {(batchRunning || batchDone) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 flex flex-col h-[90vh]">
            <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-sm font-black">{batchDone ? "✅" : "🧠"} Answer Review</h3>
              {batchDone && <button onClick={() => setBatchDone(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs">✕</button>}
            </div>
            <div className="px-4 pt-3">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>{batchProgress.done} / {batchProgress.total}</span>
                <span className="flex gap-3">
                  <span className="text-green-500">✅ {batchProgress.done - batchProgress.failed}</span>
                  {batchProgress.failed > 0 && <span className="text-red-500">❌ {batchProgress.failed}</span>}
                  {batchProgress.mismatches > 0 && <span className="text-amber-500">⚠️ {batchProgress.mismatches} ans</span>}
                  {batchProgress.explFlags > 0 && <span className="text-orange-500">📖 {batchProgress.explFlags} expl</span>}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-500 rounded-full transition-all duration-500" style={{ width: `${(batchProgress.done / Math.max(1, batchProgress.total)) * 100}%` }} />
              </div>
              {(() => {
                const batchTokens = batchLog.reduce(
                  (acc, e) => {
                    if (e.tokens) {
                      acc.input += e.tokens.input || 0;
                      acc.output += e.tokens.output || 0;
                      acc.thoughts += e.tokens.thoughts || 0;
                    }
                    return acc;
                  },
                  { input: 0, output: 0, thoughts: 0 }
                );
                return (
                  <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 bg-purple-50/60 dark:bg-purple-950/30 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-800/20 mt-2 font-mono">
                    <span className="font-bold text-purple-700 dark:text-purple-300">📊 Tokens ({aiModel})</span>
                    <span className="flex gap-2">
                      <span>In: <strong className="text-gray-800 dark:text-gray-200">{batchTokens.input.toLocaleString()}</strong></span>
                      <span>Out: <strong className="text-gray-800 dark:text-gray-200">{batchTokens.output.toLocaleString()}</strong></span>
                      {batchTokens.thoughts > 0 && (
                        <span>Think: <strong className="text-purple-600 dark:text-purple-400">{batchTokens.thoughts.toLocaleString()}</strong></span>
                      )}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-1">
              {[...batchLog].reverse().map((entry, i) => (
                <button key={i} onClick={() => entry.status === "ok" && setDetailEntry(entry)} className={`w-full flex items-center gap-2 text-[10px] text-gray-500 py-1.5 px-2 rounded border dark:border-zinc-800 bg-gray-50 dark:bg-black/20 text-left transition-colors ${entry.status === "ok" ? "hover:bg-purple-50 dark:hover:bg-purple-500/10 cursor-pointer" : "cursor-default"}`}>
                  <span className="flex-shrink-0">{entry.status === "ok" ? "✅" : "❌"}</span>
                  {entry.isMismatch && <span className="flex-shrink-0 text-[9px] font-black bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 px-1.5 py-0.5 rounded">⚠️ ANS</span>}
                  {entry.explanationFlagged && <span className="flex-shrink-0 text-[9px] font-black bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 px-1.5 py-0.5 rounded">📖 EXPL</span>}
                  <span className="truncate flex-1">{entry.label}</span>
                  {entry.tokens && (
                    <span className="flex-shrink-0 text-[9px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                      {entry.tokens.input}in / {entry.tokens.output}out{entry.tokens.thoughts > 0 ? ` / ${entry.tokens.thoughts}t` : ""}
                    </span>
                  )}
                  {entry.status === "ok" && <span className="flex-shrink-0 text-gray-300 dark:text-zinc-600 text-[8px]">↗</span>}
                </button>
              ))}
              {batchDone && (
                <div className={`mt-4 p-4 rounded-xl border text-center ${batchCommitError ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" : "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20"}`}>
                  {batchCommitError ? (
                    <>
                      <div className="text-sm font-bold text-red-700 dark:text-red-300">Saved to Redis, but DB commit failed</div>
                      <div className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                        Verdicts are safe in Redis (6h). Retry the save below — this re-uses the staged results and does not re-run the AI.
                      </div>
                      <button
                        onClick={handleRetryCommit}
                        disabled={committing || !lastBatchId}
                        className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {committing ? "Saving…" : "Retry save"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-purple-800 dark:text-purple-300">
                        {batchCommitted ? "Review Complete & Saved!" : "Review Complete!"}
                      </div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
                        {batchProgress.done - batchProgress.failed} reviewed · {batchProgress.mismatches} answer + {batchProgress.explFlags} explanation flags into Reports
                        {batchCommitted ? " · written to DB in one commit" : ""}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SOURCE TOGGLE */}
      <div className="flex gap-2">
        {(["PYQ", "GeneratedQuestion", "Mock"] as ReviewSource[]).map(s => (
          <button
            key={s}
            onClick={() => handleSourceChange(s)}
            disabled={batchRunning}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${source === s ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"}`}
          >
            {SOURCE_LABELS[s]}
          </button>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border dark:border-zinc-700">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Exam / Branch</label>
          <select value={selectedExam} onChange={e => handleExamChange(e.target.value)} disabled={batchRunning || examTypes.length === 0} className="px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none min-w-[160px]">
            {examTypes.length === 0 && <option>— none —</option>}
            {examTypes.map(e => (
              <option key={`${e.examType}::${e.branch ?? ""}`} value={`${e.examType}::${e.branch ?? ""}`}>
                {e.examType}{displayBranch(e.branch) ? ` (${displayBranch(e.branch)})` : ""}
              </option>
            ))}
          </select>
        </div>
        {source === "Mock" ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Year</label>
              <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedTitle(""); }} disabled={batchRunning || loadingTopics || years.length === 0} className="px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none min-w-[120px]">
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Paper / Title</label>
              <select value={selectedTitle} onChange={e => setSelectedTitle(e.target.value)} disabled={batchRunning || loadingTopics} className="px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none min-w-[240px] max-w-[320px]">
                <option value="">All Papers</option>
                {filteredTitles.map(m => <option key={m.title} value={m.title}>{m.title}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Subject</label>
              <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic(""); }} disabled={batchRunning || loadingTopics || subjects.length === 0} className="px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none min-w-[160px]">
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Topic</label>
              <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} disabled={batchRunning || loadingTopics} className="px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none min-w-[200px]">
                <option value="">All Topics</option>
                {filteredTopics.map(t => <option key={t.topic} value={t.topic}>{t.topic}</option>)}
              </select>
            </div>
          </>
        )}
        <button onClick={() => fetchPage(0, false)} disabled={batchRunning || loading} className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors">
          {loading ? "Loading..." : "Apply Filter"}
        </button>
      </div>

      {/* CONTROLS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border dark:border-zinc-700">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
          {questions.length} of {total} unreviewed {SOURCE_LABELS[source]} questions
        </div>
        <div className="flex items-center gap-2">
          <select value={aiModel} onChange={e => setAiModel(e.target.value as any)} disabled={batchRunning} className="px-2 py-2 rounded-lg text-[10px] font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none">
            {/* Labels come from lib/aiModels so they name the model that ACTUALLY
                runs — the old hand-written "Gemini Flash (API key)" didn't say which
                model, and went stale whenever the constant moved a generation.
                The hint names who pays: API key, OpenAI key, or Modal. */}
            {AI_MODEL_OPTIONS.map(m => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.hint}
              </option>
            ))}
          </select>
          <button onClick={handleBatchRun} disabled={batchRunning || questions.length === 0} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${batchRunning ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 animate-pulse" : questions.length === 0 ? "bg-gray-100 text-gray-400 cursor-default" : "bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/20"}`}>
            {batchRunning ? "⏳ Reviewing..." : `Review All (${questions.length})`}
          </button>
          {batchRunning && (
            <button onClick={handleStopBatch} className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* QUESTION LIST */}
      <div className="flex flex-col gap-3">
        {questions.length === 0 && (
          <div className="text-center py-16 text-gray-400 font-medium">No unreviewed questions for this filter 🎉</div>
        )}
        {questions.map(q => (
          <ReviewCard key={q.id} question={q} aiModel={aiModel} onReviewed={() => removeFromList(q.id)} />
        ))}
      </div>

      {/* LOAD MORE */}
      {questions.length < total && (
        <button onClick={() => fetchPage(page + 1, true)} disabled={loading} className="w-full py-3 rounded-xl border border-dashed dark:border-zinc-700 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
          {loading ? "Loading..." : `Load more (${total - questions.length} remaining)`}
        </button>
      )}
    </div>
  );
}

function ReviewCard({
  question,
  aiModel,
  onReviewed,
}: {
  question: ReviewRow;
  aiModel: AIModel;
  onReviewed: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<{ decision: "use_ai" | "keep_stored"; answer: string } | null>(null);
  const [explResolving, setExplResolving] = useState(false);
  const [explResolved, setExplResolved] = useState<"use_ai" | "keep_stored" | "edit" | null>(null);
  // Inline explanation editor. `draft` seeds from the stored explanation, or from
  // the AI's solution when there is nothing stored — the common case for a question
  // flagged "no explanation" is wanting the AI text as a starting point to correct.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const options = (question.options as Record<string, string>) ?? {};
  const optionLabels: Record<string, string> = { "0": "A", "1": "B", "2": "C", "3": "D" };

  const handleReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewQuestionAnswer(question.id, question.questionType, question.mockTestId, aiModel);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (decision: "use_ai" | "keep_stored") => {
    setResolving(true);
    setError(null);
    try {
      await resolveReviewMismatch(question.id, question.questionType, question.mockTestId, decision, result?.aiDetectedAnswer ?? null);
      setResolved({ decision, answer: decision === "use_ai" ? (result?.aiDetectedAnswer ?? "") : question.correct_answer });
    } catch (err: any) {
      setError(err?.message || "Failed to resolve");
    } finally {
      setResolving(false);
    }
  };

  const handleResolveExpl = async (decision: "use_ai" | "keep_stored" | "edit", edited?: string) => {
    setExplResolving(true);
    setError(null);
    try {
      const text =
        decision === "use_ai" ? (result?.verifyText ?? null) : decision === "edit" ? (edited ?? "") : null;
      await resolveExplanation(question.id, question.questionType, question.mockTestId, decision, text);
      // Reflect the saved text locally so the card shows what's now in the DB
      // without a refetch — the list row is a snapshot from the server render.
      if (decision !== "keep_stored" && text) question.explanation = text;
      setExplResolved(decision);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || "Failed to resolve explanation");
    } finally {
      setExplResolving(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 px-2 py-0.5 rounded">{SOURCE_LABELS[question.questionType]}</span>
            {question.year && <span className="text-[10px] font-bold text-gray-500">{question.year}</span>}
            <span className="text-[10px] font-bold text-gray-500 truncate">{question.subject}</span>
            {question.topic && <span className="text-[10px] text-gray-400 truncate">{question.topic}</span>}
            {result?.isMismatch && (
              <span className="text-[10px] font-black uppercase bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400 px-2 py-0.5 rounded">⚠️ Answer Mismatch · AI: {result.aiDetectedAnswer} / Stored: {question.correct_answer}</span>
            )}
            {result && !result.isMismatch && (
              <span className="text-[10px] font-black uppercase bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400 px-2 py-0.5 rounded">✓ Answer OK</span>
            )}
            {result && result.explanationVerdict !== "skipped" && (
              result.explanationFlagged ? (
                <span className="text-[10px] font-black uppercase bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 px-2 py-0.5 rounded">📖 Explanation: {EXPL_VERDICT_LABEL[result.explanationVerdict]}</span>
              ) : (
                <span className="text-[10px] font-black uppercase bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400 px-2 py-0.5 rounded">📖 Explanation OK ✓</span>
              )
            )}
            {result && result.explanationVerdict === "skipped" && (
              <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400 px-2 py-0.5 rounded">📖 No explanation</span>
            )}
            {result && result.usage && (
              <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 px-2 py-0.5 rounded">
                📊 {result.usage.input.toLocaleString()} in · {result.usage.output.toLocaleString()} out{result.usage.thoughts > 0 ? ` · ${result.usage.thoughts.toLocaleString()} think` : ""}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2"><MathRenderer content={question.question_text} /></div>
          <QuestionImages images={question.images} compact />
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <button onClick={handleReview} disabled={loading} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${loading ? "bg-purple-100 text-purple-600 dark:bg-purple-500/10 animate-pulse" : result ? "bg-gray-100 text-gray-500 dark:bg-zinc-800 hover:bg-purple-50" : "bg-purple-500 text-white hover:bg-purple-600 shadow shadow-purple-500/20"}`}>
            {loading ? "Solving..." : result ? "Re-review" : "Review"}
          </button>
          {error && <span className="text-[9px] text-red-500 max-w-[140px] text-right">{error}</span>}
        </div>
      </div>

      {result && (
        <div className="border-t dark:border-zinc-800 p-4 flex flex-col gap-3 bg-gray-50 dark:bg-black/20">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-600 dark:text-gray-300 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-purple-100 dark:border-zinc-800 shadow-sm">
            <span className="font-bold text-purple-600 dark:text-purple-400">📊 Token Usage ({aiModel})</span>
            <div className="flex items-center gap-3">
              <span>Input: <strong className="text-gray-900 dark:text-gray-100">{result.usage.input.toLocaleString()}</strong></span>
              <span>Output: <strong className="text-gray-900 dark:text-gray-100">{result.usage.output.toLocaleString()}</strong></span>
              {result.usage.thoughts > 0 && (
                <span>Thinking: <strong className="text-purple-600 dark:text-purple-400">{result.usage.thoughts.toLocaleString()}</strong></span>
              )}
            </div>
          </div>
          {Object.keys(options).length > 0 ? (
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(options).map(([k, v]) => {
                const label = optionLabels[k] ?? k;
                const isCorrect = isCorrectOption(k, label, question.correct_answer);
                const cleanValue = String(v).replace(/^[A-D][.)]\s*/i, "");
                return (
                  <div key={k} className={`px-3 py-2 rounded-lg text-xs border flex items-start gap-2 ${isCorrect ? "bg-green-50 border-green-300 dark:bg-green-500/10 dark:border-green-500/40 font-bold text-green-700 dark:text-green-400" : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-400"}`}>
                    <span className="font-black flex-shrink-0">{label}.</span>
                    <div className="flex-1 min-w-0"><MathRenderer content={cleanValue} /></div>
                    {isCorrect && <span className="ml-auto flex-shrink-0 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black">STORED</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Stored Answer</span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-green-50 border border-green-300 dark:bg-green-500/10 dark:border-green-500/40 text-green-700 dark:text-green-400"><MathRenderer content={question.correct_answer} /></span>
              <span className="text-[9px] text-gray-400 italic">NAT</span>
            </div>
          )}
          {result.isMismatch && !resolved && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400 flex flex-col gap-2">
              <div>⚠️ AI solved to <span className="underline">{result.aiDetectedAnswer}</span> but stored is <span className="underline">{question.correct_answer}</span>. Choose which to keep:</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleResolve("keep_stored")}
                  disabled={resolving}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >Keep stored ({question.correct_answer})</button>
                <button
                  onClick={() => handleResolve("use_ai")}
                  disabled={resolving || !result.aiDetectedAnswer}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                >→ Use AI answer ({result.aiDetectedAnswer})</button>
              </div>
            </div>
          )}
          {resolved && (
            <div className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-xs font-bold text-green-700 dark:text-green-400">
              ✓ Resolved — stored answer is now <span className="underline">{resolved.answer}</span>{resolved.decision === "keep_stored" ? " (unchanged)" : " (updated to AI's answer)"}.
            </div>
          )}
          {result.verifyText && (
            <div>
              <div className="text-[10px] font-bold text-purple-500 uppercase mb-1.5">🧠 Independent Solution (AI)</div>
              <div className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/20 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"><MathRenderer content={result.verifyText} /></div>
            </div>
          )}
          {result.explanationVerdict !== "skipped" && (
            <div className={`px-3 py-2 rounded-lg text-xs font-bold border ${result.explanationFlagged ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400" : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400"}`}>
              {result.explanationFlagged ? `📖 Explanation flagged: ${EXPL_VERDICT_LABEL[result.explanationVerdict]}${result.explanationIssue ? ` — ${result.explanationIssue}` : ""}` : "✓ Explanation looks correct"}
              {result.explanationFlagged && result.explanationReviewText && (
                <div className="mt-1.5 text-[11px] font-normal text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap"><MathRenderer content={result.explanationReviewText} /></div>
              )}
            </div>
          )}
          <div>
            <div className="text-[10px] font-bold text-blue-500 uppercase mb-1.5">📖 Stored Explanation (DB)</div>
            {question.explanation ? (
              <div className="p-3 rounded-xl bg-blue-50/40 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"><MathRenderer content={question.explanation} /></div>
            ) : (
              <div className="text-[10px] text-gray-400 italic px-1">No stored explanation for this question.</div>
            )}
          </div>

          {/* Inline editor — fix the explanation here instead of leaving it for the
              reports page. Saving clears the pending AI Explanation Issue flag, so a
              question corrected here never shows up in /admin/reports. */}
          {editing && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-amber-500 uppercase">✏️ Editing explanation — LaTeX in $…$</div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={10}
                className="w-full p-3 rounded-xl bg-white dark:bg-zinc-950 border border-amber-300 dark:border-amber-500/40 text-xs text-gray-800 dark:text-gray-200 font-mono leading-relaxed outline-none focus:border-amber-500"
              />
              {draft.trim() && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-950/60 border border-gray-200 dark:border-zinc-800">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Preview</div>
                  <MathRenderer content={draft} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => handleResolveExpl("edit", draft)} disabled={explResolving || !draft.trim()} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">{explResolving ? "Saving…" : "💾 Save explanation"}</button>
                <button onClick={() => setEditing(false)} disabled={explResolving} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                {result.verifyText && (
                  <button onClick={() => setDraft(result.verifyText)} disabled={explResolving} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50">Load AI&apos;s solution</button>
                )}
              </div>
            </div>
          )}

          {/* Explanation choice — available on every reviewed question, not just flagged ones */}
          {!explResolved ? (
            !editing && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Explanation:</span>
                {question.explanation && (
                  <button onClick={() => handleResolveExpl("keep_stored")} disabled={explResolving} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-50">Keep stored</button>
                )}
                <button onClick={() => handleResolveExpl("use_ai")} disabled={explResolving || !result.verifyText} title={!result.verifyText ? "No AI solution text available" : "Store the AI's independent solution as the explanation"} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50">{question.explanation ? "→ Use AI's solution" : "+ Add AI's solution"}</button>
                <button onClick={() => { setDraft(question.explanation || result.verifyText || ""); setEditing(true); }} disabled={explResolving} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-50">✏️ Edit &amp; fix</button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[11px] font-bold text-green-700 dark:text-green-400">✓ {explResolved === "edit" ? "Explanation saved — flag cleared, won't appear in Reports." : explResolved === "use_ai" ? "Explanation replaced with AI's solution." : "Kept stored explanation."}</div>
              <button onClick={() => { setDraft(question.explanation || ""); setEditing(true); }} className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline">edit again</button>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={onReviewed} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-green-500 text-white hover:bg-green-600 shadow shadow-green-500/20">✓ Done & Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}
