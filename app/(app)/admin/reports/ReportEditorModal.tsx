"use client";

import { generateAIExplanation, resolveReport, deleteQuestion } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";
import { getCloudinaryUrl } from "@/lib/imageUtils";
import { useState } from "react";

interface FormData {
  question_text: string;
  correct_answer: string;
  explanation: string;
  options: string[];
  images: any[];
  ai_answer_mismatch: boolean;
  ai_detected_answer: string | null;
  question_type: string;
}

interface EditingReport {
  id: string;
  questionId: string;
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | "MockQuestion";
  mock_test_id?: string;
  reason: string;
  details?: string;
}

interface ReportEditorModalProps {
  editingReport: EditingReport;
  formData: FormData;
  selectedAIModel: "gemini" | "gpt-4o-mini";
  onFormChange: (data: FormData) => void;
  onModelChange: (model: "gemini" | "gpt-4o-mini") => void;
  onClose: () => void;
  onSaved: (reportId: string) => void;
  onDeleted: () => void;
}

export default function ReportEditorModal({
  editingReport,
  formData,
  selectedAIModel,
  onFormChange,
  onModelChange,
  onClose,
  onSaved,
  onDeleted,
}: ReportEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await resolveReport(
        editingReport.id,
        editingReport.questionId,
        editingReport.questionType,
        { ...formData, mockTestId: editingReport.mock_test_id }
      );
      onSaved(editingReport.id);
    } catch {
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm("🚨 Are you absolutely sure you want to DELETE this entire question from the database? This cannot be undone.");
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await deleteQuestion(editingReport.questionId, editingReport.questionType, editingReport.mock_test_id);
      onDeleted();
    } catch {
      alert("Failed to delete question.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      const result = await generateAIExplanation(
        editingReport.questionId,
        editingReport.questionType,
        editingReport.mock_test_id,
        selectedAIModel
      ) as any;
      onFormChange({
        ...formData,
        explanation: result.explanation,
        ai_answer_mismatch: result.isMismatch || false,
        ai_detected_answer: result.aiDetectedAnswer || null,
      });
    } catch {
      alert("Failed to generate explanation. Check console for details.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 flex flex-col max-h-[90vh]">

        <div className="p-6 border-b dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black">Fix Question</h3>
            <p className="text-sm text-gray-500 font-mono mt-1">ID: {editingReport.questionId} ({editingReport.questionType})</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5 flex-1">

          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-sm text-red-800 dark:text-red-300">
            <strong>Complaint ({editingReport.reason}):</strong> {editingReport.details || "No extra details provided."}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question Text (Supports LaTeX)</label>
            <textarea
              value={formData.question_text}
              onChange={(e) => onFormChange({ ...formData, question_text: e.target.value })}
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
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question Type</label>
            <select
              value={formData.question_type}
              onChange={(e) => onFormChange({ ...formData, question_type: e.target.value })}
              className="w-full p-3 rounded-xl text-sm bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 focus:border-amber-500 outline-none"
            >
              <option value="MCQ">MCQ (Multiple Choice)</option>
              <option value="MSQ">MSQ (Multiple Select)</option>
              <option value="NAT">NAT (Numerical Answer)</option>
            </select>
          </div>

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
                        const imgs = [...formData.images];
                        imgs[idx].filename = e.target.value;
                        onFormChange({ ...formData, images: imgs });
                      }}
                      className="p-2 rounded bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-xs"
                    />
                    <select
                      value={img.type || "question"}
                      onChange={(e) => {
                        const imgs = [...formData.images];
                        imgs[idx].type = e.target.value;
                        onFormChange({ ...formData, images: imgs });
                      }}
                      className="p-2 rounded bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-xs"
                    >
                      <option value="question">Question</option>
                      <option value="explanation">Explanation</option>
                    </select>
                  </div>
                  <button
                    onClick={() => onFormChange({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => onFormChange({ ...formData, images: [...formData.images, { index: formData.images.length + 1, filename: "", type: "question" }] })}
                className="text-xs font-bold text-amber-500 hover:underline text-left w-fit"
              >+ Add Image</button>
            </div>
          </div>

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
                        const opts = [...formData.options];
                        opts[idx] = e.target.value;
                        onFormChange({ ...formData, options: opts });
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
                  onClick={() => onFormChange({ ...formData, options: [...formData.options, ""] })}
                  className="text-xs font-bold text-amber-500 hover:underline"
                >+ Add Option</button>
                {formData.options.length > 0 && (
                  <button
                    onClick={() => onFormChange({ ...formData, options: formData.options.slice(0, -1) })}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >- Remove Last</button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correct Answer (e.g., A, B, C or 45)</label>
            <input
              type="text"
              value={formData.correct_answer}
              onChange={(e) => onFormChange({ ...formData, correct_answer: e.target.value })}
              className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 focus:border-amber-500 outline-none font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Explanation (Supports LaTeX)</label>
                <button
                  type="button"
                  onClick={() => onFormChange({ ...formData, ai_answer_mismatch: !formData.ai_answer_mismatch })}
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
                  onChange={(e) => onModelChange(e.target.value as any)}
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
              onChange={(e) => onFormChange({ ...formData, explanation: e.target.value })}
              className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 focus:border-amber-500 outline-none"
              rows={4}
            />
            {(formData.explanation || formData.images.some((img: any) => img.type === "explanation")) && (
              <div className="mt-2 p-3 border dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm">
                <span className="text-[10px] uppercase font-bold text-amber-500 mb-2 block">Live Preview</span>
                {formData.explanation && <MathRenderer content={formData.explanation} />}
                {formData.images.filter((img: any) => img.type === "explanation").map((img: any, idx: number) => (
                  <div key={idx} className="mt-2">
                    <img src={getCloudinaryUrl(img.filename)} alt={`Explanation image ${idx + 1}`} className="max-w-full h-auto rounded-lg" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t dark:border-zinc-800 flex gap-3 bg-gray-50 dark:bg-zinc-900/50 rounded-b-3xl">
          <button
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="flex-[0.5] py-3 px-2 rounded-xl font-bold bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 shadow-sm transition-colors text-xs sm:text-sm"
          >{isDeleting ? "..." : "🗑️ Delete"}</button>
          <button
            onClick={onClose}
            className="flex-[0.5] py-3 rounded-xl font-bold bg-white border shadow-sm dark:bg-zinc-800 dark:border-zinc-700 text-xs sm:text-sm"
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            className="flex-1 py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-md flex justify-center items-center text-xs sm:text-sm"
          >{isSaving ? "Saving..." : "Save & Resolve"}</button>
        </div>
      </div>
    </div>
  );
}
