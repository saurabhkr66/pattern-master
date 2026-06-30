/**
 * fix-pyq-latex.ts
 *
 * Repairs garbled scraper LaTeX in ALREADY-SEEDED PYQs — the case where each
 * formula was dumped as a triple render with no delimiters, e.g.
 *   "λ4\; \frac{\lambda}{4}4λ"  →  "$\frac{\lambda}{4}$"
 *
 * It ONLY reformats: Gemini extracts the real LaTeX and wraps it in $...$,
 * preserving every number, value, variable and word. It never solves, answers,
 * or rewrites meaning. Rows are updated in place by id (question_text, options,
 * and question_hash), so there are no duplicates and no re-seed needed.
 *
 * Targets the DB chosen by .env / DB_DRIVER, exactly like seed_from_json.ts —
 * so run it through the VPS tunnel the same way.
 *
 * Usage:
 *   npx tsx scripts/fix-pyq-latex.ts --exam JEE_MAIN --dry
 *   npx tsx scripts/fix-pyq-latex.ts --exam JEE_MAIN
 *   npx tsx scripts/fix-pyq-latex.ts --topic "Ray Optics and Optical Instruments"
 *   npx tsx scripts/fix-pyq-latex.ts --exam JEE_MAIN --limit 20
 */

import { config } from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { GoogleGenAI } from '@google/genai';
import { createHash } from 'crypto';

config({ path: '.env', override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set in .env');

const driver = process.env.DB_DRIVER ?? 'neon-http';
const prisma = driver === 'standard'
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(databaseUrl, {}) });

const ai = new GoogleGenAI({
  vertexai: true,
  project: 'project-27ed127f-554a-419a-b39',
  location: 'global',
});

const MODEL = 'gemini-3.1-flash-lite';
// Concurrent Gemini calls per batch — override with --batch N (Vertex handles
// high concurrency fine; 25–30 is a good fast default for flash-lite).
const batchArgIdx = process.argv.indexOf('--batch');
const BATCH_SIZE = batchArgIdx !== -1 ? Math.max(1, parseInt(process.argv[batchArgIdx + 1], 10) || 10) : 10;
const BATCH_DELAY_MS = 250;

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function normalizeText(s: string): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}
function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// Heuristic: a row looks garbled when its text carries LaTeX commands (a
// backslash) yet has NO $...$ delimiters. Clean rows (already $-wrapped) and
// plain-text rows (no backslash) are skipped — so re-running is safe/idempotent.
function looksGarbled(s: string | null | undefined): boolean {
  if (!s) return false;
  return s.includes('\\') && !s.includes('$');
}

function optionStrings(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => (typeof o === 'string' ? o : String(o ?? '')));
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const PROMPT = `You are fixing FORMATTING corruption in a physics exam question scraped from the web. Each math formula was captured three times mashed together with no delimiters — the visual render, the raw LaTeX source, and screen-reader text — for example "λ4\\; \\frac{\\lambda}{4}4λ" really means \\frac{\\lambda}{4}.

Your ONLY job is to clean the formatting:
- Extract the real LaTeX (the \\frac{...}, subscripts, Greek letters, etc.) and wrap each inline formula in $...$.
- Delete the duplicated visual and screen-reader copies of every formula.
- Keep ALL plain text, numbers, values, variable names, units, dates and wording EXACTLY as they are.
- Do NOT solve, answer, simplify, translate, or rephrase anything. Do not add or drop information.
- Leave any text that contains no math unchanged.

Return ONLY JSON: {"question": "<cleaned question>", "options": ["<cleaned option>", ...]}.
Each option keeps its leading label (e.g. "A. ..."). If there are no options, return "options": [].`;

async function cleanOne(q: { question_text: string; options: string[] }): Promise<{ question: string; options: string[] } | null> {
  const input = `Question (garbled):\n${q.question_text}\n\nOptions (garbled):\n${JSON.stringify(q.options)}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ text: PROMPT + '\n\n' + input }],
        config: {
          thinkingConfig: { thinkingBudget: -1 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              question: { type: 'STRING' },
              options: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['question', 'options'],
          },
        },
      });
      const parsed = JSON.parse(res.text || '{}');
      if (typeof parsed.question === 'string' && parsed.question.trim()) {
        return { question: parsed.question.trim(), options: Array.isArray(parsed.options) ? parsed.options : [] };
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (/quota|rate limit|429/i.test(msg)) { await sleep(30000); attempt--; continue; }
      if (attempt === 4) console.error(`   model error: ${msg}`);
      else await sleep(1500 * attempt);
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };
  const isDry = args.includes('--dry');
  const exam = get('--exam');
  const topic = get('--topic');
  const limit = get('--limit') ? parseInt(get('--limit')!, 10) : undefined;

  const dbHost = (() => { try { return new URL(databaseUrl!).host; } catch { return '(unparseable)'; } })();
  console.log(`\n${colors.bright}${colors.cyan}🔧 Fixing PYQ LaTeX (DB_DRIVER=${driver})${colors.reset}`);
  console.log(`${colors.yellow}🎯 Target DB: ${dbHost}${colors.reset}`);
  console.log(`   filter: ${exam ? `exam_type=${exam} ` : ''}${topic ? `topic=${topic}` : ''}${isDry ? '  [DRY RUN]' : ''}\n`);

  const where: any = {};
  if (exam) where.exam_type = exam;
  if (topic) where.pattern = { is: { topic_name: topic } };

  const rows = await prisma.pYQ.findMany({
    where,
    select: { id: true, question_text: true, options: true },
    ...(limit ? { take: limit } : {}),
  });

  // Only touch rows that actually look garbled (question OR any option).
  const targets = rows.filter((r) => {
    const opts = optionStrings(r.options);
    return looksGarbled(r.question_text) || opts.some(looksGarbled);
  });

  console.log(`Scanned ${rows.length} PYQ(s) — ${targets.length} look garbled, ${rows.length - targets.length} already clean/plain.\n`);
  if (targets.length === 0) { console.log('Nothing to fix.'); return; }

  let fixed = 0, failed = 0, unchanged = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (r) => {
      const cleaned = await cleanOne({ question_text: r.question_text, options: optionStrings(r.options) });
      return { r, cleaned };
    }));

    for (const { r, cleaned } of results) {
      const tag = r.id.slice(-8);
      if (!cleaned) { failed++; console.log(`  ${colors.red}✗ ${tag} failed${colors.reset}`); continue; }
      if (cleaned.question === r.question_text && JSON.stringify(cleaned.options) === JSON.stringify(optionStrings(r.options))) {
        unchanged++; continue;
      }
      console.log(`  ${colors.green}✓ ${tag}${colors.reset}`);
      console.log(`    before: ${r.question_text.slice(0, 110)}`);
      console.log(`    after:  ${cleaned.question.slice(0, 110)}`);
      if (!isDry) {
        await prisma.pYQ.update({
          where: { id: r.id },
          data: {
            question_text: cleaned.question,
            options: cleaned.options,
            question_hash: sha256(normalizeText(cleaned.question)),
            // Invalidate the pre-rendered Option-B HTML for the fields we changed,
            // so MathHtml falls back to live rendering of the corrected LaTeX
            // instead of serving the stale garbled render. render_version=0 marks
            // the row stale so backfill-math-html re-renders it afterwards.
            question_html: null,
            options_html: Prisma.JsonNull,
            render_version: 0,
          },
          select: { id: true },
        }).then(() => { fixed++; }).catch((e: any) => { failed++; console.error(`    update error: ${e.message}`); });
      } else {
        fixed++;
      }
    }
    if (i + BATCH_SIZE < targets.length) await sleep(BATCH_DELAY_MS);
  }

  console.log(`\n${colors.bright}${colors.green}Done.${colors.reset} ${isDry ? 'Would fix' : 'Fixed'}: ${fixed}, unchanged: ${unchanged}, failed: ${failed}`);
  if (isDry) console.log(`${colors.yellow}(dry run — no DB writes)${colors.reset}`);
}

main()
  .catch((e) => { console.error('💥 FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
