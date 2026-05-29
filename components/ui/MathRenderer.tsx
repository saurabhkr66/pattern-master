// components/ui/MathRenderer.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';

import { memo, CSSProperties } from 'react';
import { transformMathContent } from '@/lib/math/transform';
import { mathRemarkPlugins, mathRehypePlugins, mathComponents } from '@/lib/math/markdownConfig';

interface MathRendererProps {
  content: string;
  className?: string;
  style?: CSSProperties;
}

// The heavy string-normalisation pipeline + react-markdown config now live in
// lib/math/* so the server-side pre-renderer (lib/math/renderHtml) and the
// backfill script produce byte-identical output. See lib/math/transform.ts.
const MathRenderer = memo(function MathRenderer({ content, className, style }: MathRendererProps) {
  const processedContent = transformMathContent(content || '');

  return (
    <div className={`math-renderer ${className ?? ""}`} style={style}>
      <ReactMarkdown
        remarkPlugins={mathRemarkPlugins}
        rehypePlugins={mathRehypePlugins}
        components={mathComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

export default MathRenderer;
