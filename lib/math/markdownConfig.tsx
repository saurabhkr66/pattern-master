// lib/math/markdownConfig.tsx
//
// Single source of truth for the react-markdown configuration used by BOTH the
// live client component (components/ui/MathRenderer.tsx) and the server-side
// pre-renderer (lib/math/renderHtml.tsx). Keeping plugins + custom components
// here guarantees the stored HTML is byte-identical to what the client would
// render, so Option B never changes the on-screen result.
//
// NOTE: deliberately does NOT import katex CSS — that is loaded globally in
// app/layout.tsx, so this module is safe to import from Node (renderHtml,
// backfill scripts) without a CSS loader.

import type { Components } from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";

export const mathRemarkPlugins = [remarkMath, remarkBreaks];
export const mathRehypePlugins = [rehypeKatex];

export const mathComponents: Components = {
  pre: ({ children }) => (
    <pre className="whitespace-pre-wrap break-words bg-zinc-900 border border-zinc-700 rounded-md px-4 py-3 my-3 font-mono text-[13px] text-zinc-100 overflow-x-auto">
      {children}
    </pre>
  ),
  code: ({ node, ...props }) => {
    // Inside a <pre> (fenced block) — no extra bg
    const isBlock = (node?.data as Record<string, unknown> | undefined)?.meta !== undefined
      || !!(props as { className?: string }).className;
    return (
      <code
        className={
          isBlock
            ? 'whitespace-pre-wrap break-words font-mono text-[13px]'
            : 'whitespace-pre-wrap break-words bg-zinc-800 text-zinc-100 rounded px-1 font-mono text-[13px]'
        }
        {...props}
      />
    );
  },
};
