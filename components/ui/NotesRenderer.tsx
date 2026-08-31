// components/ui/NotesRenderer.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { memo, type CSSProperties } from 'react';
import { mathComponents } from '@/lib/math/markdownConfig';

// Authored notes (Pattern.short_notes) are hand-written markdown, NOT scraped
// question text. They render through a standard GFM + math pipeline instead of
// MathRenderer's scraped-content repair pipeline (lib/math/transform.ts), which
// escapes every literal "*" (killing **bold** / "*" bullets) and ships no
// remark-gfm (killing "|" tables). Used ONLY by the mastery-notes surfaces;
// questions/explanations keep using MathRenderer untouched.
//
// - No transformMathContent(): authored math is already clean, and the scraper
//   repairs would mangle it (sentence-splitting, C-code auto-format, & escaping).
// - remark-gfm ON  → tables, task lists, real "*"/"-" bullets, autolinks.
// - remark-breaks OFF → single newlines no longer force <br>.
// - Reuses mathComponents (styled code/pre) from markdownConfig — no edit there.
// - KaTeX CSS is loaded globally in app/layout.tsx, so it isn't imported here.

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

interface NotesRendererProps {
  content: string;
  className?: string;
  style?: CSSProperties;
}

const NotesRenderer = memo(function NotesRenderer({
  content,
  className,
  style,
}: NotesRendererProps) {
  return (
    <div className={`math-renderer ${className ?? ''}`} style={style}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={mathComponents}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
});

export default NotesRenderer;
