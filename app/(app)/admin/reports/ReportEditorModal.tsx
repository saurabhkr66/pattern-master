"use client";

import { generateAIExplanation, resolveReport, deleteQuestion } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";
import { getImageUrl } from "@/lib/imageUtils";
import { AI_MODEL_OPTIONS, type AIModel } from "@/lib/aiModels";
import { useCallback, useEffect, useRef, useState } from "react";

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
  questionType: "PYQ" | "GeneratedQuestion" | "MockQuestion";
  mock_test_id?: string;
  reason: string;
  details?: string;
  // Present when several users reported the same question — resolving must
  // clear every underlying QuestionReport row, not just this card's id.
  allReportIds?: string[];
  reportCount?: number;
}

interface ReportEditorModalProps {
  editingReport: EditingReport;
  formData: FormData;
  selectedAIModel: AIModel;
  onFormChange: (data: FormData) => void;
  onModelChange: (model: AIModel) => void;
  onClose: () => void;
  onSaved: (reportId: string) => void;
  onDeleted: () => void;
}

/**
 * Force a fresh fetch after an in-place replace. The path is unchanged by
 * design, so browser and CDN both believe they already have the file — without
 * a changing query the admin would keep seeing the image they just replaced.
 */
function bust(url: string, v?: number): string {
  if (!v) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${v}`;
}

/**
 * One image row: thumbnail + paste target.
 *
 * Filenames are edited by hand here, so a broken path is a normal state, not an
 * exception — it surfaces as a "404" tile rather than the browser's blank frame,
 * so "wrong filename" is distinguishable from "no image yet".
 *
 * Clicking arms the slot; the modal's window-level paste listener then routes
 * Ctrl/Cmd+V here. Drag-drop and a file picker are offered too, because paste
 * alone breaks down as soon as the source isn't a screenshot tool.
 */
function ImageSlot({
  filename,
  version,
  armed,
  busy,
  onArm,
  onFile,
  size = 64,
}: {
  filename: string;
  version?: number;
  armed: boolean;
  busy: boolean;
  onArm: () => void;
  onFile: (file: File) => void;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const trimmed = (filename || "").trim();
  const url = trimmed ? bust(getImageUrl(trimmed), version) : "";

  const pickImage = (list: FileList | null | undefined) => {
    const file = Array.from(list ?? []).find((f) => f.type.startsWith("image/"));
    if (file) onFile(file);
    return !!file;
  };

  return (
    <div
      tabIndex={0}
      role="button"
      onFocus={onArm}
      onClick={onArm}
      onPaste={(e) => {
        if (pickImage(e.clipboardData.files)) e.preventDefault();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pickImage(e.dataTransfer.files);
      }}
      title={trimmed ? `${trimmed} — click then Ctrl/Cmd+V to replace` : "click then Ctrl/Cmd+V to upload"}
      className={`relative shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 outline-none transition ${
        armed
          ? "border-amber-500"
          : "border-transparent ring-1 ring-gray-200 dark:ring-zinc-700"
      }`}
      style={{ width: size, height: size }}
    >
      {!trimmed || broken ? (
        <div className="flex h-full w-full items-center justify-center bg-white text-[9px] font-black uppercase text-gray-400 dark:bg-black/30">
          {trimmed ? <span className="text-red-500">404</span> : "—"}
        </div>
      ) : (
        <img
          key={url}
          src={url}
          alt=""
          onError={() => setBroken(true)}
          onLoad={() => setBroken(false)}
          className="h-full w-full bg-white object-contain dark:bg-black/30"
        />
      )}

      {(armed || busy) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-1 text-center text-[8px] font-black uppercase leading-tight text-white">
          {busy ? "Uploading…" : "Ctrl/Cmd+V"}
        </div>
      )}
    </div>
  );
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

  // In-place ImageKit replacement. Keyed by filename, not row index, so a
  // replaced file refreshes everywhere it appears (row thumb + live preview).
  const [armed, setArmed] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const armedRef = useRef<string | null>(null);

  // Untyped images are question images — only "explanation" is explicit,
  // matching how the test renderer splits them.
  const questionImages = formData.images.filter((img: any) => img?.filename?.trim() && img.type !== "explanation");
  const explanationImages = formData.images.filter((img: any) => img?.filename?.trim() && img.type === "explanation");

  const replaceImage = useCallback(async (ref: string, file: File) => {
    const target = (ref || "").trim();
    if (!target) {
      setUploadError("Give the image a filename before replacing it.");
      return;
    }
    setUploading(target);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("ref", target);
      const res = await fetch("/api/admin/replace-image", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `upload failed (${res.status})`);
      // No DB write: the path is unchanged, so only the cache-buster moves.
      setVersions((v) => ({ ...v, [target]: data.version ?? Date.now() }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(null);
    }
  }, []);

  // Window-level paste so Ctrl/Cmd+V works without the tile holding focus —
  // clicking the tile arms it, and the OS screenshot flow often steals focus.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = armedRef.current;
      if (!target) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return; // text paste — leave the textareas alone
      e.preventDefault();
      void replaceImage(target, file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [replaceImage]);

  const armSlot = (filename: string) => {
    const target = (filename || "").trim();
    setArmed(target || null);
    armedRef.current = target || null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await resolveReport(
        editingReport.allReportIds?.length ? editingReport.allReportIds : editingReport.id,
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
            <strong>Complaint ({editingReport.reason}){editingReport.reportCount && editingReport.reportCount > 1 ? ` — reported by ${editingReport.reportCount} users` : ""}:</strong> {editingReport.details || "No extra details provided."}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question Text (Supports LaTeX)</label>
            <textarea
              value={formData.question_text}
              onChange={(e) => onFormChange({ ...formData, question_text: e.target.value })}
              className="w-full p-4 rounded-xl text-sm bg-gray-50 dark:bg-black/20 border dark:border-zinc-800 focus:border-amber-500 outline-none"
              rows={4}
            />
            {(formData.question_text || questionImages.length > 0) && (
              <div className="mt-2 p-3 border dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm">
                <span className="text-[10px] uppercase font-bold text-amber-500 mb-2 block">Live Preview</span>
                {formData.question_text && <MathRenderer content={formData.question_text} />}
                {/* Many reports are about the diagram, not the text — the image
                    has to be visible here or the admin is judging blind. */}
                {questionImages.map((img: any, idx: number) => (
                  <div key={idx} className="mt-2">
                    <img src={bust(getImageUrl(img.filename), versions[img.filename?.trim()])} alt={`Question image ${idx + 1}`} className="max-w-full h-auto rounded-lg border dark:border-zinc-800" />
                  </div>
                ))}
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
              {formData.images.map((img, idx) => {
                const ref = (img.filename || "").trim();
                const replaced = ref && versions[ref];
                return (
                <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-black/20 p-3 rounded-xl border dark:border-zinc-800">
                  {/* Keyed by filename so the broken/404 state resets the moment
                      the admin corrects the path. */}
                  <ImageSlot
                    key={ref}
                    filename={img.filename}
                    version={versions[ref]}
                    armed={armed === ref && !!ref}
                    busy={uploading === ref}
                    onArm={() => armSlot(img.filename)}
                    onFile={(file) => void replaceImage(img.filename, file)}
                  />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
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
                    <label className="text-[10px] text-gray-400 hover:text-amber-500 cursor-pointer w-fit">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void replaceImage(img.filename, file);
                          e.target.value = "";
                        }}
                      />
                      {replaced ? "✓ replaced in ImageKit — choose another file" : "click the thumbnail then Ctrl/Cmd+V · or choose a file"}
                    </label>
                  </div>
                  <button
                    onClick={() => onFormChange({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                  >✕</button>
                </div>
                );
              })}
              <button
                onClick={() => onFormChange({ ...formData, images: [...formData.images, { index: formData.images.length + 1, filename: "", type: "question" }] })}
                className="text-xs font-bold text-amber-500 hover:underline text-left w-fit"
              >+ Add Image</button>

              {uploadError && (
                <p className="text-xs font-bold text-red-500">{uploadError}</p>
              )}
              {/* Overwriting keeps the path, which is the whole point — but the
                  path is shared, so this is not a per-question edit. */}
              <p className="text-[10px] leading-relaxed text-gray-400">
                Pasting overwrites the file in ImageKit under the <strong>same name</strong>, so no save is
                needed and every question using this filename updates at once. The CDN purge is
                asynchronous — other pages may show the old image for a few minutes.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Options (Supports LaTeX)</label>
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
                  {/* Options carry LaTeX as often as the stem does — without this the
                      raw source was the only thing shown, so a broken delimiter was
                      invisible until the option reached a student. Mirrors the
                      question-text preview above. */}
                  {opt.trim() && (
                    <div className="ml-8 p-2.5 border dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm">
                      <span className="text-[10px] uppercase font-bold text-amber-500 mb-1.5 block">Live Preview · {String.fromCharCode(65 + idx)}</span>
                      <MathRenderer content={opt} />
                    </div>
                  )}
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
                  onChange={(e) => onModelChange(e.target.value as AIModel)}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-700 outline-none"
                >
                  {AI_MODEL_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
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
            {(formData.explanation || explanationImages.length > 0) && (
              <div className="mt-2 p-3 border dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-sm">
                <span className="text-[10px] uppercase font-bold text-amber-500 mb-2 block">Live Preview</span>
                {formData.explanation && <MathRenderer content={formData.explanation} />}
                {explanationImages.map((img: any, idx: number) => (
                  <div key={idx} className="mt-2">
                    <img src={bust(getImageUrl(img.filename), versions[img.filename?.trim()])} alt={`Explanation image ${idx + 1}`} className="max-w-full h-auto rounded-lg" />
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
