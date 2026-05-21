"use client";

import React from "react";
import MathRenderer from "@/components/ui/MathRenderer";
import { DefCard, NoteCard, PropCard, TipCard, PitfallCard } from "./cards";
import type { MasteryNoteBlock, MasteryNoteItem } from "./types";

export default function Block({ block }: { block: MasteryNoteBlock }) {
  const { kind, items, label } = block;
  if (!items) return null;

  if (kind === 'def') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        {items.map((d, i) => <DefCard key={i} {...(d as MasteryNoteItem)} />)}
      </div>
    );
  }
  if (kind === 'ladder') {
    return (
      <div className="border border-[var(--border)] rounded-xl p-4 bg-gradient-to-br from-amber-500/5 to-transparent mb-3">
        {label && <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-3">{label}</div>}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
          {items.map((g, i) => (
            <React.Fragment key={i}>
              <span className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] font-semibold"
                style={{
                  background: `oklch(0.25 0.05 ${280 - i * (200 / Math.max(items.length, 1))})`,
                  color: '#fff'
                }}>
                {g as string}
              </span>
              {i < items.length - 1 && <span className="text-[var(--text-muted)] px-0.5 opacity-50">{'<'}</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
  if (kind === 'rules') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {items.map((r, i) => <NoteCard key={i} {...(r as MasteryNoteItem)} />)}
      </div>
    );
  }
  if (kind === 'props') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {items.map((p, i) => <PropCard key={i} {...(p as MasteryNoteItem)} />)}
      </div>
    );
  }
  if (kind === 'tips') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        {items.map((t, i) => <TipCard key={i} {...(t as MasteryNoteItem)} />)}
      </div>
    );
  }
  if (kind === 'pitfalls') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {items.map((p, i) => <PitfallCard key={i} {...(p as MasteryNoteItem)} />)}
      </div>
    );
  }
  if (kind === 'markdown') {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <MathRenderer content={(items as string[]).join('\n')} />
      </div>
    );
  }
  return null;
}
