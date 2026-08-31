"use client";

import React from "react";
import NotesRenderer from "@/components/ui/NotesRenderer";
import MathInline from "@/components/ui/MathInline";
import { DefCard, NoteCard, PropCard, TipCard, PitfallCard } from "./cards";
import type { MasteryNoteBlock, MasteryNoteItem } from "./types";

// A block's `label` used to be rendered for the ladder only; every other kind
// silently dropped it. It is now a shared header so authored labels always show.
function BlockLabel({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-2">
      <MathInline content={label} />
    </div>
  );
}

// A ladder rung is normally a plain string, but JSON notes sometimes carry the
// richer item shape — fall back to its formula/name so the chip is never blank.
function rungText(g: string | MasteryNoteItem): string {
  if (typeof g === 'string') return g;
  return g.formula || g.name || g.title || '';
}

export default function Block({ block }: { block: MasteryNoteBlock }) {
  const { kind, items, label } = block;
  if (!items) return null;

  if (kind === 'ladder') {
    return (
      <div className="border border-[var(--border)] rounded-xl p-4 bg-gradient-to-br from-amber-500/5 to-transparent mb-3">
        <BlockLabel label={label} />
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
          {items.map((g, i) => (
            <React.Fragment key={i}>
              <span className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] font-semibold"
                style={{
                  background: `oklch(0.25 0.05 ${280 - i * (200 / Math.max(items.length, 1))})`,
                  color: '#fff'
                }}>
                <MathInline content={rungText(g)} />
              </span>
              {i < items.length - 1 && <span className="text-[var(--text-muted)] px-0.5 opacity-50">{'<'}</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'markdown') {
    return (
      <div className="mb-3">
        <BlockLabel label={label} />
        <NotesRenderer
          content={(items as string[]).join('\n')}
          className="prose prose-sm dark:prose-invert max-w-none text-[13.5px] leading-relaxed
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-[var(--text-primary)]
            prose-h1:text-[15px] prose-h2:text-[14px] prose-h3:text-[13px]
            prose-h2:mt-4 prose-h3:mt-3
            prose-p:my-2 prose-li:my-0.5
            prose-strong:text-[var(--text-primary)]
            prose-a:text-[#ff8a3d]
            prose-table:text-[12px] prose-table:block prose-table:overflow-x-auto
            prose-code:text-[var(--text-primary)]"
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>
    );
  }

  const grid = kind === 'def' || kind === 'tips'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
    : 'grid grid-cols-1 sm:grid-cols-2 gap-3';

  const Card =
    kind === 'def' ? DefCard :
    kind === 'rules' ? NoteCard :
    kind === 'props' ? PropCard :
    kind === 'tips' ? TipCard :
    kind === 'pitfalls' ? PitfallCard :
    null;

  if (!Card) return null;

  return (
    <div className="mb-3">
      <BlockLabel label={label} />
      <div className={grid}>
        {items.map((it, i) => (
          <Card key={i} {...(typeof it === 'string' ? { formula: it } : it)} />
        ))}
      </div>
    </div>
  );
}
