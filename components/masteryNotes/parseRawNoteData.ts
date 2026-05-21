import type { MasteryNoteData, MasteryNoteSection } from "./types";

export function parseRawNoteData(raw: string): MasteryNoteData {
  if (!raw) return { sections: [] };

  // 1. Try JSON
  if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse MasteryNote JSON, falling back to markdown", e);
    }
  }

  // 2. Fallback to Markdown Parser
  const sections: MasteryNoteSection[] = [];
  const lines = raw.split('\n');
  let currentSection: MasteryNoteSection | null = null;

  lines.forEach(line => {
    if (line.match(/^#+\s+/)) {
      const title = line.replace(/^#+\s+/, '').trim();
      currentSection = {
        id: title.toLowerCase().replace(/[^\w]+/g, '-'),
        title: title,
        sub: '',
        open: sections.length === 0,
        blocks: [{ kind: 'markdown', items: [] }]
      };
      sections.push(currentSection);
    } else {
      if (!currentSection) {
        currentSection = {
          id: 'overview', title: 'Overview', sub: '', open: true,
          blocks: [{ kind: 'markdown', items: [] }]
        };
        sections.push(currentSection);
      }
      (currentSection.blocks[0].items as string[]).push(line);
    }
  });

  return {
    meta: { readTime: '~5 min', cards: 0, updated: 'today' },
    sections
  };
}
