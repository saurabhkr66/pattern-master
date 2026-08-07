"use client";

import { useState, useMemo } from "react";
import MathRenderer from "@/components/ui/MathRenderer";
import { getImageUrl } from "@/lib/imageUtils";
import { EXAM_CONFIGS, GATE_BRANCHES } from "@/lib/examConfigs";
import ReportEditorModal from "./ReportEditorModal";
import BatchProcessPanel from "./BatchProcessPanel";

// Thumbnails for a reported question, so image-related complaints can be
// triaged from the list without opening the editor. Only "explanation" is an
// explicit type — everything else is a question image.
function ReportImages({ images }: { images: any }) {
  if (!Array.isArray(images)) return null;
  const shown = images.filter((img: any) => img?.filename?.trim());
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {shown.map((img: any, idx: number) => (
        <a key={idx} href={getImageUrl(img.filename)} target="_blank" rel="noopener noreferrer" title={`${img.filename} (${img.type || "question"})`}>
          <img
            src={getImageUrl(img.filename)}
            alt=""
            className="rounded-lg border dark:border-zinc-800 bg-white dark:bg-black/30 object-contain"
            style={{ maxHeight: 96, maxWidth: 160 }}
          />
        </a>
      ))}
    </div>
  );
}

const isMissingExplanation = (q: any) => {
  const hasText = q.explanation && q.explanation.trim() !== "";
  const hasImages = q.images && (q.images as any[]).some((img: any) => img.type === "explanation");
  return !hasText && !hasImages;
};

/**
 * Sub-topic for a report. PYQ/Generated carry it on the joined Pattern;
 * mock questions store it inline on the question JSON, since a mock has no
 * Pattern row to join. Blank when it just repeats the subject — a badge that
 * says "Optics · Optics" is noise.
 */
function topicOf(r: any, subject: string): string | null {
  const raw =
    r.pyq?.pattern?.topic_name ||
    r.question?.pattern?.topic_name ||
    r.q?.pattern?.topic_name ||
    r.q?.topic_name ||
    null;
  const topic = typeof raw === "string" ? raw.trim() : "";
  if (!topic || topic.toLowerCase() === subject.toLowerCase()) return null;
  return topic;
}

function processReport(r: any) {
  const q = r.q || r.question || r.pyq;
  let exam = "Other", subject = "Other", type = "Generated";
  if (r.pyq) {
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
  return { ...r, exam, subject, topic: topicOf(r, subject), type, q };
}

export default function ReportsClient({ reports, mockTests }: { reports: any[]; mockTests?: any[] }) {
  const [localReports, setLocalReports] = useState(reports);
  const [latexReports, setLatexReports] = useState<any[]>([]);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    question_text: "", correct_answer: "", explanation: "",
    options: [] as string[], images: [] as any[],
    ai_answer_mismatch: false, ai_detected_answer: null as string | null,
    question_type: "MCQ",
  });
  const [selectedAIModel, setSelectedAIModel] = useState<"gemini" | "gpt-4o-mini">("gemini");

  // Filters
  const [filterExam, setFilterExam] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterMockId, setFilterMockId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [isScanningLatex, setIsScanningLatex] = useState(false);

  const handleExamChange = (newExam: string) => { setFilterExam(newExam); setFilterSubject("all"); };

  const processedReports = useMemo(() => localReports.map(processReport), [localReports]);

  const allProcessedReports = useMemo(() => {
    const latexProcessed = latexReports.map(lr => {
      const q = lr.q || lr.question || lr.pyq;
      let exam = "Other", subject = "Other", type = "Generated";
      if (lr.pyq) { exam = lr.pyq.exam_type || lr.pyq.pattern?.exam_type || "GATE"; subject = lr.pyq.pattern?.subject || "Unknown"; type = "PYQ"; }
      else if (lr.isMock) { exam = lr.exam_type || "JEE_MAIN"; subject = lr.subject || "Unknown"; type = "Mock"; }
      else if (lr.question) { exam = lr.question.pattern?.exam_type || "GATE"; subject = lr.question.pattern?.subject || "Unknown"; type = "Generated"; }
      return { ...lr, exam, subject, topic: topicOf(lr, subject), type, q };
    });

    let mockMissingReports: any[] = [];
    if (filterMockId !== "all" && mockTests) {
      const selectedTest = mockTests.find(t => t.id === filterMockId);
      if (selectedTest) {
        (selectedTest.questions as any[] || []).forEach(q => {
          if (isMissingExplanation(q)) {
            const exists = [...latexProcessed, ...processedReports].some(r => r.mock_question_id === q.id && r.mock_test_id === selectedTest.id);
            if (!exists) {
              mockMissingReports.push({
                id: `auto-mock-filter-${selectedTest.id}-${q.id}`,
                reason: "Missing Explanation (Filter)", status: "pending",
                created_at: new Date(), user: { email: "Mock Filter" },
                isMock: true, mock_test_id: selectedTest.id, mock_question_id: q.id,
                exam_type: selectedTest.exam_type, exam: selectedTest.exam_type,
                subject: q.subject || q.sectionName || q.topic_name || selectedTest.title,
                topic: topicOf({ q }, q.subject || q.sectionName || q.topic_name || selectedTest.title),
                type: "Mock", q,
                details: `Question in "${selectedTest.title}" has no explanation.`,
              });
            }
          }
        });
      }
    }

    return [...mockMissingReports, ...latexProcessed, ...processedReports];
  }, [processedReports, latexReports, filterMockId, mockTests]);

  const exams = useMemo(() => {
    const standard = EXAM_CONFIGS.map(e => e.examType);
    const found = allProcessedReports.map(r => r.exam);
    return Array.from(new Set([...standard, ...found])).sort();
  }, [allProcessedReports]);

  const subjects = useMemo(() => {
    const found = allProcessedReports.filter(r => filterExam === "all" || r.exam === filterExam).map(r => r.subject);
    let configSubjects: string[] = [];
    if (filterExam === "all") {
      EXAM_CONFIGS.forEach(c => { c.sections.forEach(s => { if (s.name) configSubjects.push(s.name); if (s.subjects) configSubjects.push(...s.subjects); }); });
      configSubjects.push(...GATE_BRANCHES.map(b => b.id));
    } else {
      const c = EXAM_CONFIGS.find(e => e.examType === filterExam);
      if (c) { c.sections.forEach(s => { if (s.name) configSubjects.push(s.name); if (s.subjects) configSubjects.push(...s.subjects); }); }
      if (filterExam === "GATE") configSubjects.push(...GATE_BRANCHES.map(b => b.id));
    }
    return Array.from(new Set([...configSubjects, ...found])).filter(s => s && s !== "Other" && s !== "Unknown").sort();
  }, [allProcessedReports, filterExam]);

  const types = ["PYQ", "Mock", "Generated"];

  const filteredReports = useMemo(() => {
    return allProcessedReports.filter(r => {
      if (filterExam !== "all" && r.exam !== filterExam) return false;
      if (filterSubject !== "all" && r.subject !== filterSubject) return false;
      if (filterType !== "all" && r.type !== filterType) return false;
      if (showMissingOnly && !isMissingExplanation(r.q)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const text = (r.q?.question_text || "") + (r.details || "") + (r.reason || "");
        if (!text.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allProcessedReports, filterExam, filterSubject, filterType, showMissingOnly, searchQuery]);

  const openEditor = (report: any) => {
    const questionData = report.q;
    let questionType: "PYQ" | "GeneratedQuestion" | "MockQuestion" = "GeneratedQuestion";
    if (report.pyq_id) questionType = "PYQ";
    else if (report.isMock) questionType = "MockQuestion";

    setEditingReport({
      ...report, questionData, questionType,
      questionId: report.pyq_id || report.question_id || report.mock_question_id,
    });
    setFormData({
      question_text: questionData?.question_text || "",
      correct_answer: questionData?.correct_answer || "",
      explanation: questionData?.explanation || "",
      options: (questionData?.options as string[]) || [],
      images: (questionData?.images as any[]) || [],
      ai_answer_mismatch: questionData?.ai_answer_mismatch || false,
      ai_detected_answer: questionData?.ai_detected_answer || null,
      question_type: questionData?.question_type || "MCQ",
    });
  };

  const handleScanLatex = async () => {
    setIsScanningLatex(true);
    try {
      const res = await fetch("/api/admin/scan-latex");
      const data = await res.json();
      if (data.results) setLatexReports(data.results);
    } catch {}
    finally { setIsScanningLatex(false); }
  };

  return (
    <>
      {/* Batch + PDF panels (owns their own modals internally) */}
      <BatchProcessPanel
        mockTests={mockTests || []}
        reports={localReports}
        selectedAIModel={selectedAIModel}
        onModelChange={setSelectedAIModel}
        onBatchComplete={(processedIds) => {
          setLocalReports(prev => prev.filter(r => {
            const qId = r.questionId || r.pyq_id || r.mock_question_id;
            return !processedIds.includes(qId);
          }));
        }}
      />

      {/* LaTeX health panel */}
      <div className="mb-8 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <h3 className="text-sm font-black mb-1">LaTeX Health Diagnostic</h3>
        <p className="text-xs text-gray-500 max-w-sm mb-4">Run a server-side scan to detect broken formulas, undefined Greek letters, or unescaped characters across your database.</p>
        <button
          onClick={handleScanLatex}
          disabled={isScanningLatex}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${isScanningLatex ? "bg-gray-100 text-gray-400 dark:bg-zinc-800 animate-pulse cursor-wait" : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20"}`}
        >{isScanningLatex ? "🔍 Scanning Database..." : "🚀 Run Health Scan"}</button>
        {latexReports.length > 0 && <div className="mt-4 text-[10px] font-black text-red-500 uppercase tracking-widest">⚠️ {latexReports.length} Issues Detected</div>}
      </div>

      {/* Filter bar */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-zinc-900/50 border dark:border-zinc-800 rounded-3xl flex flex-col gap-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Search Question / Details</label>
            <div className="relative">
              <input
                type="text" placeholder="Type to search..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2.5 pl-10 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 opacity-50">🔍</span>
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Exam</label>
            <select value={filterExam} onChange={(e) => handleExamChange(e.target.value)} className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none">
              <option value="all">All Exams</option>
              {exams.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Subject</label>
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none">
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none">
              <option value="all">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            onClick={() => { setFilterExam("all"); setFilterSubject("all"); setFilterType("all"); setFilterMockId("all"); setSearchQuery(""); setShowMissingOnly(false); }}
            className="p-2.5 px-4 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >Reset</button>
        </div>

        <div className="flex flex-wrap gap-4 pt-4 border-t dark:border-zinc-800 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Target Mock Paper (Find Missing Qs)</label>
            <select value={filterMockId} onChange={(e) => setFilterMockId(e.target.value)} className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none">
              <option value="all">-- Select Mock Test --</option>
              {mockTests?.map(t => <option key={t.id} value={t.id}>{t.title} ({t.exam_type})</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowMissingOnly(!showMissingOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${showMissingOnly ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20" : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-500 hover:border-red-500/50"}`}
          >
            {showMissingOnly ? "✅" : "⭕"} Show Only Missing
          </button>
        </div>
      </div>

      {/* Report list */}
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
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">{r.reason}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] font-bold uppercase">{r.exam}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-[10px] font-bold uppercase">{r.subject}</span>
                      {/* Sub-topic: which chapter inside the subject, so a flagged
                          question can be placed without opening the editor. */}
                      {r.topic && (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-[10px] font-bold uppercase">{r.topic}</span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 text-[10px] font-bold uppercase">{r.type}</span>
                      {r.reportCount > 1 && (
                        <span className="px-2 py-0.5 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase" title={(r.reporterEmails || []).join(", ")}>
                          👥 {r.reportCount} reports
                        </span>
                      )}
                    </div>
                    <div className="text-right text-[10px] text-gray-400 font-medium">
                      {r.reportCount > 1
                        ? `${r.reportCount} reporters`
                        : (r.user?.email || 'Unknown')}
                      <br />{new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {r.details && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-white/5 text-sm text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                      <strong>{r.reason === "LaTeX Error" ? "Diagnostic Details" : "User Comment"}:</strong> {r.details}
                    </div>
                  )}
                  {q && (
                    <div className="text-sm text-gray-500 line-clamp-2 mb-4 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border dark:border-zinc-800">
                      <MathRenderer content={q.question_text} />
                    </div>
                  )}
                  {q && <ReportImages images={q.images} />}
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-gray-400 font-mono">ID: {r.pyq_id || r.question_id || r.mock_question_id}</div>
                    <button onClick={() => openEditor(r)} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm">Review & Fix Issue</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report editor modal */}
      {editingReport && (
        <ReportEditorModal
          editingReport={editingReport}
          formData={formData}
          selectedAIModel={selectedAIModel}
          onFormChange={setFormData}
          onModelChange={setSelectedAIModel}
          onClose={() => setEditingReport(null)}
          onSaved={(reportId) => {
            setLocalReports(prev => prev.filter(r => r.id !== reportId));
            if (reportId.startsWith("auto-latex-")) setLatexReports(prev => prev.filter(r => r.id !== reportId));
            setEditingReport(null);
          }}
          onDeleted={() => setEditingReport(null)}
        />
      )}
    </>
  );
}
