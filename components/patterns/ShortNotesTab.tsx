"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Loader2, X } from "lucide-react";
import MasteryNotes from "../MasteryNotes";
import { BE } from "@/lib/theme";

interface ShortNotesTabProps {
  patternId: string;
  shortNotes: string | null;
  isAdmin: boolean;
}

export default function ShortNotesTab({ patternId, shortNotes, isAdmin }: ShortNotesTabProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(shortNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(shortNotes ?? "");
    setError(null);
    setIsEditing(true);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patterns/${patternId}/short-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) throw new Error("Save failed");
      await queryClient.invalidateQueries({ queryKey: ["patternQuestions", patternId] });
      setIsEditing(false);
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return <MasteryNotes data={shortNotes ?? ""} />;
  }

  if (!isEditing) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button
            onClick={startEditing}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 8,
              border: `1px solid ${BE.line}`, background: BE.surface, color: BE.textDim,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
            }}
          >
            <Pencil size={12} /> Edit notes
          </button>
        </div>
        <MasteryNotes data={shortNotes ?? ""} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Editing mastery notes · Markdown, $inline$ and $$block$$ math supported
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 8,
              border: `1px solid ${BE.line}`, background: 'transparent', color: BE.textDim,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
            }}
          >
            <X size={12} /> Cancel
          </button>
          <button
            onClick={save}
            disabled={isSaving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 8,
              border: `1px solid ${BE.accent}`, background: BE.accentSoft, color: BE.accent,
              cursor: isSaving ? 'default' : 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
            }}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div style={{ fontSize: 11, color: BE.bad, marginBottom: 8 }}>{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Markdown
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste or write the short notes for this topic here…"
            style={{
              width: '100%', minHeight: 480, padding: 14, fontSize: 13, lineHeight: 1.6,
              background: BE.surface, color: BE.text, border: `1px solid ${BE.line}`,
              borderRadius: 10, resize: 'vertical', fontFamily: BE.mono, outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: BE.textMute, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Live preview
          </div>
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 10, overflow: 'auto', minHeight: 480 }}>
            {draft.trim() ? (
              <MasteryNotes data={draft} />
            ) : (
              <div style={{ fontSize: 12, color: BE.textMute, padding: '20px 0', textAlign: 'center' }}>
                Nothing to preview yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
