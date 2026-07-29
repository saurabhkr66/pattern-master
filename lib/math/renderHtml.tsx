// lib/math/renderHtml.tsx
//
// Server-side pre-renderer for Option B. Runs the SAME pipeline as the live
// MathRenderer client component (transformMathContent → react-markdown with the
// shared remark/rehype config) and serialises it to a static HTML string via
// renderToStaticMarkup.
//
// The returned string is the INNER markup only (no `.math-renderer` wrapper) —
// exactly what <ReactMarkdown> emits in MathRenderer. The consuming component
// (components/ui/MathHtml.tsx) wraps it in the same `.math-renderer` div so the
// stored output renders identically to the live path.
//
// Runs in Node: used by the backfill script and (later) the scraper ingestion.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { transformMathContent } from "./transform";
import { mathRemarkPlugins, mathRehypePlugins, mathComponents } from "./markdownConfig";

// Bump whenever transform.ts / markdownConfig change so the backfill knows which
// stored rows are stale. MathHtml falls back to live rendering for rows whose
// render_version is below this, so correctness is never broken in the meantime.
// v3: transform.ts stopped re-wrapping already-display "$$…\begin{cases}…$$"
//     blocks, which used to leave a stray literal "$" on either side.
export const RENDER_VERSION = 3;

// Scraped content occasionally contains an unpaired UTF-16 surrogate (a broken
// character). The browser tolerates it when rendering live, but it is invalid
// UTF-8 and cannot be serialised over Neon's HTTP/JSON transport when storing —
// it throws "lone leading surrogate". Replace any unpaired surrogate with U+FFFD
// (the standard replacement char) so the stored HTML is always valid.
function stripLoneSurrogates(s: string): string {
  return s
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "�") // high surrogate not followed by low
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�"); // low surrogate not preceded by high
}

/** Render one content string to a static HTML string (inner markup only). */
export function renderMathHtml(content: string): string {
  const processed = transformMathContent(content || "");
  const el = createElement(
    ReactMarkdown as unknown as React.ComponentType<Record<string, unknown>>,
    {
      remarkPlugins: mathRemarkPlugins,
      rehypePlugins: mathRehypePlugins,
      components: mathComponents,
    },
    processed
  );
  return stripLoneSurrogates(renderToStaticMarkup(el));
}

/** Render an array of strings (e.g. options[]). Skips null/undefined. */
export function renderMathHtmlArray(
  items: (string | null | undefined)[] | null | undefined
): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((s) => renderMathHtml(s ?? ""));
}
