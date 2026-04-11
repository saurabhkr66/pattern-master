// components/ui/MathRenderer.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

export default function MathRenderer({ content, className }: MathRendererProps) {
  // Pre-process common LaTeX delimiters so remark-math recognizes them
  const processedContent = (content || '')
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');

  return (
    <div className={className}>
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
}
