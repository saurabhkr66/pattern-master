"use client";

import MathRenderer from "@/components/ui/MathRenderer";
import { T, stripHtml, type MasteryNoteBlock } from "./types";

interface Line {
  label: string;
  value: string;
  gloss?: string;
  color?: string;
}

export default function CompactView({ blocks }: { blocks: MasteryNoteBlock[] }) {
  const lines: Line[] = [];

  blocks.forEach(b => {
    (b.items || []).forEach(it => {
      const item = typeof it === 'string' ? { name: 'Item', formula: it } : it;
      if (b.kind === 'def')           lines.push({ label: item.name || '',  value: item.formula || '', gloss: item.gloss, color: item.color });
      else if (b.kind === 'rules')    lines.push({ label: stripHtml(item.title || ''), value: item.body || '' });
      else if (b.kind === 'props')    lines.push({ label: item.name || '',  value: item.formula || '', gloss: item.eg });
      else if (b.kind === 'tips')     lines.push({ label: item.label || '', value: item.code || '',    gloss: `→ ${item.bound} · ${item.hint}` });
      else if (b.kind === 'pitfalls') lines.push({ label: item.title || '', value: item.right || '', gloss: '✕ ' + item.wrong });
    });
    if (b.kind === 'ladder') lines.push({ label: 'Ladder', value: (b.items || []).join(' < ') });
  });

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden mb-3">
      {lines.map((l, i) => (
        <div key={i} className={`grid grid-cols-[140px_1fr] p-2.5 gap-3 border-t border-[var(--border)] first:border-0 text-[12px]
          ${i % 2 ? 'bg-white/[0.02]' : 'bg-transparent'}`}>
          <div className="font-bold tracking-tight opacity-90" style={{ fontFamily: T.serif, color: l.color }}>{l.label}</div>
          <div>
            <span className="font-mono text-[var(--text-primary)]">
              <MathRenderer content={l.value} />
            </span>
            {l.gloss && <span className="text-[var(--text-muted)] ml-2 italic" style={{ fontFamily: T.serif }}>· {l.gloss}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
