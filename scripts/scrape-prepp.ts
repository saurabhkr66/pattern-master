/**
 * Scrapes a prepp.in question paper page using a session cookie.
 *
 * Usage:
 *   npx tsx scripts/scrape-prepp.ts \
 *     --url "https://prepp.in/paper/gate-ch-question-paper-07-feb-2026-shift-2-69c4dd8f03f2c775a9dc8040" \
 *     --cookie "your_cookie_string_here" \
 *     --out "gate_ch_2026_shift2.json"
 *
 * The --cookie value is the full Cookie header string from your browser DevTools.
 */

import * as fs from 'fs';

// ──────────────────────────────────────────────
// CLI args
// ──────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
}

const url = getArg('url');
const cookie = getArg('cookie');
const outFile = getArg('out') ?? 'scraped_prepp.json';

if (!url || !cookie) {
  console.error('Usage: npx tsx scripts/scrape-prepp.ts --url <URL> --cookie <COOKIE> [--out <file.json>]');
  process.exit(1);
}

// ──────────────────────────────────────────────
// Output types
// ──────────────────────────────────────────────
interface QuestionImage {
  index: number;
  filename: string;
  type?: 'explanation';
}

interface ScrapedQuestion {
  topic_name: string;
  question_text: string;
  images: QuestionImage[];
  options: string[];
  correct_answer: string;
  explanation: string;
  year: number;
  marks: number;
  negative_marks: number;
  exam_type: string;
  question_type: 'MCQ' | 'NAT' | 'MSQ';
  section: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function extractNextData(html: string): unknown {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/** Strip HTML tags to plain text */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract image URLs from HTML string */
function extractImages(html: string): string[] {
  const imgs: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    imgs.push(m[1]);
  }
  return imgs;
}

interface PrepqOption {
  content: { en?: string | null; default?: string | null };
  isCorrect: boolean;
}

interface PreppQuestion {
  id: string;
  qIndex: number;
  subject?: { name?: { en?: string | null } };
  text: { en?: string | null; default?: string | null };
  positiveMarks: number;
  negativeMarks: number;
  type: string;
  answer?: number;          // SINGLE_ANSWER_MCQ — index of correct option
  answers?: number[];       // MULTIPLE_ANSWER_MCQ — indices of correct options
  options?: PrepqOption[];
  solution?: { text?: { en?: string | null; default?: string | null } };
  parent?: unknown;
  __typename: string;
}

interface PreppSection {
  name: { en?: string | null };
  questions: PreppQuestion[];
}

function mapQuestionType(type: string, options: PrepqOption[]): 'MCQ' | 'NAT' | 'MSQ' {
  if (type === 'MULTIPLE_ANSWER_MCQ') return 'MSQ';
  if (type === 'SINGLE_ANSWER_MCQ') return 'MCQ';
  if (type === 'NUMERICAL') return 'NAT';
  // Fallback: no options → NAT
  if (!options || options.length === 0) return 'NAT';
  return 'MCQ';
}

function normaliseQuestion(
  raw: PreppQuestion,
  sectionName: string,
  examMeta: { exam_type: string; year: number }
): ScrapedQuestion {
  const questionHtml = raw.text?.en ?? raw.text?.default ?? '';
  const question_text = stripHtml(questionHtml);

  // Collect images from question HTML
  const images: QuestionImage[] = extractImages(questionHtml).map((src, i) => ({
    index: i + 1,
    filename: src,
  }));

  const options: string[] = (raw.options ?? []).map((o) =>
    stripHtml(o.content?.en ?? o.content?.default ?? '')
  );

  // Correct answer: build a readable string
  let correct_answer = '';
  if (raw.type === 'SINGLE_ANSWER_MCQ' && typeof raw.answer === 'number') {
    const idx = raw.answer;
    correct_answer = options[idx] ?? String(idx);
  } else if (raw.type === 'MULTIPLE_ANSWER_MCQ' && Array.isArray(raw.answers)) {
    correct_answer = raw.answers.map((i) => options[i] ?? String(i)).join(' | ');
  } else if (raw.type === 'NUMERICAL') {
    // For NAT, answer is often embedded differently; use the isCorrect flag if present
    const correctOpt = (raw.options ?? []).find((o) => o.isCorrect);
    correct_answer = correctOpt
      ? stripHtml(correctOpt.content?.en ?? correctOpt.content?.default ?? '')
      : '';
  }

  const explanationHtml = raw.solution?.text?.en ?? raw.solution?.text?.default ?? '';
  const explanation = stripHtml(explanationHtml);

  // Collect explanation images
  extractImages(explanationHtml).forEach((src, i) => {
    images.push({ index: images.length + i + 1, filename: src, type: 'explanation' });
  });

  const topic_name = raw.subject?.name?.en ?? '';
  const marks = raw.positiveMarks ?? 1;
  const negative_marks = raw.negativeMarks ?? 0;
  const question_type = mapQuestionType(raw.type, raw.options ?? []);

  return {
    topic_name,
    question_text,
    images,
    options,
    correct_answer,
    explanation,
    year: examMeta.year,
    marks,
    negative_marks,
    exam_type: examMeta.exam_type,
    question_type,
    section: sectionName,
  };
}

// ──────────────────────────────────────────────
// Derive year + exam_type from URL / page data
// ──────────────────────────────────────────────
function metaFromUrl(u: string): { exam_type: string; year: number } {
  const yearMatch = u.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  const examMatch = u.match(/gate-([a-z]+)-/i);
  const branch = examMatch ? examMatch[1].toUpperCase() : 'GATE';
  return { exam_type: `GATE ${branch}`, year };
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log(`Fetching: ${url}`);

  const res = await fetch(url!, {
    headers: {
      Cookie: cookie!,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xhtml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://prepp.in/',
    },
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const html = await res.text();
  const nextData = extractNextData(html);

  if (!nextData) {
    console.error('Could not find __NEXT_DATA__ — saving raw HTML to debug_prepp.html');
    fs.writeFileSync('debug_prepp.html', html, 'utf8');
    process.exit(1);
  }

  fs.writeFileSync('debug_next_data.json', JSON.stringify(nextData, null, 2), 'utf8');
  console.log('__NEXT_DATA__ saved to debug_next_data.json');

  // Navigate to sections
  const testBySlug = (nextData as Record<string, unknown> & {
    props: {
      initialProps: {
        pageProps: {
          testData: {
            testBySlug: {
              sections: PreppSection[];
              exams: Array<{ shortName?: { en?: string }; tagName?: string; year?: number | null }>;
              name: { en?: string };
            };
          };
        };
      };
    };
  }).props.initialProps.pageProps.testData.testBySlug;

  const sections: PreppSection[] = testBySlug.sections ?? [];

  if (sections.length === 0) {
    console.error('No sections found in __NEXT_DATA__. Check debug_next_data.json.');
    process.exit(1);
  }

  // Derive exam meta from page data, fallback to URL
  const urlMeta = metaFromUrl(url!);
  const examShortName =
    testBySlug.exams?.[0]?.tagName ??
    testBySlug.exams?.[0]?.shortName?.en ??
    urlMeta.exam_type;
  const examMeta = { exam_type: examShortName, year: urlMeta.year };
  console.log(`Exam: ${examMeta.exam_type}  Year: ${examMeta.year}`);

  const questions: ScrapedQuestion[] = [];

  for (const section of sections) {
    const sectionName = section.name?.en ?? '';
    console.log(`  Section: ${sectionName} — ${section.questions.length} questions`);
    for (const raw of section.questions) {
      // Skip child questions (part of a passage parent); they appear as standalone too
      const q = normaliseQuestion(raw, sectionName, examMeta);
      if (q.question_text.length > 0) {
        questions.push(q);
      }
    }
  }

  console.log(`\nTotal questions normalised: ${questions.length}`);

  const mcq = questions.filter((q) => q.question_type === 'MCQ').length;
  const nat = questions.filter((q) => q.question_type === 'NAT').length;
  const msq = questions.filter((q) => q.question_type === 'MSQ').length;
  console.log(`  MCQ: ${mcq}  NAT: ${nat}  MSQ: ${msq}`);

  fs.writeFileSync(outFile, JSON.stringify(questions, null, 2), 'utf8');
  console.log(`\nOutput written to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
