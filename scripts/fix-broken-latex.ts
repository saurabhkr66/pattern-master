/**
 * fix-broken-latex.ts
 *
 * Repairs ANY broken LaTeX in already-seeded PYQs — the case where the math
 * does not render in KaTeX at all, e.g.
 *   "Consider the following reaction.\text{xrightarrow}\[;\text{underset}{...}]${..."
 *   (wrong commands like \text{xrightarrow}, mismatched \[ ] delimiters, a stray
 *    $, mangled \overset/\underset reagent-over-arrow stacks, unbalanced braces).
 *
 * This is the SIBLING of fix-pyq-latex.ts. That script only catches the
 * "triple-render mashed together, no $" corruption and SKIPS any row that
 * already contains a $. This one detects breakage the way the app actually
 * sees it — by trying to RENDER the math with KaTeX (throwOnError) and by
 * structural delimiter/brace checks — so it catches every render-broken row
 * regardless of whether a $ is present.
 *
 * It ONLY reformats: Gemini rewrites the math as valid KaTeX, preserving every
 * number, value, variable and word. It never solves, answers, or rephrases.
 * Before writing, it re-renders the cleaned result and REFUSES to write any row
 * whose KaTeX error count went UP — so it can never make a row worse. Rows are
 * updated in place by id (so no duplicates, no re-seed), and the pre-rendered
 * HTML is invalidated so the corrected LaTeX re-renders.
 *
 * Targets the DB chosen by .env / DB_DRIVER, exactly like fix-pyq-latex.ts —
 * run it through the VPS tunnel the same way (DB_DRIVER=standard).
 *
 * Usage:
 *   npx tsx scripts/fix-broken-latex.ts --exam JEE_MAIN --scan          # detect only, FREE (no Gemini, no writes)
 *   npx tsx scripts/fix-broken-latex.ts --exam JEE_MAIN --dry           # repair preview (Gemini, no writes)
 *   npx tsx scripts/fix-broken-latex.ts --exam JEE_MAIN --batch 25      # real run
 *   npx tsx scripts/fix-broken-latex.ts --exam JEE_MAIN --with-explanation
 *   npx tsx scripts/fix-broken-latex.ts --exam JEE_MAIN --all      # bypass detection, repair EVERY row (max coverage, higher cost)
 *   npx tsx scripts/fix-broken-latex.ts --topic "Ray Optics and Optical Instruments"
 *   npx tsx scripts/fix-broken-latex.ts --exam JEE_MAIN --model gemini-3.1-flash --limit 50
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { GoogleGenAI } from '@google/genai';
import { createHash } from 'crypto';
import katex from 'katex';

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

// Repairing broken LaTeX (reconstructing reagent arrows, balancing delimiters)
// is harder than stripping duplicate renders, so allow a model bump via --model.
const modelArgIdx = process.argv.indexOf('--model');
const MODEL = modelArgIdx !== -1 ? process.argv[modelArgIdx + 1] : 'gemini-3.1-flash-lite';
const batchArgIdx = process.argv.indexOf('--batch');
const BATCH_SIZE = batchArgIdx !== -1 ? Math.max(1, parseInt(process.argv[batchArgIdx + 1], 10) || 10) : 10;
const BATCH_DELAY_MS = 250;

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function normalizeText(s: string): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}
function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function optionStrings(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => (typeof o === 'string' ? o : String(o ?? '')));
}

// ---- Detection -----------------------------------------------------------
// Mirror the app's pre-render normalization (lib/renderMath.ts / detect_broken_math.ts)
// so "broken" here means the same thing the user sees broken on the site.
function normalizeForRender(text: string): string {
  return text
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');
}

const MATH_PATTERNS = [
  /\\\[([\s\S]*?)\\\]/g, // \[ ... \]
  /\\\(([\s\S]*?)\\\)/g, // \( ... \)
  /\$\$([^$]+?)\$\$/g,   // $$ ... $$
  /\$([^$\n]+?)\$/g,     // $ ... $
];

// Count KaTeX render failures inside well-formed delimiters.
function mathRenderErrors(text: string | null | undefined): number {
  if (!text) return 0;
  const t = normalizeForRender(text);
  let errs = 0;
  for (const pat of MATH_PATTERNS) {
    pat.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(t)) !== null) {
      try { katex.renderToString(m[1].trim(), { throwOnError: true, strict: false }); }
      catch { errs++; }
    }
  }
  return errs;
}

// Catch breakage the render check can't: delimiters that never close and LaTeX
// that leaked into plain text — both render as raw source in the app.
function structurallyBroken(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = normalizeForRender(text);

  // Mismatched display / inline delimiters (a "\[" with no "\]", etc.).
  if ((t.match(/\\\[/g) || []).length !== (t.match(/\\\]/g) || []).length) return true;
  if ((t.match(/\\\(/g) || []).length !== (t.match(/\\\)/g) || []).length) return true;

  // Remove every well-formed math span, then inspect the leftovers.
  let stripped = t;
  for (const pat of MATH_PATTERNS) stripped = stripped.replace(pat, ' ');

  // Any "$" still present after stripping balanced $..$ / $$..$$ spans is a
  // stray or unclosed delimiter (covers odd "$" AND an unclosed "$$ x ...",
  // which has an even "$" count yet never closes).
  if (stripped.includes('$')) return true;
  // A LaTeX command or open-delimiter that leaked into plain text (e.g.
  // "\text{xrightarrow}", a bare "\frac", a "\[" with no "\]") renders raw.
  if (/\\[a-zA-Z]/.test(stripped) || /\\[[({]/.test(stripped)) return true;

  // Brace imbalance in a LaTeX-bearing string.
  if (t.includes('\\') && (t.match(/(?<!\\){/g) || []).length !== (t.match(/(?<!\\)}/g) || []).length) {
    return true;
  }
  return false;
}

// LaTeX commands whose backslash the scraper stripped render as a conspicuous
// bare WORD (e.g. "xrightarrow" instead of "→", "underset", "mathrm") — that is
// valid text/math, so KaTeX throws NO error and the render check above cannot
// see it. These tokens are essentially never real English words, so whole-word
// matches are high-precision. A correct "\xrightarrow" is preceded by "\" and
// excluded by the lookbehind, so valid LaTeX is never flagged; a "\text{xrightarrow}"
// (backslash on \text, but the inner word is still wrong) IS flagged.
const BARE_LATEX_TOKENS = [
  'xrightarrow', 'xleftarrow', 'xrightleftharpoons',
  'longrightarrow', 'longleftarrow', 'longleftrightarrow',
  'rightarrow', 'leftarrow', 'leftrightarrow', 'rightleftharpoons',
  'Rightarrow', 'Leftarrow', 'Leftrightarrow',
  'overset', 'underset', 'overbrace', 'underbrace',
  'mathrm', 'mathbf', 'mathit', 'mathcal', 'mathbb', 'mathsf',
  // Escape-decode corruption: a command starting with \t \r \n \f \b \v lost its
  // first char (\rightarrow→"ightarrow", \times→"imes", \theta→"heta",
  // \nabla→"abla"). Only the fragments that are never English words are listed
  // here; short collisions (rac, eta, ho, an) are left to --all.
  'ightarrow', 'ightleftharpoons', 'ightharpoonup', 'ightharpoondown',
  'imes', 'heta', 'abla',
];
// (?<![\\A-Za-z]) → not already a real "\command" and not mid-word.
const BARE_LATEX_RE = new RegExp(`(?<![\\\\A-Za-z])(?:${BARE_LATEX_TOKENS.join('|')})(?![A-Za-z])`);

function hasBareLatexCommand(text: string | null | undefined): boolean {
  return !!text && BARE_LATEX_RE.test(normalizeForRender(text));
}

// A mangled "\text{...}" whose backslash+braces were eaten leaves the literal
// fragment "ext" glued to its content (e.g. "\text{atm}" → "extatm", "\text{C}"
// → "extC", "\text{06:00}" → "ext06"). This renders cleanly, so KaTeX throws no
// error. Match "ext" only when it's NOT inside a real word (next/text/extra/
// context all have a letter before "ext") and is immediately followed by "{",
// an uppercase letter, or a digit — high precision, ~never hits English prose.
const MANGLED_TEXT_RE = /(?<![A-Za-z])ext(?:\{|[A-Z0-9])/;

function hasMangledText(text: string | null | undefined): boolean {
  return !!text && MANGLED_TEXT_RE.test(normalizeForRender(text));
}

function isBroken(text: string | null | undefined): boolean {
  return mathRenderErrors(text) > 0
    || structurallyBroken(text)
    || hasBareLatexCommand(text)
    || hasMangledText(text);
}

function totalRenderErrors(question: string, options: string[], explanation?: string | null): number {
  return mathRenderErrors(question)
    + options.reduce((a, o) => a + mathRenderErrors(o), 0)
    + (explanation ? mathRenderErrors(explanation) : 0);
}

// ---- Repair --------------------------------------------------------------
const PROMPT = `You are repairing BROKEN LaTeX in a competitive-exam question that fails to render in KaTeX. The text contains malformed math such as: commands wrapped or misspelled (e.g. "\\text{xrightarrow}" should be "\\xrightarrow"); mismatched or missing delimiters (a "\\[" with no "\\]", a stray "$"); reagent-over-arrow notation (\\xrightarrow, \\overset, \\underset) that got mangled; duplicated visual/screen-reader renders; or unbalanced braces.

Your ONLY job is to make it RENDER:
- Rewrite every formula as valid LaTeX that renders in KaTeX, wrapping inline math in $...$ and display math in $$...$$.
- Fix wrong/misspelled commands, balance every delimiter and brace, and reconstruct reagent-over-arrow notation using \\xrightarrow[below]{above} (or \\overset{above}{\\rightarrow}).
- Delete any duplicated visual or screen-reader copies of a formula.
- Keep ALL plain text, numbers, values, variable names, units, dates and wording EXACTLY as they are.
- Do NOT solve, answer, simplify, translate, or rephrase anything. Do not add or drop information.
- Leave any text that contains no math unchanged.`;

type CleanInput = { question_text: string; options: string[]; explanation?: string };
type CleanOutput = { question: string; options: string[]; explanation?: string };

async function cleanOne(q: CleanInput, withExplanation: boolean): Promise<CleanOutput | null> {
  let input = `Question (broken):\n${q.question_text}\n\nOptions (broken):\n${JSON.stringify(q.options)}`;
  if (withExplanation && q.explanation) input += `\n\nExplanation (broken):\n${q.explanation}`;
  const tail = withExplanation
    ? `\n\nReturn ONLY JSON: {"question": "...", "options": ["..."], "explanation": "..."}. Each option keeps its leading label (e.g. "A. ..."). If there are no options, return "options": [].`
    : `\n\nReturn ONLY JSON: {"question": "...", "options": ["..."]}. Each option keeps its leading label (e.g. "A. ..."). If there are no options, return "options": [].`;

  const properties: any = {
    question: { type: 'STRING' },
    options: { type: 'ARRAY', items: { type: 'STRING' } },
  };
  if (withExplanation) properties.explanation = { type: 'STRING' };

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ text: PROMPT + tail + '\n\n' + input }],
        config: {
          thinkingConfig: { thinkingBudget: -1 },
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties, required: ['question', 'options'] },
        },
      });
      const parsed = JSON.parse(res.text || '{}');
      if (typeof parsed.question === 'string' && parsed.question.trim()) {
        return {
          question: parsed.question.trim(),
          options: Array.isArray(parsed.options) ? parsed.options : [],
          explanation: withExplanation && typeof parsed.explanation === 'string' ? parsed.explanation : undefined,
        };
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
  const isScan = args.includes('--scan');
  const isDry = args.includes('--dry');
  const isAll = args.includes('--all');
  const withExplanation = args.includes('--with-explanation');
  const exam = get('--exam');
  const topic = get('--topic');
  const limit = get('--limit') ? parseInt(get('--limit')!, 10) : undefined;

  const dbHost = (() => { try { return new URL(databaseUrl!).host; } catch { return '(unparseable)'; } })();
  console.log(`\n${colors.bright}${colors.cyan}🔧 Fixing BROKEN PYQ LaTeX (DB_DRIVER=${driver}, model=${MODEL})${colors.reset}`);
  console.log(`${colors.yellow}🎯 Target DB: ${dbHost}${colors.reset}`);
  const mode = isScan ? 'SCAN (detect only)' : isDry ? 'DRY RUN' : 'LIVE WRITE';
  console.log(`   filter: ${exam ? `exam_type=${exam} ` : ''}${topic ? `topic=${topic} ` : ''}${withExplanation ? '+explanation ' : ''} [${mode}]\n`);

  const where: any = {};
  if (exam) where.exam_type = exam;
  if (topic) where.pattern = { is: { topic_name: topic } };

  const rows = await prisma.pYQ.findMany({
    where,
    select: { id: true, question_text: true, options: true, explanation: withExplanation },
    ...(limit ? { take: limit } : {}),
  });

  // --all bypasses detection: send EVERY row to Gemini (guarantees coverage of
  // unknown corruption types — clean rows come back unchanged and aren't written).
  const targets = isAll ? rows : rows.filter((r) => {
    const opts = optionStrings(r.options);
    return isBroken(r.question_text)
      || opts.some(isBroken)
      || (withExplanation && isBroken((r as any).explanation));
  });

  console.log(isAll
    ? `Scanned ${rows.length} PYQ(s) — ${colors.bright}--all: processing every row${colors.reset} (detection bypassed).\n`
    : `Scanned ${rows.length} PYQ(s) — ${colors.bright}${targets.length} look broken${colors.reset}, ${rows.length - targets.length} OK.\n`);
  if (targets.length === 0) { console.log('Nothing to fix.'); return; }

  // --scan: free reconnaissance — list what's broken and why, no Gemini, no writes.
  if (isScan) {
    for (const r of targets.slice(0, 40)) {
      console.log(`  ${colors.yellow}• ${r.id.slice(-8)}${colors.reset} ${colors.dim}${r.question_text.slice(0, 120).replace(/\n/g, ' ')}${colors.reset}`);
    }
    if (targets.length > 40) console.log(`  ${colors.dim}…and ${targets.length - 40} more${colors.reset}`);
    console.log(`\n${colors.bright}${targets.length}${colors.reset} broken row(s). Re-run with --dry to preview Gemini repairs, or without --scan/--dry to write.`);
    return;
  }

  let fixed = 0, failed = 0, unchanged = 0, regressed = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (r) => {
      const cleaned = await cleanOne(
        { question_text: r.question_text, options: optionStrings(r.options), explanation: (r as any).explanation },
        withExplanation,
      );
      return { r, cleaned };
    }));

    for (const { r, cleaned } of results) {
      const tag = r.id.slice(-8);
      const origOptions = optionStrings(r.options);
      if (!cleaned) { failed++; console.log(`  ${colors.red}✗ ${tag} failed${colors.reset}`); continue; }

      const sameQ = cleaned.question === r.question_text;
      const sameO = JSON.stringify(cleaned.options) === JSON.stringify(origOptions);
      const sameE = !withExplanation || cleaned.explanation === undefined || cleaned.explanation === (r as any).explanation;
      if (sameQ && sameO && sameE) { unchanged++; continue; }

      // Safety net: never write a row whose KaTeX render got worse.
      const before = totalRenderErrors(r.question_text, origOptions, withExplanation ? (r as any).explanation : null);
      const after = totalRenderErrors(cleaned.question, cleaned.options, withExplanation ? cleaned.explanation : null);
      if (after > before) {
        regressed++;
        console.log(`  ${colors.red}⚠ ${tag} skipped — render errors ${before}→${after} (would worsen)${colors.reset}`);
        continue;
      }

      console.log(`  ${colors.green}✓ ${tag}${colors.reset} ${colors.dim}(errors ${before}→${after})${colors.reset}`);
      console.log(`    before: ${r.question_text.slice(0, 110).replace(/\n/g, ' ')}`);
      console.log(`    after:  ${cleaned.question.slice(0, 110).replace(/\n/g, ' ')}`);

      if (isDry) { fixed++; continue; }

      const data: any = {
        question_text: cleaned.question,
        options: cleaned.options,
        question_hash: sha256(normalizeText(cleaned.question)),
        // Invalidate pre-rendered Option-B HTML so MathHtml re-renders the
        // corrected LaTeX; render_version=0 marks the row for backfill-math-html.
        question_html: null,
        options_html: null,
        render_version: 0,
      };
      if (withExplanation && cleaned.explanation !== undefined && cleaned.explanation !== (r as any).explanation) {
        data.explanation = cleaned.explanation;
        data.explanation_html = null;
      }

      await prisma.pYQ.update({ where: { id: r.id }, data, select: { id: true } })
        .then(() => { fixed++; })
        .catch((e: any) => { failed++; console.error(`    update error: ${e.message}`); });
    }
    if (i + BATCH_SIZE < targets.length) await sleep(BATCH_DELAY_MS);
  }

  console.log(`\n${colors.bright}${colors.green}Done.${colors.reset} ${isDry ? 'Would fix' : 'Fixed'}: ${fixed}, unchanged: ${unchanged}, skipped(worse): ${regressed}, failed: ${failed}`);
  if (isDry) console.log(`${colors.yellow}(dry run — no DB writes)${colors.reset}`);
}

main()
  .catch((e) => { console.error('💥 FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
