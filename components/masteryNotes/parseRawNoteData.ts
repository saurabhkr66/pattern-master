import type { MasteryNoteData, MasteryNoteSection } from "./types";

// Seeded notes (Pattern.short_notes) are plain markdown, so this parser decides
// what the renderer sees. Two things matter for KaTeX to come out right:
//
//  1. Only h1/h2 open a new collapsible section. Deeper headings stay inside the
//     markdown body — otherwise a note using "###" for sub-points exploded into
//     dozens of one-line sections and the prose lost its hierarchy.
//  2. Display math ("$$…$$") must sit on its own line with a blank line before
//     it, or remark-math parses it as inline text and the raw LaTeX leaks. The
//     line-level scan below re-inserts those blank lines, and never touches the
//     inside of a fenced code block.

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^\s*(?:```|~~~)/;

function slugify(s: string, fallback: string): string {
  const slug = s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || fallback;
}

/** Estimated reading time, ~200 wpm, floored at 1 minute. */
function readTime(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean).length;
  return `~${Math.max(1, Math.round(words / 200))} min`;
}

/**
 * Ensures every "$$" display-math delimiter starts its own line and is preceded
 * by a blank line. remark-math only treats "$$" as display math at block level;
 * inline "$$" is silently passed through as literal text.
 */
function normalizeDisplayMath(lines: string[]): string[] {
  const out: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence || !line.includes('$$')) {
      out.push(line);
      continue;
    }

    // Split the line at each "$$" so the delimiter always begins a line.
    const parts = line.split(/(\$\$)/).filter(p => p !== '');
    for (const part of parts) {
      if (part === '$$') {
        if (out.length && out[out.length - 1].trim() !== '') out.push('');
        out.push('$$');
      } else if (part.trim() !== '') {
        out.push(part.trim());
      }
    }
    // A closing "$$" must also be followed by a blank line before prose resumes.
    out.push('');
  }

  return out;
}

export function parseRawNoteData(raw: string): MasteryNoteData {
  if (!raw) return { sections: [] };

  // 1. Try JSON (the structured card format).
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? { sections: parsed } : parsed;
    } catch (e) {
      console.warn("Failed to parse MasteryNote JSON, falling back to markdown", e);
    }
  }

  // 2. Markdown.
  const sections: MasteryNoteSection[] = [];
  const lines = normalizeDisplayMath(raw.split('\n'));
  let current: MasteryNoteSection | null = null;
  let inFence = false;

  const openSection = (title: string, sub = '') => {
    current = {
      id: slugify(title, `section-${sections.length + 1}`),
      title,
      sub,
      open: sections.length === 0,
      blocks: [{ kind: 'markdown', items: [] }],
    };
    sections.push(current);
    return current;
  };

  const push = (line: string) => {
    const section = current ?? openSection('Overview');
    (section.blocks[0].items as string[]).push(line);
  };

  for (const line of lines) {
    if (FENCE_RE.test(line)) inFence = !inFence;

    const heading = inFence ? null : line.match(HEADING_RE);
    // h3+ is body content, not a section break — keep the hierarchy readable.
    if (heading && heading[1].length <= 2) {
      const title = heading[2].trim();
      if (title) {
        openSection(title);
        continue;
      }
    }
    push(line);
  }

  // Trim leading/trailing blank lines so sections don't open with dead space.
  for (const s of sections) {
    const items = s.blocks[0].items as string[];
    while (items.length && items[0].trim() === '') items.shift();
    while (items.length && items[items.length - 1].trim() === '') items.pop();
  }

  const withBody = sections.filter(s => (s.blocks[0].items as string[]).length > 0);
  const populated = withBody.length > 0 ? withBody : sections;
  if (populated.length > 0) populated[0].open = true;

  return {
    meta: {
      readTime: readTime(raw),
      cards: populated.length,
      updated: 'recently',
    },
    sections: populated,
  };
}
