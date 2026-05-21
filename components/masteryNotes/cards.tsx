"use client";

import { ChevronRight, Check, AlertCircle, Info } from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";
import { T, type MasteryNoteItem } from "./types";

export function DefCard({ sym, name, bound, formula, cond, gloss, color }: MasteryNoteItem) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-surface)] flex flex-col gap-2.5 transition-all hover:border-[var(--border-strong)]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold italic text-[18px]"
          style={{ background: `${color}15`, color, fontFamily: T.serif }}>
          {sym}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold leading-tight">{name}</div>
          <div className="text-[9px] uppercase font-bold tracking-wider" style={{ color }}>{bound}</div>
        </div>
      </div>
      <div className="p-2 rounded-lg bg-black/20 border border-[var(--border)] font-mono text-[11px] leading-relaxed">
        <MathRenderer content={formula || ''} />
        {cond && <span className="text-[var(--text-muted)] ml-2 opacity-70">· {cond}</span>}
      </div>
      {gloss && <div className="text-[11px] text-[var(--text-secondary)] leading-snug italic" style={{ fontFamily: T.serif }}>{gloss}</div>}
    </div>
  );
}

export function NoteCard({ title, body }: MasteryNoteItem) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-surface)] flex gap-3 transition-all hover:border-[var(--border-strong)]">
      <Info size={14} className="text-[#ff8a3d] flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-[12px] font-bold mb-1 leading-tight" dangerouslySetInnerHTML={{ __html: title || '' }} />
        <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

export function PropCard({ name, formula, eg }: MasteryNoteItem) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-surface)] transition-all hover:border-[var(--border-strong)]">
      <div className="text-[12px] font-bold mb-2">{name}</div>
      <div className="p-2 rounded-lg bg-black/20 border border-[var(--border)] font-mono text-[11px] mb-2 leading-relaxed">
        <MathRenderer content={formula || ''} />
      </div>
      {eg && <div className="text-[10px] text-[var(--text-muted)] italic leading-snug" style={{ fontFamily: T.serif }}>e.g. {eg}</div>}
    </div>
  );
}

export function TipCard({ label, code, bound, hint }: MasteryNoteItem) {
  return (
    <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] overflow-hidden transition-all hover:border-[var(--border-strong)]">
      <div className="px-3 py-1.5 border-b border-[var(--border)] text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{label}</div>
      <pre className="m-0 p-3 font-mono text-[11px] bg-black/20 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        <MathRenderer content={code || ''} />
      </pre>
      <div className="p-2.5 pt-2 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ChevronRight size={10} className="text-[var(--text-muted)]" />
          <span className="font-mono text-[11px] font-bold text-[#ff8a3d]">{bound}</span>
        </div>
        {hint && <div className="text-[10px] text-[var(--text-secondary)] italic leading-tight px-4" style={{ fontFamily: T.serif }}>{hint}</div>}
      </div>
    </div>
  );
}

export function PitfallCard({ title, wrong, right }: MasteryNoteItem) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-surface)] transition-all hover:border-[var(--border-strong)]">
      <div className="text-[12px] font-bold mb-2.5 flex items-center gap-2">
        <AlertCircle size={14} className="text-[#fbbf24]" />
        {title}
      </div>
      <div className="flex gap-2.5 mb-1.5 text-[11px] leading-snug">
        <span className="text-[#f87171] font-black flex-shrink-0">✕</span>
        <span className="text-[var(--text-secondary)]">{wrong}</span>
      </div>
      <div className="flex gap-2.5 text-[11px] leading-snug">
        <Check size={12} className="text-[#4ade80] flex-shrink-0 mt-0.5" />
        <span className="text-[var(--text-primary)] font-medium">{right}</span>
      </div>
    </div>
  );
}
