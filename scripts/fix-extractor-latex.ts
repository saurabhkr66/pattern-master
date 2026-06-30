/**
 * fix-extractor-latex.ts
 *
 * DETERMINISTIC repair (no AI, no API, no cost) for the corruption the scraper's
 * extractor (exam-scraper `extractor/main.py` → `_fix_macro`) baked into the DB.
 *
 * Root cause: `_fix_macro` wrapped every backslash-command NOT in its allowlist
 * into `\text{cmd}`. The allowlist was missing the extensible-arrow / stacking
 * family, so real KaTeX commands were turned into literal words:
 *     \xrightarrow[reag]{cond}  →  \text{xrightarrow}[reag]{cond}   (renders "xrightarrow")
 *     \overset{a}{\to}          →  \text{overset}{a}{\to}
 * and the escape-decode pass stripped the first char of \t..\r..-commands:
 *     \rightarrow → "ightarrow",  \text{...} → "ext{...}",  \times → "imes"
 *
 * All of these are mechanically REVERSIBLE, so this script fixes them with exact
 * regex rules — no model guessing. Every candidate is re-rendered with KaTeX and
 * only written if it does NOT increase the render-error count (never makes a row
 * worse). Rows are updated in place by id; the cached HTML is invalidated.
 *
 * Anything this can't safely reverse (lost braces, ambiguous fragments) is left
 * untouched — run scripts/fix-broken-latex.ts (Gemini) for those.
 *
 * Targets the DB chosen by .env / DB_DRIVER — run through the VPS tunnel the same
 * way (DB_DRIVER=standard). No Vertex/Gemini auth needed.
 *
 * Usage:
 *   npx tsx scripts/fix-extractor-latex.ts --exam JEE_MAIN --dry
 *   npx tsx scripts/fix-extractor-latex.ts --exam JEE_MAIN
 *   npx tsx scripts/fix-extractor-latex.ts --exam JEE_MAIN --with-explanation
 *   npx tsx scripts/fix-extractor-latex.ts --topic "Ray Optics and Optical Instruments"
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { createHash } from 'crypto';
import katex from 'katex';

config({ path: '.env', override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set in .env');

const driver = process.env.DB_DRIVER ?? 'neon-http';
const prisma = driver === 'standard'
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(databaseUrl, {}) });

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function normalizeText(s: string): string { return (s ?? '').replace(/\s+/g, ' ').trim(); }
function sha256(s: string): string { return createHash('sha256').update(s).digest('hex'); }
function optionStrings(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => (typeof o === 'string' ? o : String(o ?? '')));
}

// ── The exact set of commands the extractor's OLD allowlist was missing, so
// these are precisely what got wrapped into \text{...}. All are structural and
// NEVER English words, so unwrapping / re-inserting a backslash is unambiguous.
// (Short, English-colliding command names like in/to/max/log are deliberately
// excluded — we never touch a legit \text{in} or the word "times".)
const REVERSIBLE_CMDS = [
  'xrightarrow', 'xleftarrow', 'xRightarrow', 'xLeftarrow',
  'xleftrightarrow', 'xLeftrightarrow', 'xhookrightarrow', 'xhookleftarrow',
  'xmapsto', 'xrightharpoonup', 'xrightharpoondown',
  'xleftharpoonup', 'xleftharpoondown', 'xrightleftharpoons', 'xleftrightharpoons',
  'xtwoheadrightarrow', 'xtwoheadleftarrow', 'xtofrom', 'xlongequal',
  'overset', 'underset', 'stackrel', 'overgroup', 'undergroup',
  'overparen', 'underparen', 'underrightarrow', 'underleftarrow',
  'longrightarrow', 'longleftarrow', 'longleftrightarrow',
  'Longrightarrow', 'Longleftarrow', 'Longleftrightarrow',
  'rightleftharpoons', 'leftrightharpoons',
  'rightharpoonup', 'rightharpoondown', 'leftharpoonup', 'leftharpoondown',
  'rightarrow', 'leftarrow', 'leftrightarrow',
  'Rightarrow', 'Leftarrow', 'Leftrightarrow',
  'longmapsto', 'hookrightarrow', 'hookleftarrow',
  'nabla', 'partial',
];
const REVERSIBLE_SET = new Set(REVERSIBLE_CMDS);

// Escape-decode reversal: the scraper read \t \r \n \f \b \v as control chars and
// dropped the first letter. Only the fragments that map back UNIQUELY and are
// never English are listed (e.g. "ightarrow" can only be \rightarrow).
const ESCAPE_FRAGMENTS: Record<string, string> = {
  ightarrow: 'rightarrow',
  ightleftharpoons: 'rightleftharpoons',
  ightharpoonup: 'rightharpoonup',
  ightharpoondown: 'rightharpoondown',
  imes: 'times',   // \times  (English "times" keeps its t, so it never matches)
  heta: 'theta',   // \theta
  abla: 'nabla',   // \nabla
};

const bareToken = (tok: string) => new RegExp(`(?<![A-Za-z\\\\])${tok}(?![A-Za-z])`, 'g');

// Apply every deterministic reversal. Pure string→string, no guessing.
function repair(text: string): string {
  let t = text;

  // 1) Reverse _fix_macro:  \text{<cmd>} → \<cmd>   (only for the reversible set).
  t = t.replace(/\\text\{([A-Za-z]+)\}/g, (m, cmd) => (REVERSIBLE_SET.has(cmd) ? '\\' + cmd : m));

  // 2) Escape-stripped \text whose braces survived:  ext{...} → \text{...}
  t = t.replace(/(?<![A-Za-z\\])ext\{/g, '\\text{');

  // 3) Escape-decode fragments:  ightarrow → \rightarrow, imes → \times, ...
  for (const [frag, cmd] of Object.entries(ESCAPE_FRAGMENTS)) {
    t = t.replace(bareToken(frag), '\\' + cmd);
  }

  // 4) A full reversible command sitting bare (backslash lost but letters intact):
  //    xrightarrow → \xrightarrow.  Guarded: not already "\cmd" and not mid-word.
  for (const cmd of REVERSIBLE_CMDS) {
    t = t.replace(bareToken(cmd), '\\' + cmd);
  }

  return t;
}

// ── KaTeX render-error counter (the not-worse safety net) ──
const MATH_PATTERNS = [
  /\\\[([\s\S]*?)\\\]/g, /\\\(([\s\S]*?)\\\)/g,
  /\$\$([^$]+?)\$\$/g, /\$([^$\n]+?)\$/g,
];
function renderErrors(text: string | null | undefined): number {
  if (!text) return 0;
  let errs = 0;
  for (const pat of MATH_PATTERNS) {
    pat.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(text)) !== null) {
      try { katex.renderToString(m[1].trim(), { throwOnError: true, strict: false }); }
      catch { errs++; }
    }
  }
  return errs;
}
function totalErrors(q: string, opts: string[], exp?: string | null): number {
  return renderErrors(q) + opts.reduce((a, o) => a + renderErrors(o), 0) + (exp ? renderErrors(exp) : 0);
}

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };
  const isDry = args.includes('--dry');
  const withExplanation = args.includes('--with-explanation');
  const exam = get('--exam');
  const topic = get('--topic');
  const limit = get('--limit') ? parseInt(get('--limit')!, 10) : undefined;

  const dbHost = (() => { try { return new URL(databaseUrl!).host; } catch { return '(unparseable)'; } })();
  console.log(`\n${colors.bright}${colors.cyan}🔧 Deterministic extractor-LaTeX repair (DB_DRIVER=${driver})${colors.reset}`);
  console.log(`${colors.yellow}🎯 Target DB: ${dbHost}${colors.reset}`);
  console.log(`   filter: ${exam ? `exam_type=${exam} ` : ''}${topic ? `topic=${topic} ` : ''}${withExplanation ? '+explanation ' : ''}${isDry ? ' [DRY RUN]' : ''}\n`);

  const where: any = {};
  if (exam) where.exam_type = exam;
  if (topic) where.pattern = { is: { topic_name: topic } };

  const rows = await prisma.pYQ.findMany({
    where,
    select: { id: true, question_text: true, options: true, explanation: withExplanation },
    ...(limit ? { take: limit } : {}),
  });

  let fixed = 0, unchanged = 0, skipped = 0, failed = 0;
  for (const r of rows) {
    const origOpts = optionStrings(r.options);
    const origExp = withExplanation ? ((r as any).explanation as string | null) : null;

    const newQ = repair(r.question_text);
    const newOpts = origOpts.map(repair);
    const newExp = origExp != null ? repair(origExp) : origExp;

    const changedQ = newQ !== r.question_text;
    const changedO = JSON.stringify(newOpts) !== JSON.stringify(origOpts);
    const changedE = withExplanation && newExp !== origExp;
    if (!changedQ && !changedO && !changedE) { unchanged++; continue; }

    // Never make a row render worse than it already did.
    const before = totalErrors(r.question_text, origOpts, origExp);
    const after = totalErrors(newQ, newOpts, withExplanation ? newExp : null);
    const tag = r.id.slice(-8);
    if (after > before) {
      skipped++;
      console.log(`  ${colors.red}⚠ ${tag} skipped — errors ${before}→${after}${colors.reset}`);
      continue;
    }

    console.log(`  ${colors.green}✓ ${tag}${colors.reset} ${colors.dim}(errors ${before}→${after})${colors.reset}`);
    if (changedQ) {
      console.log(`    Q before: ${r.question_text.slice(0, 120).replace(/\n/g, ' ')}`);
      console.log(`    Q after:  ${newQ.slice(0, 120).replace(/\n/g, ' ')}`);
    }

    if (isDry) { fixed++; continue; }

    const data: any = {
      question_text: newQ,
      options: newOpts,
      question_hash: sha256(normalizeText(newQ)),
      question_html: null,
      options_html: null,
      render_version: 0,
    };
    if (withExplanation && changedE) { data.explanation = newExp; data.explanation_html = null; }

    await prisma.pYQ.update({ where: { id: r.id }, data, select: { id: true } })
      .then(() => { fixed++; })
      .catch((e: any) => { failed++; console.error(`    update error: ${e.message}`); });
  }

  console.log(`\n${colors.bright}${colors.green}Done.${colors.reset} ${isDry ? 'Would fix' : 'Fixed'}: ${fixed}, unchanged: ${unchanged}, skipped(worse): ${skipped}, failed: ${failed}  (of ${rows.length} scanned)`);
  if (isDry) console.log(`${colors.yellow}(dry run — no DB writes)${colors.reset}`);
}

main()
  .catch((e) => { console.error('💥 FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
