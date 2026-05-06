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
    .replace(/\\\)/g, '$')
    // JEE scraper: backslash + Unicode commands → valid KaTeX
    .replace(/\\∝/g, '\\propto')
    .replace(/\\∵/g, '\\because')
    .replace(/\\⇒/g, '\\Rightarrow')
    .replace(/\\Δ/g, '\\Delta')
    .replace(/\\δ/g, '\\delta')
    .replace(/\\λ/g, '\\lambda')
    // JEE scraper: bare Unicode inside math that KaTeX may reject
    .replace(/\$([^$]*?)∵([^$]*?)\$/g, (_, a, b) => `$${a}\\because ${b}$`)
    .replace(/\$([^$]*?)⇒([^$]*?)\$/g, (_, a, b) => `$${a}\\Rightarrow ${b}$`)
    // JEE scraper: {A}/{B} fake fractions → \frac{A}{B}
    .replace(/\{([^{}]+)\}\/\{([^{}]+)\}/g, '\\frac{$1}{$2}')
    // JEE scraper: unwrapped dimensional formulas [M^...L^...T^...] → $[...]$
    // Only wraps if not already inside $...$ (negative lookbehind/lookahead for $)
    .replace(/(?<!\$)\[([^\[\]]+\^[^\[\]]+)\](?!\()(?!\$)/g, '\\$$[$1]\\$$')
    
    // AI DEFECT CLEANERS (Defensive Fixes)
    // 1. Fix the "Square Bracket Link" conflict: Replace [ with a version that won't trigger Markdown links
    // but KaTeX will still understand inside math blocks.
    .replace(/\\left\s*\[/g, '\\left[')
    .replace(/\\right\s*\]/g, '\\right]')
    
    // 2. Fix broken limits and hallucinated dollars (The root cause of red text)
    .replace(/([\]\}])\s*\\?\$([_^])/g, '$1$2')
    .replace(/([\[\(\{])\s*\\?\$([\\]?(frac|sum|int|sqrt|left|right|\[|{|text))/g, '$1$2')
    .replace(/(\\left|\\right)\s*\\?\$([\[\(\{])/g, '$1$2')
    
    // 3. Fix character-level spacing (e.g., G i v e n -> Given)
    .replace(/\b([A-Z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, (m) => m.replace(/\s+/g, ''))
    .replace(/\b([A-Z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, (m) => m.replace(/\s+/g, ''));


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
