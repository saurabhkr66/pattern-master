"use client";

import { useState } from "react";
import { resolveReport, deleteQuestion } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";

export default function ReportsClient({ reports }: { reports: any[] }) {
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    question_text: "",
    correct_answer: "",
    explanation: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEditor = (report: any) => {
    // Determine the question type and data
    const questionData = report.question || report.pyq || report.subject_pyq;
    
    setEditingReport({
      ...report,
      questionData,
      questionType: report.subject_pyq_id ? "SubjectPYQ" : (report.pyq_id ? "PYQ" : "GeneratedQuestion"),
      questionId: report.subject_pyq_id || report.pyq_id || report.question_id
    });

    setFormData({
      question_text: questionData?.question_text || "",
      correct_answer: questionData?.correct_answer || "",
      explanation: questionData?.explanation || ""
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
        formData
      );
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
      await deleteQuestion(editingReport.questionId, editingReport.questionType);
      setEditingReport(null);
    } catch (error) {
      console.error("Failed to delete", error);
      alert("Failed to delete question.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {reports.length === 0 ? (
        <div className="text-center py-20 border rounded-2xl bg-gray-50 dark:bg-zinc-900/50 dark:border-zinc-800">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">All caught up!</h3>
          <p className="text-gray-500">No pending reports found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r: any) => {
            const q = r.question || r.pyq || r.subject_pyq;
            return (
              <div key={r.id} className="p-6 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-6">
                
                {/* Report Info */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 mb-2">
                        {r.reason}
                      </span>
                      <div className="text-sm text-gray-500 font-mono mt-1">
                        ID: {r.subject_pyq_id || r.pyq_id || r.question_id}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400 font-medium">
                      {r.user?.email || 'Unknown'} <br/>
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {r.details && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/20 border dark:border-white/5 text-sm text-gray-700 dark:text-gray-300 mb-4">
                      <strong>User Comment:</strong> "{r.details}"
                    </div>
                  )}
                  
                  {/* Sneak peek of the question */}
                  {q && (
                    <div className="text-sm text-gray-500 line-clamp-2 mb-4 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border dark:border-zinc-800">
                       <MathRenderer content={q.question_text} />
                    </div>
                  )}

                  <button 
                    onClick={() => openEditor(r)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm"
                  >
                    Review & Fix Issue
                  </button>
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
                <p className="text-sm text-gray-500 font-mono mt-1">ID: {editingReport.questionId}</p>
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
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Explanation (Supports LaTeX)</label>
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
