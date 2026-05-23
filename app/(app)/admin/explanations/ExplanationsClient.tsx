"use client";

import { useState } from "react";
import { generateAIExplanation, getGateCsePyqsMissingExplanation } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";

type QuestionRow = {
  id: string;
  question_text: string;
  options: any;
  correct_answer: string;
  year: number;
  marks: number;
  images: any;
  questionType: "PYQ" | "SubjectPYQ";
  subject: string;
  topic?: string;
};

type InitialData = Awaited<ReturnType<typeof getGateCsePyqsMissingExplanation>>;

interface Props {
  initialData: InitialData;
}

export default function ExplanationsClient({ initialData }: Props) {
  const allRows: QuestionRow[] = [
    ...initialData.pyqs,
    ...initialData.subjectPyqs,
  ];

  const [questions, setQuestions] = useState<QuestionRow[]>(allRows);
  const [total, setTotal] = useState(initialData.totalPyq + initialData.totalSubjectPyq);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [batchLog, setBatchLog] = useState<{ id: string; label: string; status: "ok" | "fail"; tokens?: { input: number; output: number } }[]>([]);
  const [batchDone, setBatchDone] = useState(false);
  const [aiModel, setAiModel] = useState<"gemini" | "gpt-4o-mini">("gemini");
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
      const data = await getGateCsePyqsMissingExplanation(nextPage, 50);
      const rows: QuestionRow[] = [
        ...data.pyqs,
        ...data.subjectPyqs,
      ];
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
    setBatchProgress({ done: 0, total: questions.length, failed: 0 });

    let done = 0;
    let failed = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const label = `${q.year} · ${q.subject} · ${q.question_text.substring(0, 60)}...`;

      try {
        const result = await generateAIExplanation(q.id, q.questionType, undefined, aiModel);
        done++;
        setBatchLog(prev => [...prev, { id: q.id, label, status: "ok", tokens: result.usage }]);
        removeFromList(q.id);
      } catch {
        failed++;
        setBatchLog(prev => [...prev, { id: q.id, label, status: "fail" }]);
      }

      setBatchProgress({ done: done + failed, total: questions.length, failed });

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
              </div>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(previewQuestion.options as Record<string, string>).map(([k, v]) => (
                  <div
                    key={k}
                    className={`px-3 py-2 rounded-lg text-xs border ${
                      k === previewQuestion.correct_answer
                        ? "bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30 font-bold text-green-700 dark:text-green-400"
                        : "bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-zinc-800"
                    }`}
                  >
                    <span className="font-bold mr-2">{k}.</span>
                    <MathRenderer content={String(v)} />
                  </div>
                ))}
              </div>
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
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 flex flex-col max-h-[80vh]">
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
                <div
                  key={i}
                  className="flex items-center gap-2 text-[10px] text-gray-500 py-1.5 px-2 rounded bg-gray-50 dark:bg-black/20"
                >
                  <span className="flex-shrink-0">{entry.status === "ok" ? "✅" : "❌"}</span>
                  <span className="truncate flex-1">{entry.label}</span>
                  {entry.tokens && (
                    <span className="flex-shrink-0 text-[8px] bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded flex gap-2">
                      <span className="text-blue-500">↑{entry.tokens.input}</span>
                      <span className="text-indigo-500">↓{entry.tokens.output}</span>
                    </span>
                  )}
                </div>
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
  aiModel: "gemini" | "gpt-4o-mini";
  onDone: () => void;
  onPreview: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ explanation: string; isMismatch: boolean; aiDetectedAnswer: string | null } | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateAIExplanation(question.id, question.questionType, undefined, aiModel);
      setResult({ explanation: res.explanation, isMismatch: res.isMismatch, aiDetectedAnswer: res.aiDetectedAnswer });
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
          </div>
          <button onClick={onPreview} className="text-left text-xs text-gray-700 dark:text-gray-300 line-clamp-2 hover:text-blue-500 transition-colors">
            <MathRenderer content={question.question_text} />
          </button>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <button
            onClick={handleGenerate}
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
          {error && <span className="text-[9px] text-red-500 max-w-[120px] text-right">{error}</span>}
        </div>
      </div>

      {/* Result panel — shown after generation */}
      {result && (
        <div className="border-t dark:border-zinc-800 p-4 flex flex-col gap-3 bg-gray-50 dark:bg-black/20">

          {/* Options with correct answer highlighted */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Options</div>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(options).map(([k, v]) => {
                const label = optionLabels[k] ?? k;
                const isCorrect = k === question.correct_answer || label === question.correct_answer;
                // Strip leading "A. " / "A) " prefix from value if already present
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

          {/* AI answer mismatch warning */}
          {result.isMismatch && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400">
              ⚠️ Mismatch — AI detected <span className="underline">{result.aiDetectedAnswer}</span> but correct is <span className="underline">{question.correct_answer}</span>
            </div>
          )}

          {/* Generated explanation */}
          <div>
            <div className="text-[10px] font-bold text-blue-500 uppercase mb-1.5">Generated Explanation</div>
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
