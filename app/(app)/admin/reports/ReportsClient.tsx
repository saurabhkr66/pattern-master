"use client";

import { useState, useMemo } from "react"; // AI Model selection enabled 2026-05-03
import { resolveReport, deleteQuestion, generateAIExplanation, processMockTestExplanations, toggleManualFlag } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";
import { EXAM_CONFIGS, GATE_BRANCHES } from "@/lib/examConfigs";

export default function ReportsClient({ reports, mockTests }: { reports: any[], mockTests?: any[] }) {
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [filterExam, setFilterExam] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Reset subject filter when exam filter changes
  const handleExamChange = (newExam: string) => {
    setFilterExam(newExam);
    setFilterSubject("all");
  };

  const [formData, setFormData] = useState({
    question_text: "",
    correct_answer: "",
    explanation: "",
    options: [] as string[],
    images: [] as any[],
    ai_answer_mismatch: false,
    ai_detected_answer: null as string | null
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{total: number, fixed: number, failed: number} | null>(null);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [isScanningLatex, setIsScanningLatex] = useState(false);
  const [latexReports, setLatexReports] = useState<any[]>([]);
  const [selectedAIModel, setSelectedAIModel] = useState<"gemini" | "gpt-4o-mini">("gemini");

  // Process reports to extract exam, subject, and type for easier filtering and display
  const processedReports = useMemo(() => {
    return reports.map(r => {
      const q = r.q || r.question || r.pyq || r.subject_pyq;
      let exam = "Other";
      let subject = "Other";
      let type = "Generated";

      if (r.subject_pyq) {
        exam = r.subject_pyq.subject_pattern?.exam_type || "GATE";
        subject = r.subject_pyq.subject_pattern?.subject_name || "Unknown";
        type = "SubjectPYQ";
      } else if (r.pyq) {
        exam = r.pyq.exam_type || r.pyq.pattern?.exam_type || "GATE";
        subject = r.pyq.pattern?.subject || "Unknown";
        type = "PYQ";
      } else if (r.question) {
        exam = r.question.pattern?.exam_type || "GATE";
        subject = r.question.pattern?.subject || "Unknown";
        type = "Generated";
      } else if (r.isMock) {
        exam = r.exam_type || "Unknown";
        subject = r.subject || "Unknown";
        type = "Mock";
      }

      return { ...r, exam, subject, type, q };
    });
  }, [reports, latexReports]);

  const allProcessedReports = useMemo(() => {
    const latexProcessed = latexReports.map(lr => {
      const q = lr.q || lr.question || lr.pyq || lr.subject_pyq;
      let exam = "Other";
      let subject = "Other";
      let type = "Generated";

      if (lr.subject_pyq) {
        exam = lr.subject_pyq.subject_pattern?.exam_type || "GATE";
        subject = lr.subject_pyq.subject_pattern?.subject_name || "Unknown";
        type = "SubjectPYQ";
      } else if (lr.pyq) {
        exam = lr.pyq.exam_type || lr.pyq.pattern?.exam_type || "GATE";
        subject = lr.pyq.pattern?.subject || "Unknown";
        type = "PYQ";
      } else if (lr.question) {
        exam = lr.question.pattern?.exam_type || "GATE";
        subject = lr.question.pattern?.subject || "Unknown";
        type = "Generated";
      }
      return { ...lr, exam, subject, type, q };
    });

    // Put LaTeX issues at the top, followed by existing reports
    return [...latexProcessed, ...processedReports];
  }, [processedReports, latexReports]);

  // Unique values for filters
  const exams = useMemo(() => {
    const standardExams = EXAM_CONFIGS.map(e => e.examType);
    const foundExams = allProcessedReports.map(r => r.exam);
    return Array.from(new Set([...standardExams, ...foundExams])).sort();
  }, [allProcessedReports]);

  const subjects = useMemo(() => {
    const foundSubjects = allProcessedReports
      .filter(r => filterExam === "all" || r.exam === filterExam)
      .map(r => r.subject);

    let configSubjects: string[] = [];
    if (filterExam === "all") {
      // Collect all subjects from all configs
      EXAM_CONFIGS.forEach(config => {
        config.sections.forEach(sec => {
          if (sec.name) configSubjects.push(sec.name);
          if (sec.subjects) configSubjects.push(...sec.subjects);
        });
      });
      configSubjects.push(...GATE_BRANCHES.map(b => b.id));
    } else {
      const config = EXAM_CONFIGS.find(e => e.examType === filterExam);
      if (config) {
        config.sections.forEach(sec => {
          if (sec.name) configSubjects.push(sec.name);
          if (sec.subjects) configSubjects.push(...sec.subjects);
        });
      }
      if (filterExam === "GATE") {
        configSubjects.push(...GATE_BRANCHES.map(b => b.id));
      }
    }

    return Array.from(new Set([...configSubjects, ...foundSubjects])).filter(s => s && s !== "Other" && s !== "Unknown").sort();
  }, [allProcessedReports, filterExam]);

  const types = ["PYQ", "SubjectPYQ", "Mock", "Generated"];

  // Filtered reports
  const filteredReports = useMemo(() => {
    return allProcessedReports.filter(r => {
      if (filterExam !== "all" && r.exam !== filterExam) return false;
      if (filterSubject !== "all" && r.subject !== filterSubject) return false;
      if (filterType !== "all" && r.type !== filterType) return false;
      return true;
    });
  }, [allProcessedReports, filterExam, filterSubject, filterType]);

  const openEditor = (report: any) => {
    const questionData = report.q;
    
    let questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | "MockQuestion" = "GeneratedQuestion";
    if (report.subject_pyq_id) questionType = "SubjectPYQ";
    else if (report.pyq_id) questionType = "PYQ";
    else if (report.isMock) questionType = "MockQuestion";

    setEditingReport({
      ...report,
      questionData,
      questionType,
      questionId: report.subject_pyq_id || report.pyq_id || report.question_id || report.mock_question_id
    });

    setFormData({
      question_text: questionData?.question_text || "",
      correct_answer: questionData?.correct_answer || "",
      explanation: questionData?.explanation || "",
      options: (questionData?.options as string[]) || [],
      images: (questionData?.images as any[]) || [],
      ai_answer_mismatch: questionData?.ai_answer_mismatch || false,
      ai_detected_answer: questionData?.ai_detected_answer || null
    });
  };

  const handleSave = async () => {
    if (!editingReport) return;
    setIsSaving(true);
    try {
      await resolveReport(
        editingReport.id,
        editingReport.questionId,
        editingReport.questionType,
        {
          ...formData,
          mockTestId: editingReport.mock_test_id
        }
      );
      
      // If this was a diagnostic report, remove it from the local list immediately
      if (editingReport.id.startsWith("auto-latex-")) {
        setLatexReports(prev => prev.filter(r => r.id !== editingReport.id));
      }
      
      setEditingReport(null);
    } catch (error) {
      console.error("Failed to resolve", error);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingReport) return;
    const confirmed = confirm("🚨 Are you absolutely sure you want to DELETE this entire question from the database? This cannot be undone.");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteQuestion(
        editingReport.questionId, 
        editingReport.questionType,
        editingReport.mock_test_id
      );
      setEditingReport(null);
    } catch (error) {
      console.error("Failed to delete", error);
      alert("Failed to delete question.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!editingReport) return;
    console.log(`[CLIENT] Requesting AI explanation using model: ${selectedAIModel}`);
    setIsGeneratingAI(true);
    try {
      const result = await generateAIExplanation(
        editingReport.questionId,
        editingReport.questionType,
        editingReport.mock_test_id,
        selectedAIModel
      );
      setFormData({ 
        ...formData, 
        explanation: (result as any).explanation,
        ai_answer_mismatch: (result as any).isMismatch || false,
        ai_detected_answer: (result as any).aiDetectedAnswer || null
      });
    } catch (error) {
      console.error("AI generation failed", error);
      alert("Failed to generate explanation. Check console for details.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Live feed state
  const [liveFeed, setLiveFeed] = useState<{
    testTitle: string;
    currentQ: any;
    currentExplanation: string;
    currentMismatch?: boolean;
    currentAIDetectedAnswer?: string | null;
    mock_test_id?: string;
    progress: number;
    total: number;
    fixed: number;
    failed: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    log: { 
      id: string; 
      text: string; 
      status: "ok" | "fail"; 
      question: any; 
      explanation: string; 
      isMismatch?: boolean;
      aiDetectedAnswer?: string | null;
      tokens?: { input: number; output: number } 
    }[];
    done: boolean;
  } | null>(null);

  const [logPreview, setLogPreview] = useState<{ question: any; explanation: string } | null>(null);

  const handleBatchProcess = async (testId: string) => {
    const test = mockTests?.find(t => t.id === testId);
    if (!test) return;

    const confirmed = confirm(`This will generate AI explanations for all missing questions in "${test.title}". Continue?`);
    if (!confirmed) return;

    const questions = (test.questions as any[]) || [];
    const missingQs = questions.filter(q => !q.explanation || q.explanation.trim() === "");

    if (missingQs.length === 0) return;

    setBatchProcessing(testId);
    setLiveFeed({
      testTitle: test.title,
      currentQ: null,
      currentExplanation: "",
      currentMismatch: false,
      currentAIDetectedAnswer: null,
      mock_test_id: testId,
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

      setLiveFeed(prev => prev ? {
        ...prev,
        currentQ: q,
        currentExplanation: "",
        progress: i,
      } : null);

      try {
        // 1. Generate Explanation via AI
        const result = await generateAIExplanation(q.id, "MockQuestion", testId, selectedAIModel);
        
        const explanation = (result as any).explanation;
        const usage = (result as any).usage;
        const isMismatch = (result as any).isMismatch;
        const aiDetectedAnswer = (result as any).aiDetectedAnswer;
        
        // 2. Save Explanation
        await resolveReport("auto-" + q.id, q.id, "MockQuestion", { explanation, mockTestId: testId });
        
        fixed++;
        cumulativeInput += usage.input;
        cumulativeOutput += usage.output;
        
        setLiveFeed(prev => prev ? {
          ...prev,
          currentExplanation: explanation,
          currentMismatch: isMismatch,
          currentAIDetectedAnswer: aiDetectedAnswer,
          fixed,
          totalInputTokens: cumulativeInput,
          totalOutputTokens: cumulativeOutput,
          log: [...prev.log, { 
            id: q.id, 
            text: (q.question_text || "").substring(0, 80) + "...", 
            status: "ok",
            question: q,
            explanation,
            isMismatch,
            aiDetectedAnswer,
            tokens: usage
          }],
        } : null);
      } catch (err) {
        failed++;
        setLiveFeed(prev => prev ? {
          ...prev,
          failed,
          log: [...prev.log, { 
            id: q.id, 
            text: (q.question_text || "").substring(0, 80) + "...", 
            status: "fail",
            question: q,
            explanation: "",
          }],
        } : null);
      }
    }

    setLiveFeed(prev => prev ? { ...prev, done: true, progress: missingQs.length } : null);
    setBatchProcessing(null);
    setBatchResult({ total: questions.length, fixed, failed });
  };

  const handleScanLatex = async () => {
    setIsScanningLatex(true);
    try {
      const res = await fetch("/api/admin/scan-latex");
      const data = await res.json();
      if (data.results) {
        setLatexReports(data.results);
      }
    } catch (error) {
      console.error("Scan failed", error);
    } finally {
      setIsScanningLatex(false);
    }
  };

  return (
    <>
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
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 text-xs"><MathRenderer content={logPreview.question.question_text || ""} /></div>
              </div>
              {logPreview.question.options && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Options</div>
                  <div className="flex flex-col gap-1">
                    {(logPreview.question.options as string[]).map((opt: string, i: number) => (
                      <div key={i} className={`p-2 rounded-lg text-xs border ${opt === logPreview.question.correct_answer ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 font-bold" : "bg-gray-50 dark:bg-black/20 dark:border-zinc-800"}`}>
                        <span className="font-bold text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] font-bold text-green-500 uppercase mb-1">Correct Answer</div>
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-xs font-bold">{logPreview.question.correct_answer}</div>
              </div>
              {logPreview.explanation && (
                <div>
                  <div className="text-[10px] font-bold text-purple-500 uppercase mb-1">AI Explanation</div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 text-xs"><MathRenderer content={logPreview.explanation} /></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIVE FEED MODAL */}
      {liveFeed && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border dark:border-zinc-800 flex flex-col max-h-[80vh]">
            
            {/* Header */}
            <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  {liveFeed.done ? "✅" : "⚡"} AI Explanation Generator
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

            {/* Progress Bar */}
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
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${(liveFeed.progress / liveFeed.total) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Question */}
            <div className="p-4 flex-1 overflow-y-auto">
              {liveFeed.currentQ && !liveFeed.done && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">Currently Processing</div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 text-xs text-gray-700 dark:text-gray-300">
                    <MathRenderer content={liveFeed.currentQ.question_text || ""} />
                  </div>
                  {/* Options & Answer */}
                  <div className="mt-2 flex flex-col gap-1">
                    {(liveFeed.currentQ.options as string[] || []).map((opt: string, i: number) => (
                      <div key={i} className={`px-2 py-1 rounded text-[10px] ${opt === liveFeed.currentQ.correct_answer ? "bg-green-100 dark:bg-green-500/10 font-bold text-green-700 dark:text-green-400" : "text-gray-500"}`}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                    <div className="text-[10px] font-bold text-green-600 dark:text-green-400 mt-1 flex items-center justify-between">
                      <span>✓ Answer: {liveFeed.currentQ.correct_answer}</span>
                      <button
                        onClick={async () => {
                          const testId = liveFeed.mock_test_id;
                          if (!testId) return;
                          await toggleManualFlag(liveFeed.currentQ.id, "MockQuestion", testId, true);
                          // Optionally update local log to show it's flagged
                          setLiveFeed(prev => {
                            if (!prev) return null;
                            const newLog = [...prev.log];
                            const lastIdx = newLog.length - 1;
                            if (lastIdx >= 0) newLog[lastIdx] = { ...newLog[lastIdx], isMismatch: true };
                            return { ...prev, log: newLog, currentMismatch: true };
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[8px] font-black uppercase hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                      >
                        🚩 Flag Incorrect
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Latest Generated Explanation */}
              {liveFeed.currentExplanation && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1.5">
                    {liveFeed.done ? "Last Generated" : "Generated Explanation"}
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 text-xs text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">
                    <MathRenderer content={liveFeed.currentExplanation} />
                  </div>
                  {/* MISMATCH WARNING */}
                  {liveFeed.currentMismatch && (
                    <div className="mt-2 p-2 rounded-lg bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 flex items-center gap-2">
                      <span className="text-sm">⚠️</span>
                      <span className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider">
                        AI Mismatch: AI thinks the answer is {liveFeed.currentAIDetectedAnswer}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Completed Log */}
              {liveFeed.log.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Processing Log</div>
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {[...liveFeed.log].reverse().map((entry, i) => (
                      <button 
                        key={i} 
                        onClick={() => setLogPreview({ question: entry.question, explanation: entry.explanation })}
                        className="flex items-center gap-2 text-[10px] text-gray-500 py-1.5 px-2 rounded bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left w-full"
                      >
                        <span className="flex-shrink-0">{entry.status === "ok" ? "✅" : "❌"}</span>
                        <span className="truncate flex-1">{entry.text}</span>
                        {entry.isMismatch && <span className="text-[10px] flex-shrink-0">⚠️</span>}
                        {entry.tokens && (
                          <span className="flex-shrink-0 text-[8px] bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded flex gap-2">
                            <span className="text-purple-500">↑{entry.tokens.input}</span>
                            <span className="text-pink-500">↓{entry.tokens.output}</span>
                          </span>
                        )}
                        <span className="text-gray-300">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Done Message */}
              {liveFeed.done && (
                <div className="mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-center">
                  <div className="text-2xl mb-2">🎓</div>
                  <div className="text-sm font-bold text-green-800 dark:text-green-300">
                    {liveFeed.fixed} explanations generated and verified.
                  </div>
                  {/* Token Summary */}
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

            {/* Footer */}
            {!liveFeed.done && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-black/20 border-t dark:border-zinc-800 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse">⏳</span>
                  <span>Processing...</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-purple-500 font-black">In: {liveFeed.totalInputTokens}</span>
                  <span className="text-pink-500 font-black">Out: {liveFeed.totalOutputTokens}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BATCH AI PANEL */}
      {mockTests && mockTests.length > 0 && (
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
                  const questions = (test.questions as any[]) || [];
                  const missing = questions.filter(q => !q.explanation || q.explanation.trim() === "").length;
                  const isProcessing = batchProcessing === test.id;
                  return (
                    <div key={test.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-zinc-800">
                      <div>
                        <div className="font-bold text-sm">{test.title}</div>
                        <div className="text-[10px] text-gray-500">
                          {test.exam_type} · {questions.length} Qs · <span className={missing > 0 ? "text-red-500 font-bold" : "text-green-500"}>{missing} missing</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedAIModel}
                          onChange={(e) => setSelectedAIModel(e.target.value as any)}
                          className="px-2 py-2 rounded-lg text-[10px] font-bold bg-white dark:bg-zinc-800 border dark:border-zinc-700 outline-none"
                        >
                          <option value="gemini">Gemini Flash</option>
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                        </select>
                        <button
                          onClick={() => handleBatchProcess(test.id)}
                          disabled={isProcessing || missing === 0}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                            missing === 0
                              ? "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400 cursor-default"
                              : isProcessing
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 animate-pulse"
                              : "bg-purple-500 text-white hover:bg-purple-600"
                          }`}
                        >
                          {missing === 0 ? "✅ Complete" : isProcessing ? `⏳ Processing...` : `Generate ${missing} Explanations`}
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
      )}

      {/* LATEX HEALTH PANEL */}
      <div className="mb-8 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <h3 className="text-sm font-black mb-1">LaTeX Health Diagnostic</h3>
        <p className="text-xs text-gray-500 max-w-sm mb-4">Run a server-side scan to detect broken formulas, undefined Greek letters, or unescaped characters across your database.</p>
        <button 
          onClick={handleScanLatex}
          disabled={isScanningLatex}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
            isScanningLatex 
              ? "bg-gray-100 text-gray-400 dark:bg-zinc-800 animate-pulse cursor-wait" 
              : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20"
          }`}
        >
          {isScanningLatex ? "🔍 Scanning Database..." : "🚀 Run Health Scan"}
        </button>
        {latexReports.length > 0 && (
          <div className="mt-4 text-[10px] font-black text-red-500 uppercase tracking-widest">
            ⚠️ {latexReports.length} Issues Detected
          </div>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="mb-8 p-4 bg-gray-50 dark:bg-zinc-900/50 border dark:border-zinc-800 rounded-2xl flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Exam</label>
          <select 
            value={filterExam} 
            onChange={(e) => handleExamChange(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"
          >
            <option value="all">All Exams</option>
            {exams.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Subject</label>
          <select 
            value={filterSubject} 
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Type</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"
          >
            <option value="all">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button 
          onClick={() => { setFilterExam("all"); setFilterSubject("all"); setFilterType("all"); }}
          className="p-2.5 px-4 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Reset
        </button>
      </div>

      {filteredReports.length === 0 ? (
        <div className="text-center py-20 border rounded-2xl bg-gray-50 dark:bg-zinc-900/50 dark:border-zinc-800">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No reports found!</h3>
          <p className="text-gray-500">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredReports.map((r: any) => {
            const q = r.q;
            return (
              <div key={r.id} className="p-6 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                
                {/* Report Info */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        {r.reason}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] font-bold uppercase">
                        {r.exam}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-[10px] font-bold uppercase">
                        {r.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 text-[10px] font-bold uppercase">
                        {r.type}
                      </span>
                    </div>
                    <div className="text-right text-[10px] text-gray-400 font-medium">
                      {r.user?.email || 'Unknown'} <br/>
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {r.details && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-white/5 text-sm text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                      <strong>{r.reason === "LaTeX Error" ? "Diagnostic Details" : "User Comment"}:</strong> {r.details}
                    </div>
                  )}
                  
                  {/* Sneak peek of the question */}
                  {q && (
                    <div className="text-sm text-gray-500 line-clamp-2 mb-4 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border dark:border-zinc-800">
                       <MathRenderer content={q.question_text} />
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-gray-400 font-mono">
                      ID: {r.subject_pyq_id || r.pyq_id || r.question_id || r.mock_question_id}
                    </div>
                    <button 
                      onClick={() => openEditor(r)}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm"
                    >
                      Review & Fix Issue
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK EDIT MODAL */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">Fix Question</h3>
                <p className="text-sm text-gray-500 font-mono mt-1">ID: {editingReport.questionId} ({editingReport.questionType})</p>
              </div>
              <button onClick={() => setEditingReport(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-5 flex-1">
              
              {/* User Complaint Reminder */}
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-sm text-red-800 dark:text-red-300">
                <strong>Complaint ({editingReport.reason}):</strong> {editingReport.details || "No extra details provided."}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question Text (Supports LaTeX)</label>
                <textarea 
                  value={formData.question_text}
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                  className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 focus:border-amber-500 outline-none"
                  rows={4}
                />
                {formData.question_text && (
                  <div className="mt-2 p-3 border dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm">
                    <span className="text-[10px] uppercase font-bold text-amber-500 mb-2 block">Live Preview</span>
                    <MathRenderer content={formData.question_text} />
                  </div>
                )}
              </div>

              {/* IMAGES SECTION */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question Images</label>
                <div className="flex flex-col gap-3">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-black/20 p-3 rounded-xl border dark:border-zinc-800">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="filename.png"
                          value={img.filename} 
                          onChange={(e) => {
                            const newImages = [...formData.images];
                            newImages[idx].filename = e.target.value;
                            setFormData({...formData, images: newImages});
                          }}
                          className="p-2 rounded bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-xs"
                        />
                        <select 
                          value={img.type || "question"}
                          onChange={(e) => {
                            const newImages = [...formData.images];
                            newImages[idx].type = e.target.value;
                            setFormData({...formData, images: newImages});
                          }}
                          className="p-2 rounded bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-xs"
                        >
                          <option value="question">Question</option>
                          <option value="explanation">Explanation</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => {
                          const newImages = formData.images.filter((_, i) => i !== idx);
                          setFormData({...formData, images: newImages});
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setFormData({...formData, images: [...formData.images, { index: formData.images.length + 1, filename: "", type: "question" }]})}
                    className="text-xs font-bold text-amber-500 hover:underline text-left w-fit"
                  >
                    + Add Image
                  </button>
                </div>
              </div>

              {/* OPTIONS SECTION */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Options</label>
                <div className="flex flex-col gap-3">
                  {formData.options.map((opt, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        <span className="font-bold text-gray-400 w-6">{String.fromCharCode(65 + idx)}.</span>
                        <textarea 
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[idx] = e.target.value;
                            setFormData({...formData, options: newOptions});
                          }}
                          className="w-full p-3 rounded-xl text-sm bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 focus:border-amber-500 outline-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                  {formData.options.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No options (Numerical Answer Type?)</p>
                  )}
                  <div className="flex gap-2">
                     <button 
                      onClick={() => setFormData({...formData, options: [...formData.options, ""]})}
                      className="text-xs font-bold text-amber-500 hover:underline"
                    >
                      + Add Option
                    </button>
                    {formData.options.length > 0 && (
                       <button 
                       onClick={() => setFormData({...formData, options: formData.options.slice(0, -1)})}
                       className="text-xs font-bold text-red-500 hover:underline"
                     >
                       - Remove Last
                     </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correct Answer (e.g., A, B, C or 45)</label>
                <input 
                  type="text"
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({...formData, correct_answer: e.target.value})}
                  className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 focus:border-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Explanation (Supports LaTeX)</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ai_answer_mismatch: !formData.ai_answer_mismatch })}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        formData.ai_answer_mismatch 
                          ? "bg-red-500 text-white" 
                          : "bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                        <line x1="4" x2="4" y1="22" y2="15"></line>
                      </svg>
                      {formData.ai_answer_mismatch ? "Flagged" : "Flag Issue"}
                    </button>
                    {formData.ai_answer_mismatch && formData.ai_detected_answer && (
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg border border-red-200 dark:border-red-500/20">
                        AI Detected: {formData.ai_detected_answer}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedAIModel}
                      onChange={(e) => setSelectedAIModel(e.target.value as any)}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-700 outline-none"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                    >
                      {isGeneratingAI ? "⏳ Generating..." : "✨ Generate AI"}
                    </button>
                  </div>
                </div>
                <textarea 
                  value={formData.explanation}
                  onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                  className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 focus:border-amber-500 outline-none"
                  rows={4}
                />
                {formData.explanation && (
                  <div className="mt-2 p-3 border dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm">
                    <span className="text-[10px] uppercase font-bold text-amber-500 mb-2 block">Live Preview</span>
                    <MathRenderer content={formData.explanation} />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t dark:border-zinc-800 flex gap-3 bg-gray-50 dark:bg-zinc-900/50 rounded-b-3xl">
              <button 
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="flex-[0.5] py-3 px-2 rounded-xl font-bold bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 shadow-sm transition-colors text-xs sm:text-sm"
              >
                {isDeleting ? "..." : "🗑️ Delete"}
              </button>
              <button 
                onClick={() => setEditingReport(null)} 
                className="flex-[0.5] py-3 rounded-xl font-bold bg-white border shadow-sm dark:bg-zinc-800 dark:border-zinc-700 text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || isDeleting}
                className="flex-1 py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-md flex justify-center items-center text-xs sm:text-sm"
              >
                {isSaving ? "Saving..." : "Save & Resolve"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
