// Blending with current project CSS variables
export const T = {
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

// ─── Lightweight button styling ─────────────────────────
export const btnClass = (primary: boolean) => `
  inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
  ${primary
    ? 'bg-[#ff8a3d] text-[#0c0c0e] hover:brightness-110'
    : 'bg-white/5 border border-[var(--border)] text-[var(--text-primary)] hover:bg-white/10'}
`;

export function stripHtml(s: string) { return s.replace(/<[^>]+>/g, ''); }
