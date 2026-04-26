"use client"

import React, { useState } from 'react';
import { 
  ChevronRight, 
  LayoutGrid, 
  List, 
  Plus, 
  Save, 
  Check, 
  AlertCircle,
  Info
} from 'lucide-react';
import MathRenderer from './ui/MathRenderer';

// ─── Tokens ─────────────────────────────────────────────
// Blending with current project CSS variables
const T = {
  bg:       'var(--bg-base)',
  surface:  'var(--bg-surface)',
  surface2: 'var(--bg-surface-2)',
  line:     'var(--border)',
  lineHi:   'var(--border-strong)',
  text:     'var(--text-primary)',
  textDim:  'var(--text-secondary)',
  textMute: 'var(--text-muted)',
  accent:   '#ff8a3d',  // BattleExam orange
  good:     '#4ade80',
  bad:      '#f87171',
  warn:     '#fbbf24',
  serif:    'ui-serif, "Iowan Old Style", "Apple Garamond", Georgia, serif',
  mono:     'var(--font-mono, ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace)',
  sans:     'var(--font-sans, ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif)',
};

// ─── Types ───────────────────────────────────────────────
export interface MasteryNoteItem {
  sym?: string;
  name?: string;
  bound?: string;
  formula?: string;
  cond?: string;
  gloss?: string;
  color?: string;
  title?: string;
  body?: string;
  eg?: string;
  label?: string;
  code?: string;
  hint?: string;
  wrong?: string;
  right?: string;
}

export interface MasteryNoteBlock {
  kind: 'def' | 'ladder' | 'rules' | 'props' | 'tips' | 'pitfalls' | 'markdown';
  label?: string;
  items?: (string | MasteryNoteItem)[];
}

export interface MasteryNoteSection {
  id: string;
  title: string;
  sub: string;
  open?: boolean;
  blocks: MasteryNoteBlock[];
}

export interface MasteryNoteData {
  meta?: {
    readTime: string;
    cards: number;
    updated: string;
  };
  sections: MasteryNoteSection[];
}

// ─── Sample data (GATE — Asymptotic Analysis) ───────────
const SAMPLE: MasteryNoteData = {
  meta: { readTime: '~9 min', cards: 23, updated: '3d ago' },
  sections: [
    {
      id: 'def', title: 'Formal Definitions',
      sub: 'Three asymptotic bounds — write from memory', open: true,
      blocks: [{ kind: 'def', items: [
        { sym: 'O', name: 'Big-O', bound: 'Upper', formula: 'f(n) ≤ c·g(n)', cond: 'n ≥ n₀', gloss: 'f never grows faster than g.', color: T.bad },
        { sym: 'Ω', name: 'Omega', bound: 'Lower', formula: 'f(n) ≥ c·g(n)', cond: 'n ≥ n₀', gloss: 'f always grows at least as fast as g.', color: T.good },
        { sym: 'Θ', name: 'Theta', bound: 'Tight', formula: 'c₁·g(n) ≤ f(n) ≤ c₂·g(n)', cond: 'n ≥ n₀', gloss: 'f and g grow at the same rate.', color: T.accent },
      ]}],
    },
    {
      id: 'lad', title: 'Growth-Rate Ladder',
      sub: 'Memorize this ordering', open: true,
      blocks: [
        { kind: 'ladder', label: 'Slowest → Fastest', items: ['O(1)','O(log log n)','O(log n)','O(n^(1/k))','O(n)','O(n log n)','O(n^k)','O(aⁿ)','O(n!)'] },
        { kind: 'rules', items: [
          { title: 'log(n!) is Θ(n log n)', body: 'Useful in comparison-sort lower bounds.' },
          { title: 'Polynomial < Exponential', body: 'nᵏ is always slower than aⁿ for large n.' },
        ]},
      ],
    },
    {
      id: 'prop', title: 'Properties',
      sub: 'The four moves in nearly every Big-O proof',
      blocks: [{ kind: 'props', items: [
        { name: 'Transitivity', formula: 'f=O(g), g=O(h) ⇒ f=O(h)', eg: 'If f is O(n²) and n² is O(n³), then f is O(n³).' },
        { name: 'Summation',    formula: 'O(f+g) = max(O(f), O(g))', eg: 'Bigger term wins; drop the smaller.' },
        { name: 'Product',      formula: 'O(f·g) = O(f)·O(g)',       eg: 'Nested loops multiply: O(n)×O(n)=O(n²).' },
        { name: 'Symmetry',     formula: 'f=Θ(g) ⇔ g=Θ(f)',           eg: 'Theta is the only bound that flips both ways.' },
      ]}],
    },
    {
      id: 'tips', title: 'GATE Code Tips',
      sub: 'Spot the loop pattern → write the bound',
      blocks: [{ kind: 'tips', items: [
        { label: 'Iterative · additive',       code: 'i = i + k',                bound: 'O(n)',           hint: 'Linear update → linear work.' },
        { label: 'Iterative · multiplicative', code: 'i = i*k\ni = i/k',         bound: 'O(logₖ n)',       hint: 'Multiply/divide → log base k.' },
        { label: 'Recursive',                  code: 'T(n) = aT(n/b) + Θ(nᵏ)',   bound: 'Master Theorem', hint: 'Compare nᵏ to n^(logᵦa).' },
      ]}],
    },
    {
      id: 'pit', title: 'Pitfalls',
      sub: 'What examiners trap you with',
      blocks: [{ kind: 'pitfalls', items: [
        { title: 'Confusing Θ with O', wrong: 'f(n)=O(n) implies f(n)=Θ(n).', right: 'O is only an upper bound; f could grow much slower.' },
        { title: 'Dropping log bases', wrong: 'Treating log₂ n and log₁₀ n as different orders.', right: 'Base change = constant factor. Same Θ class.' },
      ]}],
    },
  ],
};

// ─── Lightweight button styling ─────────────────────────
const btnClass = (primary: boolean) => `
  inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
  ${primary 
    ? 'bg-[#ff8a3d] text-[#0c0c0e] hover:brightness-110' 
    : 'bg-white/5 border border-[var(--border)] text-[var(--text-primary)] hover:bg-white/10'}
`;

// ─── Root component ─────────────────────────────────────
export default function MasteryNotes({ data = SAMPLE }: { data?: MasteryNoteData | string }) {
  const [density, setDensity] = useState<'cards' | 'compact'>('cards');

  // Resilient parsing of data
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

// ─── Segmented control ──────────────────────────────────
function Segmented({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { v: string, label: string, icon?: React.ReactNode }[] }) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-white/5 rounded-lg border border-[var(--border)]">
      {options.map(o => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
              ${active ? 'bg-white/10 text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Collapsible section wrapper ────────────────────────
function CollapsibleSection({ id, n, title, sub, open = false, children }: { id: string, n: number, title: string, sub: string, open?: boolean, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <div id={`sec-${id}`} className="mb-4 scroll-mt-24">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className={`flex items-baseline gap-2.5 py-2 cursor-pointer transition-all border-b border-transparent
          ${!isOpen ? 'border-[var(--border)]' : 'mb-3'}`}
      >
        <ChevronRight 
          size={12} 
          className={`transition-transform duration-200 mt-1 flex-shrink-0 text-[var(--text-muted)]
            ${isOpen ? 'rotate-90' : ''}`} 
        />
        <div className="font-mono text-[11px] text-[#ff8a3d] font-bold tracking-tight">0{n}</div>
        <div className="text-[16px] font-bold tracking-tight" style={{ fontFamily: T.serif }}>{title}</div>
        <div className="text-[11px] text-[var(--text-muted)] italic hidden sm:block" style={{ fontFamily: T.serif }}>· {sub}</div>
        <div className="flex-1" />
        {!isOpen && <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-60">Expand</span>}
      </div>
      {isOpen && <div className="pl-6">{children}</div>}
    </div>
  );
}

// ─── Block renderer (cards mode) ────────────────────────
function Block({ block }: { block: MasteryNoteBlock }) {
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

// ─── Compact mode — single inline list ──────────────────
function CompactView({ blocks }: { blocks: MasteryNoteBlock[] }) {
  const lines: { label: string, value: string, gloss?: string, color?: string }[] = [];
  
  blocks.forEach(b => {
    (b.items || []).forEach(it => {
      const item = typeof it === 'string' ? { name: 'Item', formula: it } : it;
      if (b.kind === 'def')      lines.push({ label: item.name || '',  value: item.formula || '', gloss: item.gloss, color: item.color });
      else if (b.kind === 'rules') lines.push({ label: stripHtml(item.title || ''), value: item.body || '' });
      else if (b.kind === 'props') lines.push({ label: item.name || '',  value: item.formula || '', gloss: item.eg });
      else if (b.kind === 'tips')  lines.push({ label: item.label || '', value: item.code || '',    gloss: `→ ${item.bound} · ${item.hint}` });
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

// ─── Card primitives ────────────────────────────────────
function DefCard({ sym, name, bound, formula, cond, gloss, color }: MasteryNoteItem) {
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

function NoteCard({ title, body }: MasteryNoteItem) {
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

function PropCard({ name, formula, eg }: MasteryNoteItem) {
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

function TipCard({ label, code, bound, hint }: MasteryNoteItem) {
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

function PitfallCard({ title, wrong, right }: MasteryNoteItem) {
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

// ─── Helpers ────────────────────────────────────────────
function stripHtml(s: string) { return s.replace(/<[^>]+>/g, ''); }

export function parseRawNoteData(raw: string): MasteryNoteData {
  if (!raw) return { sections: [] };
  
  // 1. Try JSON
  if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse MasteryNote JSON, falling back to markdown", e);
    }
  }

  // 2. Fallback to Markdown Parser
  const sections: MasteryNoteSection[] = [];
  const lines = raw.split('\n');
  let currentSection: MasteryNoteSection | null = null;
  
  lines.forEach(line => {
    // If it's a heading (### or ## or #)
    if (line.match(/^#+\s+/)) {
      const title = line.replace(/^#+\s+/, '').trim();
      currentSection = {
        id: title.toLowerCase().replace(/[^\w]+/g, '-'),
        title: title,
        sub: '',
        open: sections.length === 0, // First section open by default
        blocks: [{ kind: 'markdown', items: [] }]
      };
      sections.push(currentSection);
    } else {
      if (!currentSection) {
        currentSection = {
          id: 'overview', title: 'Overview', sub: '', open: true,
          blocks: [{ kind: 'markdown', items: [] }]
        };
        sections.push(currentSection);
      }
      (currentSection.blocks[0].items as string[]).push(line);
    }
  });

  return { 
    meta: { readTime: '~5 min', cards: 0, updated: 'today' },
    sections 
  };
}
