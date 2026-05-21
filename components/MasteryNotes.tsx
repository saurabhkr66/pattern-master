"use client";

import { useState } from "react";
import { LayoutGrid, List, Plus, Check } from "lucide-react";
import Segmented from "./masteryNotes/Segmented";
import CollapsibleSection from "./masteryNotes/CollapsibleSection";
import Block from "./masteryNotes/Block";
import CompactView from "./masteryNotes/CompactView";
import { SAMPLE } from "./masteryNotes/sampleData";
import { parseRawNoteData } from "./masteryNotes/parseRawNoteData";
import { T, btnClass, type MasteryNoteData, type MasteryNoteSection } from "./masteryNotes/types";

export type {
  MasteryNoteItem,
  MasteryNoteBlock,
  MasteryNoteSection,
  MasteryNoteData,
} from "./masteryNotes/types";
export { parseRawNoteData } from "./masteryNotes/parseRawNoteData";

export default function MasteryNotes({ data = SAMPLE }: { data?: MasteryNoteData | string }) {
  const [density, setDensity] = useState<'cards' | 'compact'>('cards');

  const parsedData = typeof data === 'string' ? parseRawNoteData(data) : data;
  const sections = parsedData?.sections || [];

  const [activeId, setActiveId] = useState(sections[0]?.id);
  const [filter, setFilter] = useState('All');

  const countItems = (section: MasteryNoteSection) => {
    return (section.blocks || []).reduce((acc, b) => acc + (b.items ? b.items.length : 0), 0);
  };

  if (sections.length === 0) {
    return <div className="p-8 text-center text-[var(--text-muted)]">No notes available for this topic.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 items-start p-5 rounded-xl" style={{ background: T.bg, color: T.text, fontFamily: T.sans }}>
      {/* TOC sidebar */}
      <aside className="sticky top-20 hidden md:block text-[12px]">
        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-3">On this page</div>
        <div className="flex flex-col gap-0.5 border-l border-[var(--border)]">
          {sections.map((s, i) => {
            const active = activeId === s.id;
            return (
              <a key={s.id} href={`#sec-${s.id}`}
                 onClick={() => setActiveId(s.id)}
                 className={`group flex justify-between items-baseline gap-2 px-3 py-1.5 no-underline transition-all border-l-2 -ml-[1px]
                   ${active ? 'border-[#ff8a3d] text-[#ff8a3d]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                <span>
                  <span className="font-mono text-[10px] opacity-60 mr-2">0{i + 1}</span>
                  {s.title}
                </span>
                <span className="font-mono text-[10px] opacity-40">{countItems(s)}</span>
              </a>
            );
          })}
        </div>

        {parsedData?.meta && (
          <div className="mt-6 p-3 border border-[var(--border)] rounded-lg text-[11px] text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-surface-2)]">
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1.5">Reading time</div>
            <div className="text-[var(--text-primary)] font-mono text-[14px] mb-0.5">{parsedData.meta.readTime}</div>
            <div className="opacity-70">{parsedData.meta.cards} cards · updated {parsedData.meta.updated}</div>
          </div>
        )}
      </aside>

      {/* Content */}
      <div className="min-w-0">
        {/* Header strip */}
        <div className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-[var(--border)]">
          <Segmented value={density} onChange={(v) => setDensity(v as 'cards' | 'compact')} options={[
            { v: 'cards',   label: 'Cards', icon: <LayoutGrid size={11} /> },
            { v: 'compact', label: 'Compact', icon: <List size={11} /> },
          ]}/>

          <Segmented value={filter} onChange={setFilter} options={
            ['All','Definitions','Formulas','Tips','Pitfalls'].map(v => ({ v, label: v }))
          }/>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button className={btnClass(false)}>
              <Plus size={11} />
              Save
            </button>
            <button className={btnClass(false)}>Collapse all</button>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((s, i) => (
            <CollapsibleSection key={s.id} id={s.id} n={i + 1} title={s.title} sub={s.sub} open={!!s.open}>
              {density === 'compact'
                ? <CompactView blocks={s.blocks} />
                : s.blocks.map((b, j) => <Block key={j} block={b} />)
              }
            </CollapsibleSection>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 border border-[var(--border)] rounded-xl flex flex-wrap items-center gap-4 bg-[var(--bg-surface)]">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[13px] font-bold">Feel solid on this?</div>
            <div className="text-[11px] text-[var(--text-secondary)]">Mark mastered to add to your spaced-repetition queue.</div>
          </div>
          <div className="flex gap-2">
            <button className={btnClass(false)}>Need review</button>
            <button className={btnClass(true)}>
              <Check size={11} />
              Mastered
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
