// components/masteryNotes/mathText.ts
//
// Note fields used to be dumped straight into the DOM (some via
// dangerouslySetInnerHTML), so older seeded notes carry a few inline HTML tags.
// Now that every field goes through markdown + KaTeX, raw HTML would simply be
// dropped by react-markdown (no rehype-raw), silently losing the emphasis.
// Convert the handful of tags that actually appear into their markdown
// equivalents so old and new notes render identically.

// Bold is "__", not "**": transform.ts's escapeStrayEmphasis() escapes every
// literal "*" outside math (a "*" in scraped content is a Kleene star, not
// emphasis), so "**bold**" would render as literal asterisks. Underscores are
// left alone by that pass and mean the same thing to remark.
const TAG_TO_MARKDOWN: Array<[RegExp, string]> = [
  [/<\s*(?:b|strong)\s*>/gi, '__'],
  [/<\s*\/\s*(?:b|strong)\s*>/gi, '__'],
  [/<\s*(?:i|em)\s*>/gi, '_'],
  [/<\s*\/\s*(?:i|em)\s*>/gi, '_'],
  [/<\s*code\s*>/gi, '`'],
  [/<\s*\/\s*code\s*>/gi, '`'],
  [/<\s*br\s*\/?\s*>/gi, '\n'],
];

/**
 * Rewrites legacy inline HTML as markdown and strips any remaining tags, so the
 * string is safe to hand to <MathInline> / <MathRenderer>.
 */
export function htmlToMarkdown(s?: string | null): string {
  if (!s) return '';
  let out = s;
  for (const [re, replacement] of TAG_TO_MARKDOWN) out = out.replace(re, replacement);
  return out.replace(/<[^>]+>/g, '');
}

/** True when a field has something worth rendering (avoids empty KaTeX spans). */
export function hasText(s?: string | null): s is string {
  return !!s && s.trim().length > 0;
}
