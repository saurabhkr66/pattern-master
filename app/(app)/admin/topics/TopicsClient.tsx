"use client";

import { useState, useMemo } from "react";
import { generateQuestionTopic, updateMockTestQuestionTopic } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";

interface TopicsClientProps {
  mockTests: any[];
  availableTopics: Record<string, Record<string, string[]>>;
}

export default function TopicsClient({ mockTests, availableTopics }: TopicsClientProps) {
  const [showBatchPanel, setShowBatchPanel] = useState(true);
  const [batchProcessing, setBatchProcessing] = useState<string | null>(null);
  const [selectedAIModel, setSelectedAIModel] = useState<"gemini" | "gpt-4o-mini">("gpt-4o-mini");
  const [batchResult, setBatchResult] = useState<{ total: number; fixed: number; failed: number } | null>(null);

  // Live feed state
  const [liveFeed, setLiveFeed] = useState<{
    testTitle: string;
    currentQ: any;
    currentTopic: string;
    progress: number;
    total: number;
    fixed: number;
    failed: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    log: { id: string; text: string; status: "ok" | "fail"; question: any; topic: string; tokens?: { input: number; output: number } }[];
    done: boolean;
  } | null>(null);

  const [logPreview, setLogPreview] = useState<{ question: any; topic: string } | null>(null);

  const handleBatchProcess = async (testId: string) => {
    const test = mockTests.find(t => t.id === testId);
    if (!test) return;

    const questions = (test.questions as any[]) || [];
    // We categorize questions that don't have a topic or where topic is "Unknown"
    const missingQs = questions.filter(q => !q.topic || q.topic === "Unknown");

    if (missingQs.length === 0) {
      alert("All questions in this test already have topics assigned.");
      return;
    }

    // Normalize lookup: "JEE_MAIN" or "JEE Main" both become "JEE_MAIN"
    const normalizedExam = test.exam_type.toUpperCase().replace(/\s+/g, '_');
    const examMap = availableTopics[normalizedExam];

    if (!examMap) {
      alert(`No topics found in the database for exam type: ${test.exam_type}. Please seed topics for this exam first.`);
      return;
    }

    // Get a flat list of all topics for this exam (as a fallback)
    const allExamTopics = Object.values(examMap).flat();

    const confirmed = confirm(`Categorize ${missingQs.length} questions in "${test.title}" using AI? (Stricter Subject-Level filtering enabled)`);
    if (!confirmed) return;

    setBatchProcessing(testId);
    setLiveFeed({
      testTitle: test.title,
      currentQ: null,
      currentTopic: "",
      progress: 0,
      total: missingQs.length,
      fixed: 0,
      failed: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      log: [],
      done: false,
    });
    
    let fixed = 0;
    let failed = 0;
    let cumulativeInput = 0;
    let cumulativeOutput = 0;

    for (let i = 0; i < missingQs.length; i++) {
      const q = missingQs[i];
      
      // Determine subject-specific topics
      const qSubject = (q.subject || q.sectionName || "").toUpperCase().trim();
      let targetedTopics = examMap[qSubject] || allExamTopics;

      setLiveFeed(prev => prev ? {
        ...prev,
        currentQ: q,
        currentTopic: "",
        progress: i,
      } : null);

      try {
        // 1. Generate Topic via AI (Using targeted topics for this specific subject)
        const result = await generateQuestionTopic(
          q.question_text || "",
          (q.options as string[]) || [],
          targetedTopics,
          (q.images as any[]) || [],
          selectedAIModel
        );
        
        const topic = result.topic;
        const usage = result.usage;
        
        // 2. Save to MockTest JSON
        await updateMockTestQuestionTopic(testId, q.id, topic);
        
        fixed++;
        cumulativeInput += usage.input;
        cumulativeOutput += usage.output;
        
        setLiveFeed(prev => prev ? {
          ...prev,
          currentTopic: topic,
          fixed,
          totalInputTokens: cumulativeInput,
          totalOutputTokens: cumulativeOutput,
          log: [...prev.log, { 
            id: q.id, 
            text: (q.question_text || "").substring(0, 80) + "...", 
            status: "ok",
            question: q,
            topic,
            tokens: usage
          }],
        } : null);
      } catch (err) {
        console.error("Failed to categorize", err);
        failed++;
        setLiveFeed(prev => prev ? {
          ...prev,
          failed,
          log: [...prev.log, { 
            id: q.id, 
            text: (q.question_text || "").substring(0, 80) + "...", 
            status: "fail",
            question: q,
            topic: "Error",
          }],
        } : null);
      }


    }

    setLiveFeed(prev => prev ? { ...prev, done: true, progress: missingQs.length } : null);
    setBatchProcessing(null);
    setBatchResult({ total: questions.length, fixed, failed });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* LOG PREVIEW POPUP */}
      {logPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
              <span className="text-sm font-black">Question Preview</span>
              <button onClick={() => setLogPreview(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs">✕</button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Question</div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 text-xs">
                  <MathRenderer content={logPreview.question.question_text || ""} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">AI Assigned Topic</div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 text-sm font-bold text-blue-600 dark:text-blue-400">
                  {logPreview.topic}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE FEED MODAL */}
      {liveFeed && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 flex flex-col max-h-[80vh]">
            
            <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  {liveFeed.done ? "✅" : "🧠"} AI Topic Generator
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">{liveFeed.testTitle}</p>
              </div>
              {liveFeed.done && (
                <button 
                  onClick={() => setLiveFeed(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs"
                >✕</button>
              )}
            </div>

            <div className="px-4 pt-3">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>{liveFeed.progress} / {liveFeed.total}</span>
                <span className="flex gap-3">
                  <span className="text-green-500">✅ {liveFeed.fixed}</span>
                  {liveFeed.failed > 0 && <span className="text-red-500">❌ {liveFeed.failed}</span>}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${(liveFeed.progress / liveFeed.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {liveFeed.currentQ && !liveFeed.done && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">Analyzing Question</div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 text-xs text-gray-700 dark:text-gray-300">
                    <MathRenderer content={liveFeed.currentQ.question_text || ""} />
                  </div>
                </div>
              )}

              {liveFeed.currentTopic && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1.5">Detected Topic</div>
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 text-sm font-black text-green-700 dark:text-green-400">
                    {liveFeed.currentTopic}
                  </div>
                </div>
              )}

              {liveFeed.log.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Processing Log</div>
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {[...liveFeed.log].reverse().map((entry, i) => (
                      <button 
                        key={i} 
                        onClick={() => setLogPreview({ question: entry.question, topic: entry.topic })}
                        className="flex items-center gap-2 text-[10px] text-gray-500 py-1.5 px-2 rounded bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left w-full"
                      >
                        <span className="flex-shrink-0">{entry.status === "ok" ? "✅" : "❌"}</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300 w-24 truncate">{entry.topic}</span>
                        <span className="truncate flex-1">{entry.text}</span>
                        {entry.tokens && (
                          <span className="flex-shrink-0 text-[8px] bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded flex gap-2">
                            <span className="text-blue-500">↑{entry.tokens.input}</span>
                            <span className="text-indigo-500">↓{entry.tokens.output}</span>
                          </span>
                        )}
                        <span className="text-gray-300">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {liveFeed.done && (
                <div className="mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-center">
                  <div className="text-2xl mb-2">🎓</div>
                  <div className="text-sm font-bold text-green-800 dark:text-green-300">Categorization Complete!</div>
                  <div className="text-[10px] text-green-600 dark:text-green-400 mt-1">
                    {liveFeed.fixed} questions mapped to topics.
                  </div>
                  
                  {/* Token Stats Summary */}
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-500/20 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <div className="flex flex-col gap-1">
                      <span>Input Tokens</span>
                      <span className="text-gray-900 dark:text-white">{liveFeed.totalInputTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span>Output Tokens</span>
                      <span className="text-gray-900 dark:text-white">{liveFeed.totalOutputTokens.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Real-time Token Footer */}
            {!liveFeed.done && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-black/20 border-t dark:border-zinc-800 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-400">
                <span>Live Token Usage</span>
                <div className="flex gap-4">
                  <span className="text-blue-500">In: {liveFeed.totalInputTokens}</span>
                  <span className="text-indigo-500">Out: {liveFeed.totalOutputTokens}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SELECTION PANEL */}
      <div className="grid grid-cols-1 gap-4">
        {mockTests.map((test) => {
          const questions = (test.questions as any[]) || [];
          const missing = questions.filter(q => !q.topic || q.topic === "Unknown").length;
          const isProcessing = batchProcessing === test.id;
          
          return (
            <div key={test.id} className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{test.title}</h3>
                <div className="text-[10px] text-gray-500 flex gap-2 items-center mt-1">
                  <span>{test.exam_type}</span>
                  <span>•</span>
                  <span>{questions.length} Questions</span>
                  <span>•</span>
                  <span className={missing > 0 ? "text-amber-500 font-bold" : "text-green-500"}>
                    {missing > 0 ? `${missing} uncategorized` : "All Categorized"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedAIModel}
                  onChange={(e) => setSelectedAIModel(e.target.value as any)}
                  className="px-2 py-2 rounded-lg text-[10px] font-bold bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-700 outline-none"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gemini">Gemini Flash</option>
                </select>
                <button
                  onClick={() => handleBatchProcess(test.id)}
                  disabled={isProcessing || missing === 0}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    missing === 0
                      ? "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400 cursor-default"
                      : isProcessing
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 animate-pulse"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  }`}
                >
                  {missing === 0 ? "✅ Done" : isProcessing ? "⏳ Running..." : `Categorize ${missing} Qs`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
