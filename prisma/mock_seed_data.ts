import { type ExamType } from '../lib/examConfigs';
import * as path from 'path';

export interface PaperConfig {
  title: string;
  exam_type: string;
  branch: string | null;
  file?: string;
  sections?: {
    name: string;
    file: string;
  }[];
}

// Scraper output lives in scrapers/prepp-gate/output/, one file per subject:
//   <slug>_physics.json / _chemistry.json / _biology.json
// (Biology = Botany + Zoology merged by the scraper to match the 3-section NEET
// layout in lib/examConfigs.ts — section names MUST match there exactly.)
const NEET_OUTPUT_DIR = path.resolve(__dirname, '../scrapers/prepp-gate/output');

// One entry per scraped NEET paper: title year + the paper's slug (incl. the
// trailing id, which is part of the output filename).
const NEET_PAPERS: Array<{ year: number; slug: string }> = [
  { year: 2026, slug: 'neet-ug-question-paper-21-jun-2026-6a37e6d8bfd86de243b690f3' },
 
];

function neetConfig({ year, slug }: { year: number; slug: string }): PaperConfig {
  const file = (sub: string) => path.join(NEET_OUTPUT_DIR, `${slug}_${sub}.json`);
  return {
    title: `NEET ${year}`,
    exam_type: 'NEET',
    branch: null,
    sections: [
      { name: 'Physics', file: file('physics') },
      { name: 'Chemistry', file: file('chemistry') },
      { name: 'Biology', file: file('biology') },
    ],
  };
}

export const PAPER_CONFIGS: PaperConfig[] = [
  ...NEET_PAPERS.map(neetConfig),
];
