// components/ui/MathRenderer.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { memo, CSSProperties } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
  style?: CSSProperties;
}

const MathRenderer = memo(function MathRenderer({ content, className, style }: MathRendererProps) {
  // Normalise typographic/smart characters that KaTeX doesn't understand.
  // These appear in scraped question text (e.g. "1's", "it's", "don't").
  const processedContent = (content || '')
    // Smart/curly quotes → straight equivalents
    .replace(/[‘’ʼ`´]/g, "'")   // ' ' → '
    .replace(/[“”]/g, '"')                       // " " → "
    // Em/en dashes → hyphen
    .replace(/[–—]/g, '-')
    // Ellipsis character → three dots
    .replace(/…/g, '...')
    // LaTeX delimiter conversions
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');


  return (
    <div className={className} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre: ({ children }) => (
            <pre className="whitespace-pre-wrap break-words bg-transparent p-0 m-0 font-mono text-[13px]">
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="whitespace-pre-wrap break-words bg-transparent p-0 font-mono">
              {children}
            </code>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

export default MathRenderer;
