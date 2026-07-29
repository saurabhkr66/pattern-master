"use client";

import MathInline from "@/components/ui/MathInline";
import MathRenderer from "@/components/ui/MathRenderer";
import { T, type MasteryNoteBlock, type MasteryNoteItem } from "./types";
import { htmlToMarkdown, hasText } from "./mathText";

interface Line {
  label: string;
  value: string;
  gloss?: string;
  color?: string;
  /** Prose from a `markdown` block — rendered block-level, not inline. */
  prose?: boolean;
}

// The compact table is the same content as the cards, one row per item — so the
// label and the gloss need the same KaTeX treatment as the value. Previously
// only `value` was rendered as math and the rest printed raw "$…$".
export default function CompactView({ blocks }: { blocks: MasteryNoteBlock[] }) {
  const lines: Line[] = [];

  blocks.forEach(b => {
    if (b.kind === 'ladder') {
      const rungs = (b.items || []).map(it => typeof it === 'string' ? it : (it.formula || it.name || ''));
      lines.push({ label: b.label || 'Ladder', value: rungs.join(' < ') });
      return;
    }
    if (b.kind === 'markdown') {
      // Keep the original line breaks: this is real markdown, so display math
      // and lists only parse correctly at block level.
      const text = (b.items as string[] | undefined)?.join('\n').trim();
      if (text) lines.push({ label: b.label || 'Notes', value: text, prose: true });
      return;
    }
    (b.items || []).forEach(it => {
      const item: MasteryNoteItem = typeof it === 'string' ? { name: 'Item', formula: it } : it;
      if (b.kind === 'def')           lines.push({ label: item.name || '',  value: item.formula || '', gloss: item.gloss, color: item.color });
      else if (b.kind === 'rules')    lines.push({ label: item.title || '', value: item.body || '' });
      else if (b.kind === 'props')    lines.push({ label: item.name || '',  value: item.formula || '', gloss: item.eg });
      else if (b.kind === 'tips')     lines.push({ label: item.label || '', value: item.code || '',    gloss: [item.bound && `→ ${item.bound}`, item.hint].filter(Boolean).join(' · ') });
      else if (b.kind === 'pitfalls') lines.push({ label: item.title || '', value: item.right || '', gloss: item.wrong ? `✕ ${item.wrong}` : undefined });
    });
  });

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden mb-3">
      {lines.map((l, i) => (
        <div key={i} className={`grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] p-2.5 gap-3 border-t border-[var(--border)] first:border-0 text-[12px]
          ${i % 2 ? 'bg-white/[0.02]' : 'bg-transparent'}`}>
          <div className="font-bold tracking-tight opacity-90 min-w-0 break-words" style={{ fontFamily: T.serif, color: l.color }}>
            <MathInline content={htmlToMarkdown(l.label)} />
          </div>
          <div className="min-w-0">
            {l.prose ? (
              <MathRenderer
                content={l.value}
                className="prose prose-sm dark:prose-invert max-w-none text-[12px] leading-relaxed
                  prose-p:my-1 prose-li:my-0.5 prose-headings:text-[12px] prose-headings:my-1
                  prose-strong:text-[var(--text-primary)]"
                style={{ color: 'var(--text-primary)' }}
              />
            ) : (
              <span className="font-mono text-[var(--text-primary)]">
                <MathInline content={htmlToMarkdown(l.value)} />
              </span>
            )}
            {hasText(l.gloss) && (
              <span className="text-[var(--text-muted)] ml-2 italic" style={{ fontFamily: T.serif }}>
                · <MathInline content={htmlToMarkdown(l.gloss)} />
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
