// components/ui/MathInline.tsx
//
// Inline sibling of <MathRenderer>. Same transform pipeline, same remark/rehype
// plugins — the only difference is the output shape: everything collapses to
// phrasing content so it can sit inside a card label, a table cell, a <pre>, or
// a heading without introducing a block-level <div>/<p> that breaks the layout.
//
// Why this exists: the mastery-notes cards render short strings in tight inline
// slots (name, title, bound, gloss, hint, ladder chips…). Before this, those
// slots printed raw text, so any "$…$" the note author wrote leaked as literal
// dollar signs. Wrapping them in <MathRenderer> is not an option — its <div><p>
// output collapses the flex/grid rows around it and nests a <div> inside <pre>
// (invalid HTML → hydration mismatch).
//
// Display math is deliberately downgraded to inline math: rehype-katex emits a
// block <div class="katex-display"> for "$$…$$", which cannot legally live inside
// the <span> wrapper. Notes that genuinely need display math should use a
// `markdown` block, which still goes through <MathRenderer>.

'use client';

import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';

import { memo, type CSSProperties, type ComponentProps, type ReactNode } from 'react';
import type { Components } from 'react-markdown';
import { transformMathContent } from '@/lib/math/transform';
import { mathRemarkPlugins, mathRehypePlugins } from '@/lib/math/markdownConfig';

// Every block-level element markdown can produce is flattened to a fragment or a
// phrasing-level tag, so the rendered subtree is always valid inside a <span>.
const passThrough = ({ children }: { children?: ReactNode }) => <>{children}</>;

const inlineComponents: Components = {
  p: passThrough,
  pre: passThrough,
  ul: passThrough,
  ol: passThrough,
  li: passThrough,
  blockquote: passThrough,
  h1: passThrough,
  h2: passThrough,
  h3: passThrough,
  h4: passThrough,
  h5: passThrough,
  h6: passThrough,
  hr: () => null,
  code: ({ children, className }: ComponentProps<'code'>) => (
    <code className={`font-mono ${className ?? ''}`}>{children}</code>
  ),
};

interface MathInlineProps {
  content?: string | null;
  className?: string;
  style?: CSSProperties;
}

const MathInline = memo(function MathInline({ content, className, style }: MathInlineProps) {
  const raw = content ?? '';
  if (!raw.trim()) return null;

  // Downgrade display math to inline AFTER the transform: the pipeline itself
  // introduces "$$" (autoCloseDisplayMath / wrapBareMathEnvs), so rewriting
  // beforehand would not be enough. Delimiters are matched in PAIRS and the
  // body is flattened onto one line — remark-math only recognises inline "$…$"
  // within a single line, so a naive "$$"→"$" swap would leave stray dollar
  // signs printed as text. Any unpaired "$$" left over is collapsed too.
  const processed = transformMathContent(raw)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, body: string) => `$${body.replace(/\s*\n\s*/g, ' ').trim()}$`)
    .replace(/\$\$/g, '$');

  return (
    <span className={`math-inline ${className ?? ''}`} style={style}>
      <ReactMarkdown
        remarkPlugins={mathRemarkPlugins}
        rehypePlugins={mathRehypePlugins}
        components={inlineComponents}
      >
        {processed}
      </ReactMarkdown>
    </span>
  );
});

export default MathInline;
