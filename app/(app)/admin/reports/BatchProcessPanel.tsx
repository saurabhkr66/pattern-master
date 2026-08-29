"use client";

import { useState } from "react";
import { toggleManualFlag } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";
import { AI_MODEL_OPTIONS, type AIModel } from "@/lib/aiModels";

type LogEntry = {
  id: string;
  text: string;
  status: "ok" | "fail";
  question: any;
  explanation: string;
  isMismatch?: boolean;
  aiDetectedAnswer?: string | null;
  pdfSourced?: boolean | null;
  tokens?: { input: number; output: number };
  thoughts?: number;
  highThinkingFlag?: boolean;
};

type LiveFeedState = {
  testTitle: string;
  mock_test_id?: string;
  currentQ: any;
  currentExplanation: string;
  currentMismatch?: boolean;
  currentAIDetectedAnswer?: string | null;
  currentHighThinkingFlag?: boolean;
  progress: number;
  total: number;
  fixed: number;
  failed: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalThoughtsTokens: number;
  log: LogEntry[];
  done: boolean;
};

type PdfLiveFeedState = LiveFeedState & {
  currentPdfSourced?: boolean | null;
};

/* ── shared sub-components ── */

function QuestionPreviewModal({
  preview,
  testId,
  onClose,
  accentClass = "purple",
}: {
  preview: { question: any; explanation: string };
  testId?: string;
  onClose: () => void;
  accentClass?: "purple" | "indigo";
}) {
  const accent = accentClass === "indigo" ? "indigo" : "purple";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
          <span className="text-sm font-black">Question Preview</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Question</div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 text-xs"><MathRenderer content={preview.question.question_text || ""} /></div>
          </div>
          {preview.question.options && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Options</div>
              <div className="flex flex-col gap-1">
                {(preview.question.options as string[]).map((opt, i) => (
                  <div key={i} className={`p-2 rounded-lg text-xs border ${opt === preview.question.correct_answer ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 font-bold" : "bg-gray-50 dark:bg-black/20 dark:border-zinc-800"}`}>
                    <span className="font-bold text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] font-bold text-green-500 uppercase mb-1">Correct Answer</div>
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-xs font-bold">{preview.question.correct_answer}</div>
          </div>
          {preview.explanation && (
            <div>
              <div className={`text-[10px] font-bold text-${accent}-500 uppercase mb-1`}>
                {accentClass === "indigo" ? "📄 PDF-Informed Explanation" : "AI Explanation"}
              </div>
              <div className={`p-3 rounded-xl bg-${accent}-50 dark:bg-${accent}-500/5 border border-${accent}-100 dark:border-${accent}-500/10 text-xs`}>
                <MathRenderer content={preview.explanation} />
              </div>
            </div>
          )}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={async () => {
                if (!testId) return;
                await toggleManualFlag(preview.question.id, "MockQuestion", testId, true);
                alert("Question flagged as mismatch!");
              }}
              className="w-full py-2.5 rounded-xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-black uppercase hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            >🚩 Flag as Incorrect</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveFeedModal({
  feed,
  onClose,
  onPreview,
  onFlagCurrent,
  variant = "batch",
}: {
  feed: PdfLiveFeedState;
  onClose: () => void;
  onPreview: (entry: LogEntry) => void;
  onFlagCurrent: () => void;
  variant?: "batch" | "pdf";
}) {
  const isPdf = variant === "pdf";
  const gradientClass = isPdf ? "from-indigo-500 to-purple-500" : "from-purple-500 to-pink-500";
  const title = isPdf ? "📄 PDF Solution Generator" : "AI Explanation Generator";
  const processingLabel = isPdf ? "Processing PDF..." : "Processing...";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 flex flex-col max-h-[80vh]">

        <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">{feed.done ? "✅" : "⚡"} {title}</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">{feed.testTitle}</p>
          </div>
          {feed.done && (
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs">✕</button>
          )}
        </div>

        <div className="px-4 pt-3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>{feed.progress} / {feed.total}</span>
            <span className="flex gap-3">
              <span className="text-green-500">✅ {feed.fixed}</span>
              {feed.failed > 0 && <span className="text-red-500">❌ {feed.failed}</span>}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-500`}
              style={{ width: `${feed.total ? (feed.progress / feed.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {feed.currentQ && !feed.done && (
            <div className="mb-4">
              <div className={`text-[10px] font-bold text-${isPdf ? "indigo" : "purple"}-500 uppercase tracking-wider mb-1.5`}>Currently Processing</div>
              <div className={`p-3 rounded-xl bg-${isPdf ? "indigo" : "purple"}-50 dark:bg-${isPdf ? "indigo" : "purple"}-500/5 border border-${isPdf ? "indigo" : "purple"}-100 dark:border-${isPdf ? "indigo" : "purple"}-500/10 text-xs text-gray-700 dark:text-gray-300`}>
                <MathRenderer content={feed.currentQ.question_text || ""} />
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {(feed.currentQ.options as string[] || []).map((opt: string, i: number) => (
                  <div key={i} className={`px-2 py-1 rounded text-[10px] ${opt === feed.currentQ.correct_answer ? "bg-green-100 dark:bg-green-500/10 font-bold text-green-700 dark:text-green-400" : "text-gray-500"}`}>
                    {String.fromCharCode(65 + i)}. {opt}
                  </div>
                ))}
                <div className="text-[10px] font-bold text-green-600 dark:text-green-400 mt-1 flex items-center justify-between">
                  <span>✓ Answer: {feed.currentQ.correct_answer}</span>
                  <button
                    onClick={onFlagCurrent}
                    className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[8px] font-black uppercase hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                  >🚩 Flag Incorrect</button>
                </div>
              </div>
            </div>
          )}

          {feed.currentExplanation && (
            <div className="mb-4">
              <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <span>{feed.done ? "Last Generated" : "Generated Explanation"}</span>
                {isPdf && (feed as PdfLiveFeedState).currentPdfSourced === true && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-black tracking-wider" title="Explanation derived from the uploaded PDF">📄 PDF</span>
                )}
                {isPdf && (feed as PdfLiveFeedState).currentPdfSourced === false && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black tracking-wider" title="Solution not in PDF — generated from general knowledge">💭 FALLBACK</span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 text-xs text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">
                <MathRenderer content={feed.currentExplanation} />
              </div>
              {feed.currentMismatch && (
                <div className="mt-2 p-2 rounded-lg bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider">
                    AI Mismatch: AI thinks the answer is {feed.currentAIDetectedAnswer}
                  </span>
                </div>
              )}
              {feed.currentHighThinkingFlag && (
                <div className="mt-2 p-2 rounded-lg bg-orange-100 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 flex items-center gap-2">
                  <span className="text-sm">🔴</span>
                  <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                    High Thinking Tokens (&gt;8000) — flagged for review
                  </span>
                </div>
              )}
            </div>
          )}

          {feed.log.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Processing Log</div>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {[...feed.log].reverse().map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => onPreview(entry)}
                    className="flex items-center gap-2 text-[10px] text-gray-500 py-1.5 px-2 rounded bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left w-full"
                  >
                    <span className="flex-shrink-0">{entry.status === "ok" ? "✅" : "❌"}</span>
                    {isPdf && entry.pdfSourced === true && <span className="flex-shrink-0" title="Sourced from PDF">📄</span>}
                    {isPdf && entry.pdfSourced === false && <span className="flex-shrink-0" title="Fallback: not in PDF">💭</span>}
                    <span className="truncate flex-1">{entry.text}</span>
                    {entry.isMismatch && <span className="text-[10px] flex-shrink-0" title="AI answer mismatch">⚠️</span>}
                    {entry.highThinkingFlag && <span className="text-[10px] flex-shrink-0" title="High thinking tokens (>8000)">🔴</span>}
                    {entry.tokens && (
                      <span className="flex-shrink-0 text-[8px] bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded flex gap-2">
                        <span className="text-purple-500">↑{entry.tokens.input}</span>
                        <span className="text-pink-500">↓{entry.tokens.output}</span>
                        {(entry.thoughts ?? 0) > 0 && <span className="text-amber-500">🧠{entry.thoughts}</span>}
                      </span>
                    )}
                    <span className="text-gray-300">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {feed.done && (
            <div className={`mt-4 p-4 rounded-xl bg-${isPdf ? "indigo" : "green"}-50 dark:bg-${isPdf ? "indigo" : "green"}-500/10 border border-${isPdf ? "indigo" : "green"}-200 dark:border-${isPdf ? "indigo" : "green"}-500/20 text-center`}>
              <div className="text-2xl mb-2">🎓</div>
              <div className={`text-sm font-bold text-${isPdf ? "indigo" : "green"}-800 dark:text-${isPdf ? "indigo" : "green"}-300`}>
                {feed.fixed} explanations generated{isPdf ? " & saved to DB" : " and verified"}.
              </div>
              <div className={`mt-4 pt-4 border-t border-${isPdf ? "indigo" : "green"}-200 dark:border-${isPdf ? "indigo" : "green"}-500/20 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-400`}>
                <div className="flex flex-col gap-1"><span>Input Tokens</span><span className="text-gray-900 dark:text-white">{feed.totalInputTokens.toLocaleString()}</span></div>
                <div className="flex flex-col gap-1"><span>Output Tokens</span><span className="text-gray-900 dark:text-white">{feed.totalOutputTokens.toLocaleString()}</span></div>
                <div className="flex flex-col gap-1"><span>Thoughts</span><span className="text-amber-500">{feed.totalThoughtsTokens.toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </div>

        {!feed.done && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-black/20 border-t dark:border-zinc-800 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-400">
            <div className="flex items-center gap-2"><span className="animate-pulse">⏳</span><span>{processingLabel}</span></div>
            <div className="flex gap-4">
              <span className="text-purple-500 font-black">In: {feed.totalInputTokens}</span>
              <span className="text-pink-500 font-black">Out: {feed.totalOutputTokens}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main exported component ── */

interface BatchProcessPanelProps {
  mockTests: any[];
  reports: any[];
  selectedAIModel: AIModel;
  onModelChange: (model: AIModel) => void;
  onBatchComplete: (processedIds: string[]) => void;
}

const isMissingExplanation = (q: any) => {
  const hasText = q.explanation && q.explanation.trim() !== "";
  const hasImages = q.images && (q.images as any[]).some((img: any) => img.type === "explanation");
  return !hasText && !hasImages;
};

export default function BatchProcessPanel({
  mockTests,
  reports,
  selectedAIModel,
  onModelChange,
  onBatchComplete,
}: BatchProcessPanelProps) {
  const [showPdfPanel, setShowPdfPanel] = useState(false);
  const [showBatchPanel, setShowBatchPanel] = useState(false);

  // Batch state
  const [batchProcessing, setBatchProcessing] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{ total: number; fixed: number; failed: number } | null>(null);
  const [liveFeed, setLiveFeed] = useState<PdfLiveFeedState | null>(null);
  const [logPreview, setLogPreview] = useState<LogEntry | null>(null);

  // PDF state
  const [pdfMockTestId, setPdfMockTestId] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfLiveFeed, setPdfLiveFeed] = useState<PdfLiveFeedState | null>(null);
  const [pdfLogPreview, setPdfLogPreview] = useState<LogEntry | null>(null);

  const handleBatchProcess = async (testId: string) => {
    const test = mockTests.find(t => t.id === testId);
    if (!test) return;
    const confirmed = confirm(`This will generate AI explanations for all missing questions in "${test.title}". Continue?`);
    if (!confirmed) return;

    const missingQs = reports
      .filter((r: any) => r.isMock && r.mock_test_id === testId && r.status === "pending" && isMissingExplanation(r.q))
      .map((r: any) => r.q);

    if (missingQs.length === 0) {
      alert("No missing questions found for this test in the current reports list.");
      return;
    }

    setBatchProcessing(testId);
    setLiveFeed({
      testTitle: test.title, mock_test_id: testId,
      currentQ: null, currentExplanation: "", currentMismatch: false,
      currentAIDetectedAnswer: null, currentHighThinkingFlag: false,
      progress: 0, total: missingQs.length, fixed: 0, failed: 0,
      totalInputTokens: 0, totalOutputTokens: 0, totalThoughtsTokens: 0,
      log: [], done: false,
    });

    let fixed = 0, failed = 0, cumInput = 0, cumOutput = 0, cumThoughts = 0;

    for (let i = 0; i < missingQs.length; i++) {
      const q = missingQs[i];
      setLiveFeed(prev => prev ? { ...prev, currentQ: q, currentExplanation: "", progress: i } : null);

      try {
        const response = await fetch("/api/questions/generate-explanation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, questionType: "MockQuestion", mockTestId: testId, aiModel: selectedAIModel }),
        });
        if (!response.ok) throw new Error("API request failed");
        const result = await response.json();
        const { explanation, usage, isMismatch, aiDetectedAnswer, highThinkingFlag = false } = result;

        fixed++;
        cumInput += usage.input;
        cumOutput += usage.output;
        cumThoughts += usage.thoughts || 0;

        setLiveFeed(prev => prev ? {
          ...prev,
          currentExplanation: explanation, currentMismatch: isMismatch,
          currentAIDetectedAnswer: aiDetectedAnswer, currentHighThinkingFlag: highThinkingFlag,
          fixed, totalInputTokens: cumInput, totalOutputTokens: cumOutput, totalThoughtsTokens: cumThoughts,
          log: [...prev.log, { id: q.id, text: (q.question_text || "").substring(0, 80) + "...", status: "ok", question: q, explanation, isMismatch, aiDetectedAnswer, tokens: usage, thoughts: usage.thoughts, highThinkingFlag }],
        } : null);

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        failed++;
        setLiveFeed(prev => prev ? {
          ...prev, failed,
          log: [...prev.log, { id: q.id, text: (q.question_text || "").substring(0, 80) + "...", status: "fail", question: q, explanation: "" }],
        } : null);
      }
    }

    onBatchComplete(missingQs.map((q: any) => q.id));
    setLiveFeed(prev => prev ? { ...prev, done: true, progress: missingQs.length } : null);
    setBatchProcessing(null);
    setBatchResult({ total: missingQs.length, fixed, failed });
  };

  const handlePdfGenerate = async () => {
    if (!pdfMockTestId || !pdfFile) return;
    const test = mockTests.find(t => t.id === pdfMockTestId);
    if (!test) return;
    const confirmed = confirm(`This will read the uploaded PDF and generate explanations for all missing questions in "${test.title}". Continue?`);
    if (!confirmed) return;

    setPdfProcessing(true);
    setPdfLiveFeed({
      testTitle: test.title, mock_test_id: pdfMockTestId,
      currentQ: null, currentExplanation: "", currentMismatch: false,
      currentAIDetectedAnswer: null, currentHighThinkingFlag: false, currentPdfSourced: null,
      progress: 0, total: 0, fixed: 0, failed: 0,
      totalInputTokens: 0, totalOutputTokens: 0, totalThoughtsTokens: 0,
      log: [], done: false,
    });

    const fd = new FormData();
    fd.append("mockTestId", pdfMockTestId);
    fd.append("pdf", pdfFile);
    let cumInput = 0, cumOutput = 0, cumThoughts = 0;

    try {
      const response = await fetch("/api/admin/generate-solution-from-pdf", { method: "POST", body: fd });
      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        alert(`Error: ${errData.error || response.statusText}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "start") {
              setPdfLiveFeed(prev => prev ? { ...prev, total: event.total } : null);
            } else if (event.type === "progress") {
              const qData = (mockTests.find(t => t.id === pdfMockTestId)?.questions as any[] || []).find((q: any) => q.id === event.questionId);
              setPdfLiveFeed(prev => prev ? { ...prev, currentQ: qData || { question_text: event.questionText, id: event.questionId }, currentExplanation: "", progress: event.index } : null);
            } else if (event.type === "batch_tokens") {
              cumInput = event.tokens?.input || 0;
              cumOutput = event.tokens?.output || 0;
              cumThoughts = event.tokens?.thoughts || 0;
              setPdfLiveFeed(prev => prev ? { ...prev, totalInputTokens: cumInput, totalOutputTokens: cumOutput, totalThoughtsTokens: cumThoughts } : null);
            } else if (event.type === "result") {
              const thoughts = event.tokens?.thoughts || 0;
              const isHighThinking = thoughts > 8000;
              cumInput += event.tokens?.input || 0;
              cumOutput += event.tokens?.output || 0;
              cumThoughts += thoughts;
              const qData = (mockTests.find(t => t.id === pdfMockTestId)?.questions as any[] || []).find((q: any) => q.id === event.questionId);
              setPdfLiveFeed(prev => prev ? {
                ...prev,
                fixed: event.fixed, failed: event.failed,
                currentExplanation: event.explanation || "", currentMismatch: event.isMismatch,
                currentAIDetectedAnswer: event.aiDetectedAnswer, currentHighThinkingFlag: isHighThinking,
                currentPdfSourced: typeof event.pdfSourced === "boolean" ? event.pdfSourced : null,
                totalInputTokens: cumInput, totalOutputTokens: cumOutput, totalThoughtsTokens: cumThoughts,
                log: [...prev.log, {
                  id: event.questionId,
                  text: event.status === "ok" ? (event.explanation || "").substring(0, 80) + "..." : `Failed: ${event.error || ""}`,
                  status: event.status, question: qData || { question_text: "", id: event.questionId },
                  explanation: event.explanation || "", isMismatch: event.isMismatch,
                  aiDetectedAnswer: event.aiDetectedAnswer,
                  pdfSourced: typeof event.pdfSourced === "boolean" ? event.pdfSourced : null,
                  tokens: event.tokens ? { input: event.tokens.input, output: event.tokens.output } : undefined,
                  thoughts, highThinkingFlag: isHighThinking,
                }],
              } : null);
            } else if (event.type === "done") {
              setPdfLiveFeed(prev => prev ? { ...prev, done: true, fixed: event.fixed, failed: event.failed, progress: event.total } : null);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setPdfProcessing(false);
    }
  };

  if (!mockTests || mockTests.length === 0) return null;

  return (
    <>
      {/* Batch log preview */}
      {logPreview && (
        <QuestionPreviewModal
          preview={{ question: logPreview.question, explanation: logPreview.explanation }}
          testId={liveFeed?.mock_test_id}
          onClose={() => setLogPreview(null)}
          accentClass="purple"
        />
      )}

      {/* Batch live feed */}
      {liveFeed && (
        <LiveFeedModal
          feed={liveFeed}
          variant="batch"
          onClose={() => setLiveFeed(null)}
          onPreview={(entry) => setLogPreview(entry)}
          onFlagCurrent={async () => {
            const testId = liveFeed.mock_test_id;
            if (!testId || !liveFeed.currentQ) return;
            await toggleManualFlag(liveFeed.currentQ.id, "MockQuestion", testId, true);
            setLiveFeed(prev => {
              if (!prev) return null;
              const log = [...prev.log];
              if (log.length) log[log.length - 1] = { ...log[log.length - 1], isMismatch: true };
              return { ...prev, log, currentMismatch: true };
            });
          }}
        />
      )}

      {/* PDF log preview */}
      {pdfLogPreview && (
        <QuestionPreviewModal
          preview={{ question: pdfLogPreview.question, explanation: pdfLogPreview.explanation }}
          testId={pdfLiveFeed?.mock_test_id}
          onClose={() => setPdfLogPreview(null)}
          accentClass="indigo"
        />
      )}

      {/* PDF live feed */}
      {pdfLiveFeed && (
        <LiveFeedModal
          feed={pdfLiveFeed}
          variant="pdf"
          onClose={() => setPdfLiveFeed(null)}
          onPreview={(entry) => setPdfLogPreview(entry)}
          onFlagCurrent={async () => {
            if (!pdfLiveFeed.mock_test_id || !pdfLiveFeed.currentQ) return;
            await toggleManualFlag(pdfLiveFeed.currentQ.id, "MockQuestion", pdfLiveFeed.mock_test_id, true);
            setPdfLiveFeed(prev => {
              if (!prev) return null;
              const log = [...prev.log];
              if (log.length) log[log.length - 1] = { ...log[log.length - 1], isMismatch: true };
              return { ...prev, log, currentMismatch: true };
            });
          }}
        />
      )}

      {/* PDF panel */}
      <div className="mb-6">
        <button
          onClick={() => setShowPdfPanel(!showPdfPanel)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 transition-colors mb-4"
        >
          📄 Generate from Reference PDF
          <span className="text-xs opacity-60">{showPdfPanel ? '▲' : '▼'}</span>
        </button>
        {showPdfPanel && (
          <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm mb-6">
            <p className="text-xs text-gray-500 mb-4">
              Upload an official reference solution PDF (e.g. GATE answer key PDF). Gemini will read it and generate
              its own detailed explanations for all questions in the selected paper that are missing explanations in the DB.
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Select Paper</label>
                <select
                  value={pdfMockTestId}
                  onChange={(e) => setPdfMockTestId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-700 text-sm outline-none"
                >
                  <option value="">-- Choose a mock test / paper --</option>
                  {mockTests.map((t: any) => {
                    const missing = reports.filter((r: any) => r.isMock && r.mock_test_id === t.id && r.status === "pending" && isMissingExplanation(r.q)).length;
                    if (missing === 0) return null;
                    return <option key={t.id} value={t.id}>{t.title} ({t.exam_type}) — {missing} missing</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Reference Solution PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700 dark:file:bg-indigo-500/10 dark:file:text-indigo-400 hover:file:bg-indigo-200 dark:hover:file:bg-indigo-500/20 cursor-pointer"
                />
                {pdfFile && <p className="text-[10px] text-green-500 font-bold mt-1">📎 {pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)</p>}
              </div>
              <button
                onClick={handlePdfGenerate}
                disabled={pdfProcessing || !pdfMockTestId || !pdfFile}
                className={`self-start px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  pdfProcessing ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-wait animate-pulse"
                  : !pdfMockTestId || !pdfFile ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed"
                  : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/20"
                }`}
              >
                {pdfProcessing ? "⏳ Generating..." : "🚀 Generate Explanations from PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch AI panel */}
      <div className="mb-6">
        <button
          onClick={() => setShowBatchPanel(!showBatchPanel)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/20 transition-colors mb-4"
        >
          ✨ AI Batch Explanation Generator
          <span className="text-xs opacity-60">{showBatchPanel ? '▲' : '▼'}</span>
        </button>
        {showBatchPanel && (
          <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm mb-6">
            <p className="text-xs text-gray-500 mb-4">Select a mock test below to auto-generate explanations for all questions missing them.</p>
            <div className="flex flex-col gap-3">
              {mockTests.map((test: any) => {
                const missing = reports.filter((r: any) => r.isMock && r.mock_test_id === test.id && r.status === "pending" && isMissingExplanation(r.q)).length;
                if (missing === 0) return null;
                const isProcessing = batchProcessing === test.id;
                return (
                  <div key={test.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-800">
                    <div>
                      <div className="font-bold text-sm">{test.title}</div>
                      <div className="text-[10px] text-gray-500">
                        {test.exam_type} · <span className={missing > 0 ? "text-red-500 font-bold" : "text-green-500"}>{missing} missing</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedAIModel}
                        onChange={(e) => onModelChange(e.target.value as AIModel)}
                        className="px-2 py-2 rounded-lg text-[10px] font-bold bg-white dark:bg-zinc-800 border dark:border-zinc-700 outline-none"
                      >
                        {AI_MODEL_OPTIONS.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleBatchProcess(test.id)}
                        disabled={isProcessing || missing === 0}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                          missing === 0 ? "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400 cursor-default"
                          : isProcessing ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 animate-pulse"
                          : "bg-purple-500 text-white hover:bg-purple-600"
                        }`}
                      >
                        {missing === 0 ? "✅ Complete" : isProcessing ? "⏳ Processing..." : `Generate ${missing} Explanations`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {batchResult && (
              <div className="mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-sm text-green-800 dark:text-green-300">
                ✅ Last batch: {batchResult.fixed} fixed, {batchResult.failed} failed, {batchResult.total} total questions.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
