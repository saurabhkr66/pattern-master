"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Save, Sparkles } from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";

interface UserNotesEditorProps {
  patternId: string;
}

const DEBOUNCE_DELAY = 1000;

export default function UserNotesEditor({ patternId }: UserNotesEditorProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Fetch initial notes
  const { data, isLoading, isError } = useQuery({
    queryKey: ["userNotes", patternId],
    queryFn: async () => {
      const res = await fetch(`/api/patterns/${patternId}/user-notes`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
    staleTime: Infinity, // Keep it stable while typing
  });

  // Sync content when data is loaded
  useEffect(() => {
    if (data?.content !== undefined) {
      setContent(data.content);
    }
  }, [data?.content]);

  // Mutation for saving
  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const res = await fetch(`/api/patterns/${patternId}/user-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      return res.json();
    },
    onSuccess: () => {
      setSaveStatus("saved");
      queryClient.setQueryData(["userNotes", patternId], { content });
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => {
      setSaveStatus("error");
    },
  });

  // Debounced auto-save logic
  useEffect(() => {
    // Only attempt to save if content differs from the last known server state
    if (data?.content !== undefined && content === data.content) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setSaveStatus("saving");
      mutation.mutate(content);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [content, data?.content, mutation]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in transition-all">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading your notes…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-20 text-center text-red-500 text-[10px] font-black uppercase tracking-widest">
        Error loading notes. Please refresh.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            Personal Notes
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Saving…</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Saved</span>
              </>
            )}
            {saveStatus === "idle" && (
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic opacity-50">Cloud Sync Active</span>
            )}
            {saveStatus === "error" && (
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Save Failed</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsPreview(!isPreview)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            isPreview
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
          }`}
        >
          {isPreview ? "← Edit Notes" : "Preview Markdown →"}
        </button>
      </div>

      <div className="relative group">
        {isPreview ? (
          <div className="min-h-[300px] bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 p-8 shadow-sm">
            {content.trim() ? (
              <MathRenderer content={content} className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium text-[14px]" />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <p className="text-xs font-black uppercase tracking-widest">No content to preview</p>
                <p className="text-[10px] mt-2 italic">Start typing in the editor to see it here.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your study notes here... Use $...$ for inline math and $$...$$ for block math."
              className="w-full min-h-[400px] bg-white dark:bg-white/5 rounded-2xl border-2 border-transparent focus:border-blue-500/30 p-8 shadow-sm text-[15px] font-medium text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none transition-all resize-y custom-scrollbar"
              style={{
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.03)",
                backdropFilter: "blur(4px)",
              }}
            />
            <div className="absolute bottom-4 right-6 flex items-center gap-2 pointer-events-none opacity-50">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Supports LaTeX & Markdown</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50/50 dark:bg-blue-500/5 p-4 rounded-xl border border-blue-100/50 dark:border-blue-500/10">
          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-blue-600 rounded-full" />
            Quick Tips
          </p>
          <p className="text-[11px] text-blue-900/70 dark:text-blue-200/50 leading-snug">
            Use **bold** and _italics_ to highlight key concepts.
          </p>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-500/5 p-4 rounded-xl border border-amber-100/50 dark:border-amber-500/10">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-amber-600 rounded-full" />
            Math Formulas
          </p>
          <p className="text-[11px] text-amber-900/70 dark:text-amber-200/50 leading-snug">
            Type <code>$E=mc^2$</code> for inline or <code>$$...$$</code> for blocks.
          </p>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-500/10">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-emerald-600 rounded-full" />
            Auto Sync
          </p>
          <p className="text-[11px] text-emerald-900/70 dark:text-emerald-200/50 leading-snug">
            Your notes save automatically as you type to the cloud.
          </p>
        </div>
      </div>
    </div>
  );
}
