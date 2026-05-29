"use client";

import { useState, useEffect } from "react";
import { generateAIExplanation, getGateCsePyqsMissingExplanation, getTopicsForExam } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";
import { displayBranch } from "@/lib/seo";
import { getImageUrl } from "@/lib/imageUtils";

// Canonical image shape stored in DB JSONB — matches the practice page renderer.
type QuestionImage = { index: number; filename: string; type?: string };

type QuestionRow = {
  id: string;
  question_text: string;
  options: any;
  correct_answer: string;
  year: number;
  marks: number;
  questionType: "PYQ";
  subject: string;
  topic?: string;
  images?: QuestionImage[] | null;
};

// Shared renderer used by the card list, both popups, and the result panels.
// Mirrors components/test/QuestionPane.tsx so admin previews match what
// students see. Filters explanation-type images (these previews are for the
// question). `compact` shrinks the layout for the list view.
function QuestionImages({ images, compact = false }: { images?: QuestionImage[] | null; compact?: boolean }) {
  if (!images || !Array.isArray(images) || images.length === 0) return null;
  const questionImages = images.filter(img => img && img.filename && img.type !== "explanation");
  if (questionImages.length === 0) return null;

  if (compact) {
    return (
      <div className="mt-2 flex gap-2 flex-wrap">
        {questionImages.map((img) => (
          <img
            key={img.index}
            src={getImageUrl(img.filename)}
            alt=""
            className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-black/30 object-contain"
            style={{ maxHeight: 96, maxWidth: 160 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {questionImages.map((img) => (
        <div
          key={img.index}
          className="flex justify-center rounded-xl p-3 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-black/30 overflow-hidden"
        >
          <img
            src={getImageUrl(img.filename)}
            alt=""
            className="rounded-lg object-contain w-full"
            style={{ maxHeight: 400, height: "auto" }}
          />
        </div>
      ))}
    </div>
  );
}

type InitialData = Awaited<ReturnType<typeof getGateCsePyqsMissingExplanation>>;
type ExamTypeOption = { examType: string; branch: string | null };
type TopicOption = { topic: string; subject: string };

interface Props {
  initialData: InitialData;
  examTypes: ExamTypeOption[];
}

// Handles both single ("A") and multi ("A, C") correct_answer formats
function isCorrectOption(optionKey: string, optionLabel: string, correctAnswer: string): boolean {
  const correct = new Set(correctAnswer.split(",").map(s => s.trim().toUpperCase()));
  return correct.has(optionKey.toUpperCase()) || correct.has(optionLabel.toUpperCase());
}

export default function ExplanationsClient({ initialData, examTypes }: Props) {
  const allRows: QuestionRow[] = [
    ...initialData.pyqs,
    ...initialData.subjectPyqs,
  ];

  const [questions, setQuestions] = useState<QuestionRow[]>(allRows);
  const [total, setTotal] = useState(initialData.totalPyq + initialData.totalSubjectPyq);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [selectedExam, setSelectedExam] = useState<string>(
    examTypes.length > 0 ? `${examTypes[0].examType}::${examTypes[0].branch ?? ""}` : "GATE::CSE"
  );
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [loadingTopics, setLoadingTopics] = useState(false);

  const parseExam = (val: string) => {
    const [examType, branch] = val.split("::");
    return { examType, branch: branch || null };
  };

  const handleExamChange = async (val: string) => {
    setSelectedExam(val);
    setSelectedSubject("");
    setSelectedTopic("");
    setTopics([]);
    const { examType, branch } = parseExam(val);
    setLoadingTopics(true);
    try {
      const t = await getTopicsForExam(examType, branch);
      setTopics(t);
    } finally {
      setLoadingTopics(false);
    }
  };

  // Load topics for the default selected exam on first render
  useEffect(() => {
    const { examType, branch } = parseExam(selectedExam);
    setLoadingTopics(true);
    getTopicsForExam(examType, branch)
      .then(t => setTopics(t))
      .finally(() => setLoadingTopics(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subjects = Array.from(new Set(topics.map(t => t.subject))).sort();
  const filteredTopics = selectedSubject ? topics.filter(t => t.subject === selectedSubject) : topics;

  const handleApplyFilters = async () => {
    const { examType, branch } = parseExam(selectedExam);
    setLoadingMore(true);
    try {
      const data = await getGateCsePyqsMissingExplanation(0, 50, examType, branch ?? "CSE", selectedTopic || null, selectedSubject || null);
      const rows: QuestionRow[] = [...data.pyqs, ...data.subjectPyqs];
      setQuestions(rows);
      setTotal(data.totalPyq + data.totalSubjectPyq);
      setPage(0);
    } finally {
      setLoadingMore(false);
    }
  };

  const [batchDetailEntry, setBatchDetailEntry] = useState<null | typeof batchLog[0]>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, failed: 0, mismatches: 0 });
  type BatchEntry = {
    id: string;
    label: string;
    status: "ok" | "fail";
    tokens?: { input: number; output: number; thoughts: number };
    explanation?: string;
    verifyText?: string;
    isMismatch?: boolean;
    aiDetectedAnswer?: string | null;
    question?: QuestionRow;
  };
  const [batchLog, setBatchLog] = useState<BatchEntry[]>([]);
  const [batchDone, setBatchDone] = useState(false);
  const [aiModel, setAiModel] = useState<"gemini" | "gpt-4o-mini" | "vertex-2.5-pro">("gemini");
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Remove a question from local state once it gets an explanation
  const removeFromList = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { examType, branch } = parseExam(selectedExam);
      const data = await getGateCsePyqsMissingExplanation(nextPage, 50, examType, branch ?? "CSE", selectedTopic || null, selectedSubject || null);
      const rows: QuestionRow[] = [...data.pyqs, ...data.subjectPyqs];
      setQuestions(prev => [...prev, ...rows]);
      setPage(nextPage);
      setTotal(data.totalPyq + data.totalSubjectPyq);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleBatchRun = async () => {
    if (batchRunning || questions.length === 0) return;
    const confirmed = window.confirm(
      `Generate AI explanations for ${questions.length} shown questions using ${aiModel}?\n\nThis will use Gemini free tier — 30 RPM limit applies (auto-throttled).`
    );
    if (!confirmed) return;

    setBatchRunning(true);
    setBatchDone(false);
    setBatchLog([]);
    setBatchProgress({ done: 0, total: questions.length, failed: 0, mismatches: 0 });

    let done = 0;
    let failed = 0;
    let mismatches = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const label = `${q.year} · ${q.subject} · ${q.question_text.substring(0, 60)}...`;

      try {
        const result = await generateAIExplanation(q.id, q.questionType, undefined, aiModel);
        done++;
        if (result.isMismatch) mismatches++;
        setBatchLog(prev => [...prev, {
          id: q.id,
          label,
          status: "ok",
          tokens: { input: result.usage.input, output: result.usage.output, thoughts: result.usage.thoughts },
          explanation: result.explanation,
          verifyText: result.verifyText,
          isMismatch: result.isMismatch,
          aiDetectedAnswer: result.aiDetectedAnswer,
          question: q,
        }]);
        removeFromList(q.id);
      } catch {
        failed++;
        setBatchLog(prev => [...prev, { id: q.id, label, status: "fail" }]);
      }

      setBatchProgress({ done: done + failed, total: questions.length, failed, mismatches });

      // Stay well within 30 RPM free tier: ~2.2 sec gap = ~27 RPM
      if (i < questions.length - 1) {
        await new Promise(res => setTimeout(res, 2200));
      }
    }

    setBatchRunning(false);
    setBatchDone(true);
  };

  const previewQuestion = questions.find(q => q.id === previewId);

  return (
    <div className="flex flex-col gap-6">

      {/* PREVIEW MODAL */}
      {previewQuestion && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setPreviewId(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
              <span className="text-sm font-black">{previewQuestion.year} · {previewQuestion.subject}</span>
              <button
                onClick={() => setPreviewId(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs"
              >✕</button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 text-sm">
                <MathRenderer content={previewQuestion.question_text} />
                <QuestionImages images={previewQuestion.images} />
              </div>
              {Object.keys(previewQuestion.options as Record<string, string>).length > 0 ? (
                <div className="grid grid-cols-1 gap-1">
                  {Object.entries(previewQuestion.options as Record<string, string>).map(([k, v]) => (
                    <div
                      key={k}
                      className={`px-3 py-2 rounded-lg text-xs border ${
                        isCorrectOption(k, k, previewQuestion.correct_answer)
                          ? "bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30 font-bold text-green-700 dark:text-green-400"
                          : "bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-zinc-800"
                      }`}
                    >
                      <span className="font-bold mr-2">{k}.</span>
                      <MathRenderer content={String(v)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Answer</span>
                  <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-green-50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/30 text-green-700 dark:text-green-400">
                    <MathRenderer content={previewQuestion.correct_answer} />
                  </span>
                  <span className="text-[9px] text-gray-400 italic">NAT</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BATCH MODAL */}
      {(batchRunning || batchDone) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 flex flex-col h-[90vh]">
            <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-sm font-black">
                {batchDone ? "✅" : "⚡"} Explanation Generator
              </h3>
              {batchDone && (
                <button
                  onClick={() => setBatchDone(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs"
                >✕</button>
              )}
            </div>

            <div className="px-4 pt-3">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>{batchProgress.done} / {batchProgress.total}</span>
                <span className="flex gap-3">
                  <span className="text-green-500">✅ {batchProgress.done - batchProgress.failed}</span>
                  {batchProgress.failed > 0 && <span className="text-red-500">❌ {batchProgress.failed}</span>}
                  {batchProgress.mismatches > 0 && <span className="text-amber-500">⚠️ {batchProgress.mismatches} mismatch</span>}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${(batchProgress.done / Math.max(1, batchProgress.total)) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-1">
              {[...batchLog].reverse().map((entry, i) => (
                <button
                  key={i}
                  onClick={() => entry.status === "ok" && setBatchDetailEntry(entry)}
                  className={`w-full flex items-center gap-2 text-[10px] text-gray-500 py-1.5 px-2 rounded border dark:border-zinc-800 bg-gray-50 dark:bg-black/20 text-left transition-colors ${entry.status === "ok" ? "hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer" : "cursor-default"}`}
                >
                  <span className="flex-shrink-0">{entry.status === "ok" ? "✅" : "❌"}</span>
                  {entry.isMismatch && (
                    <span className="flex-shrink-0 text-[9px] font-black bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 px-1.5 py-0.5 rounded">
                      ⚠️ MISMATCH
                    </span>
                  )}
                  <span className="truncate flex-1">{entry.label}</span>
                  {entry.tokens && (
                    <span className="flex-shrink-0 text-[8px] flex gap-1">
                      <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-500 px-1 py-0.5 rounded">↑{entry.tokens.input.toLocaleString()}</span>
                      <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 px-1 py-0.5 rounded">↓{entry.tokens.output.toLocaleString()}</span>
                      {entry.tokens.thoughts > 0 && (
                        <span className={`px-1 py-0.5 rounded ${entry.tokens.thoughts > 8000 ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-purple-50 dark:bg-purple-500/10 text-purple-500"}`}>
                          💭{entry.tokens.thoughts.toLocaleString()}
                        </span>
                      )}
                    </span>
                  )}
                  {entry.status === "ok" && <span className="flex-shrink-0 text-gray-300 dark:text-zinc-600 text-[8px]">↗</span>}
                </button>
              ))}
              {batchDone && (
                <div className="mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-center">
                  <div className="text-sm font-bold text-green-800 dark:text-green-300">Batch Complete!</div>
                  <div className="text-[10px] text-green-600 dark:text-green-400 mt-1">
                    {batchProgress.done - batchProgress.failed} explanations generated.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BATCH DETAIL POPUP */}
      {batchDetailEntry && batchDetailEntry.question && (() => {
        const e = batchDetailEntry;
        const opts = (e.question!.options as Record<string, string>) ?? {};
        const hasOpts = Object.keys(opts).length > 0;
        const optLabels: Record<string, string> = { "0": "A", "1": "B", "2": "C", "3": "D", "A": "A", "B": "B", "C": "C", "D": "D" };
        return (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
            onClick={() => setBatchDetailEntry(null)}
          >
            <div
              className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 flex flex-col max-h-[90vh]"
              onClick={ev => ev.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b dark:border-zinc-800 flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded">{e.question!.year}</span>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{e.question!.subject}</span>
                  {e.question!.topic && <span className="text-[10px] text-gray-400">{e.question!.topic}</span>}
                  {e.isMismatch && <span className="text-[10px] font-black bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 px-2 py-0.5 rounded">⚠️ Mismatch</span>}
                </div>
                <button
                  onClick={() => setBatchDetailEntry(null)}
                  className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs"
                >✕</button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

                {/* Question */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  <MathRenderer content={e.question!.question_text} />
                  <QuestionImages images={e.question!.images} />
                </div>

                {/* Options or NAT */}
                {hasOpts ? (
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(opts).map(([k, v]) => {
                      const label = optLabels[k] ?? k;
                      const isCorrect = isCorrectOption(k, label, e.question!.correct_answer);
                      const cleanValue = String(v).replace(/^[A-D][.)]\s*/i, "");
                      return (
                        <div key={k} className={`px-4 py-2.5 rounded-xl text-sm border flex items-start gap-2 ${isCorrect ? "bg-green-50 border-green-300 dark:bg-green-500/10 dark:border-green-500/40 font-bold text-green-700 dark:text-green-400" : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-400"}`}>
                          <span className="font-black flex-shrink-0">{label}.</span>
                          <div className="flex-1 min-w-0"><MathRenderer content={cleanValue} /></div>
                          {isCorrect && <span className="ml-auto flex-shrink-0 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded font-black">✓ CORRECT</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Correct Answer</span>
                    <span className="px-4 py-2 rounded-xl text-sm font-black bg-green-50 border border-green-300 dark:bg-green-500/10 dark:border-green-500/40 text-green-700 dark:text-green-400">
                      <MathRenderer content={e.question!.correct_answer} />
                    </span>
                    <span className="text-xs text-gray-400 italic">NAT</span>
                  </div>
                )}

                {/* Mismatch warning */}
                {e.isMismatch && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm font-bold text-red-600 dark:text-red-400">
                    ⚠️ AI detected answer <span className="underline">{e.aiDetectedAnswer}</span> but correct is <span className="underline">{e.question!.correct_answer}</span>
                  </div>
                )}

                {/* Token usage */}
                {e.tokens && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-bold uppercase tracking-wide">Tokens:</span>
                    <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-mono">↑ {e.tokens.input.toLocaleString()} in</span>
                    <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono">↓ {e.tokens.output.toLocaleString()} out</span>
                    {e.tokens.thoughts > 0 && (
                      <span className={`px-2 py-0.5 rounded font-mono ${e.tokens.thoughts > 8000 ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"}`}>
                        💭 {e.tokens.thoughts.toLocaleString()} thinking
                      </span>
                    )}
                  </div>
                )}

                {/* Independent verification (AI's own answer, without being told the target) */}
                {e.verifyText && (
                  <div>
                    <div className="text-xs font-bold text-purple-500 uppercase mb-2 flex items-center gap-2">
                      <span>🧠 Independent Solution</span>
                      {e.aiDetectedAnswer && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${e.isMismatch ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"}`}>
                          answer: {e.aiDetectedAnswer}
                        </span>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/20 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <MathRenderer content={e.verifyText} />
                    </div>
                  </div>
                )}

                {/* Explanation (derivation to the stored target answer) */}
                <div>
                  <div className="text-xs font-bold text-blue-500 uppercase mb-2">📖 Derivation to Stored Answer</div>
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border dark:border-zinc-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <MathRenderer content={e.explanation!} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border dark:border-zinc-700">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-exam" className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Exam Type</label>
          <select
            id="filter-exam"
            value={selectedExam}
            onChange={e => handleExamChange(e.target.value)}
            disabled={batchRunning}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none min-w-[160px]"
          >
            {examTypes.map(e => (
              <option key={`${e.examType}::${e.branch ?? ""}`} value={`${e.examType}::${e.branch ?? ""}`}>
                {e.examType}{displayBranch(e.branch) ? ` (${displayBranch(e.branch)})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-subject" className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Subject</label>
          <select
            id="filter-subject"
            value={selectedSubject}
            onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}
            disabled={batchRunning || loadingTopics || subjects.length === 0}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none min-w-[160px]"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-topic" className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Topic</label>
          <select
            id="filter-topic"
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            disabled={batchRunning || loadingTopics}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none min-w-[200px]"
          >
            <option value="">All Topics</option>
            {filteredTopics.map(t => (
              <option key={t.topic} value={t.topic}>{t.topic}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleApplyFilters}
          disabled={batchRunning || loadingMore}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loadingMore ? "Loading..." : "Apply Filter"}
        </button>
      </div>

      {/* CONTROLS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border dark:border-zinc-700">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
          Showing {questions.length} of {total} questions without explanations
        </div>
        <div className="flex items-center gap-2">
          <select
            value={aiModel}
            onChange={e => setAiModel(e.target.value as any)}
            disabled={batchRunning}
            className="px-2 py-2 rounded-lg text-[10px] font-bold bg-white dark:bg-zinc-900 border dark:border-zinc-700 outline-none"
          >
            <option value="gemini">Gemini Flash (Free)</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="vertex-2.5-pro">Vertex Gemini 2.5 Pro</option>
          </select>
          <button
            onClick={handleBatchRun}
            disabled={batchRunning || questions.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              batchRunning
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 animate-pulse"
                : questions.length === 0
                ? "bg-gray-100 text-gray-400 cursor-default"
                : "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20"
            }`}
          >
            {batchRunning ? "⏳ Running..." : `Generate All (${questions.length})`}
          </button>
        </div>
      </div>

      {/* QUESTION LIST */}
      <div className="flex flex-col gap-3">
        {questions.length === 0 && (
          <div className="text-center py-16 text-gray-400 font-medium">
            All GATE CSE PYQs have explanations!
          </div>
        )}
        {questions.map(q => (
          <QuestionCard
            key={q.id}
            question={q}
            aiModel={aiModel}
            onDone={() => removeFromList(q.id)}
            onPreview={() => setPreviewId(q.id)}
          />
        ))}
      </div>

      {/* LOAD MORE */}
      {questions.length < total && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full py-3 rounded-xl border border-dashed dark:border-zinc-700 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {loadingMore ? "Loading..." : `Load more (${total - questions.length} remaining)`}
        </button>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  aiModel,
  onDone,
  onPreview,
}: {
  question: QuestionRow;
  aiModel: "gemini" | "gpt-4o-mini" | "vertex-2.5-pro";
  onDone: () => void;
  onPreview: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ explanation: string; verifyText: string; isMismatch: boolean; aiDetectedAnswer: string | null; usage: { input: number; output: number; thoughts: number } } | null>(null);

  const handleGenerate = async (useSearch: boolean = false) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateAIExplanation(question.id, question.questionType, undefined, aiModel, useSearch);
      setResult({ explanation: res.explanation, verifyText: res.verifyText, isMismatch: res.isMismatch, aiDetectedAnswer: res.aiDetectedAnswer, usage: res.usage });
    } catch (err: any) {
      setError(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const options = question.options as Record<string, string>;
  // Map numeric keys (0,1,2,3) to letter labels (A,B,C,D) for display
  const optionLabels: Record<string, string> = { "0": "A", "1": "B", "2": "C", "3": "D", "A": "A", "B": "B", "C": "C", "D": "D" };

  return (
    <div className="rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded">
              {question.year}
            </span>
            <span className="text-[10px] font-bold text-gray-500 truncate">{question.subject}</span>
            {question.topic && <span className="text-[10px] text-gray-400 truncate">{question.topic}</span>}
            <span className="text-[9px] text-gray-300 dark:text-zinc-600 font-mono">{question.questionType}</span>
            {result?.isMismatch && (
              <span className="text-[10px] font-black uppercase bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400 px-2 py-0.5 rounded">
                ⚠️ Mismatch · AI: {result.aiDetectedAnswer} / Stored: {question.correct_answer}
              </span>
            )}
          </div>
          <button onClick={onPreview} className="text-left text-xs text-gray-700 dark:text-gray-300 line-clamp-2 hover:text-blue-500 transition-colors">
            <MathRenderer content={question.question_text} />
          </button>
          <QuestionImages images={question.images} compact />
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                loading
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-500/10 animate-pulse"
                  : result
                  ? "bg-gray-100 text-gray-500 dark:bg-zinc-800 hover:bg-amber-50"
                  : "bg-amber-500 text-white hover:bg-amber-600 shadow shadow-amber-500/20"
              }`}
            >
              {loading ? "Generating..." : result ? "Regenerate" : "Generate"}
            </button>
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading || aiModel === "gpt-4o-mini"}
              title={aiModel === "gpt-4o-mini" ? "Search grounding is only available on Gemini/Vertex" : "Generate with Google Search grounding"}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                loading
                  ? "bg-sky-100 text-sky-600 dark:bg-sky-500/10 animate-pulse"
                  : aiModel === "gpt-4o-mini"
                  ? "bg-gray-100 text-gray-300 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                  : "bg-sky-500 text-white hover:bg-sky-600 shadow shadow-sky-500/20"
              }`}
            >
              🌐 Search
            </button>
          </div>
          {error && <span className="text-[9px] text-red-500 max-w-[140px] text-right">{error}</span>}
        </div>
      </div>

      {/* Result panel — shown after generation */}
      {result && (
        <div className="border-t dark:border-zinc-800 p-4 flex flex-col gap-3 bg-gray-50 dark:bg-black/20">

          {/* Options or NAT answer */}
          {Object.keys(options).length > 0 ? (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Options</div>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(options).map(([k, v]) => {
                  const label = optionLabels[k] ?? k;
                  const isCorrect = isCorrectOption(k, label, question.correct_answer);
                  const cleanValue = String(v).replace(/^[A-D][.)]\s*/i, "");
                  return (
                    <div
                      key={k}
                      className={`px-3 py-2 rounded-lg text-xs border flex items-start gap-2 ${
                        isCorrect
                          ? "bg-green-50 border-green-300 dark:bg-green-500/10 dark:border-green-500/40 font-bold text-green-700 dark:text-green-400"
                          : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <span className="font-black flex-shrink-0">{label}.</span>
                      <div className="flex-1 min-w-0"><MathRenderer content={cleanValue} /></div>
                      {isCorrect && (
                        <span className="ml-auto flex-shrink-0 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black">CORRECT</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Correct Answer</span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-green-50 border border-green-300 dark:bg-green-500/10 dark:border-green-500/40 text-green-700 dark:text-green-400">
                <MathRenderer content={question.correct_answer} />
              </span>
              <span className="text-[9px] text-gray-400 italic">NAT</span>
            </div>
          )}

          {/* AI answer mismatch warning */}
          {result.isMismatch && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400">
              ⚠️ Mismatch — AI detected <span className="underline">{result.aiDetectedAnswer}</span> but correct is <span className="underline">{question.correct_answer}</span>
            </div>
          )}

          {/* Token usage */}
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span className="font-bold uppercase tracking-wide">Tokens:</span>
            <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">↑ {result.usage.input.toLocaleString()} in</span>
            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono">↓ {result.usage.output.toLocaleString()} out</span>
            {result.usage.thoughts > 0 && (
              <span className={`px-1.5 py-0.5 rounded font-mono ${result.usage.thoughts > 8000 ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"}`}>
                💭 {result.usage.thoughts.toLocaleString()} thinking
              </span>
            )}
          </div>

          {/* Independent verification (AI's own answer, without being told the target) */}
          {result.verifyText && (
            <div>
              <div className="text-[10px] font-bold text-purple-500 uppercase mb-1.5 flex items-center gap-1.5">
                <span>🧠 Independent Solution</span>
                {result.aiDetectedAnswer && (
                  <span className={`px-1.5 py-0.5 rounded font-mono ${result.isMismatch ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"}`}>
                    answer: {result.aiDetectedAnswer}
                  </span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/20 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                <MathRenderer content={result.verifyText} />
              </div>
            </div>
          )}

          {/* Generated explanation (derivation to the stored target answer) */}
          <div>
            <div className="text-[10px] font-bold text-blue-500 uppercase mb-1.5">📖 Derivation to Stored Answer</div>
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              <MathRenderer content={result.explanation} />
            </div>
          </div>

          {/* Accept / Discard */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onDone}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-green-500 text-white hover:bg-green-600 shadow shadow-green-500/20"
            >
              ✓ Accept & Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
