/**
 * fix-broken-latex-free.ts
 *
 * Same job as fix-broken-latex.ts — repairs ANY broken LaTeX in already-seeded
 * PYQs that fails to render in KaTeX (e.g. "\text{xrightarrow}" that should be
 * "\xrightarrow", mismatched \[ ] delimiters, a stray $, mangled
 * \overset/\underset reagent-over-arrow stacks, unbalanced braces) — but built
 * for the FREE Gemini API (AI Studio key, not Vertex).
 *
 * Two differences from the Vertex sibling:
 *   1. Auth  — uses a plain API key from GEMINI_API_KEY (get one free at
 *              https://aistudio.google.com/apikey). No GCP project / vertexai.
 *   2. Batching — the free tier is rate-limited by REQUESTS-per-minute, not
 *      tokens, so we pack GROUP_SIZE (default 5) questions into ONE prompt and
 *      one API call, and pace calls to stay under the free RPM. That's ~5×
 *      fewer requests than the one-question-per-call Vertex version.
 *
 * Everything else is identical: it ONLY reformats (Gemini rewrites the math as
 * valid KaTeX, preserving every number, value, variable and word — never solves,
 * answers, or rephrases), and before writing it re-renders the cleaned result
 * and REFUSES to write any row whose KaTeX error count went UP, so it can never
 * make a row worse. Rows are updated in place by id; pre-rendered HTML is
 * invalidated (render_version=0) so the corrected LaTeX re-renders.
 *
 * Targets the DB chosen by .env / DB_DRIVER — run it through the VPS tunnel the
 * same way (DB_DRIVER=standard).
 *
 * Usage:
 *   npx tsx scripts/fix-broken-latex-free.ts --exam JEE_MAIN --scan          # detect only, FREE (no Gemini, no writes)
 *   npx tsx scripts/fix-broken-latex-free.ts --exam JEE_MAIN --dry           # repair preview (Gemini, no writes)
 *   npx tsx scripts/fix-broken-latex-free.ts --exam JEE_MAIN                 # real run
 *   npx tsx scripts/fix-broken-latex-free.ts --exam JEE_MAIN --with-explanation
 *   npx tsx scripts/fix-broken-latex-free.ts --exam JEE_MAIN --all           # bypass detection, repair EVERY row
 *   npx tsx scripts/fix-broken-latex-free.ts --exam JEE_MAIN --subject Chemistry --scan   # target one subject
 *   npx tsx scripts/fix-broken-latex-free.ts --topic "Ray Optics and Optical Instruments"
 *   npx tsx scripts/fix-broken-latex-free.ts --exam JEE_MAIN --group 5 --rpm 15 --limit 50 --model gemini-3.1-flash-lite
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

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env (get a free key at https://aistudio.google.com/apikey)');

const driver = process.env.DB_DRIVER ?? 'neon-http';
const prisma = driver === 'standard'
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(databaseUrl, {}) });

// Free AI Studio key — NOT vertexai.
const ai = new GoogleGenAI({ apiKey });

const arg = (flag: string, fallback?: string) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

// flash-lite has the highest free-tier RPM and handles the LaTeX-repair task
// well. Override with --model.
const MODEL = arg('--model', 'gemini-3.1-flash-lite')!;
// How many questions to pack into ONE prompt / one API call.
const GROUP_SIZE = Math.max(1, parseInt(arg('--group', '5')!, 10) || 5);
// Free-tier requests-per-minute cap. We wait (60 / rpm) seconds between calls.
const RPM = Math.max(1, parseInt(arg('--rpm', '15')!, 10) || 15);
const CALL_DELAY_MS = Math.ceil(60000 / RPM);

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
// Mirror the app's pre-render normalization so "broken" here means the same
// thing the user sees broken on the site.
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

  if ((t.match(/\\\[/g) || []).length !== (t.match(/\\\]/g) || []).length) return true;
  if ((t.match(/\\\(/g) || []).length !== (t.match(/\\\)/g) || []).length) return true;

  let stripped = t;
  for (const pat of MATH_PATTERNS) stripped = stripped.replace(pat, ' ');

  if (stripped.includes('$')) return true;
  if (/\\[a-zA-Z]/.test(stripped) || /\\[[({]/.test(stripped)) return true;

  if (t.includes('\\') && (t.match(/(?<!\\){/g) || []).length !== (t.match(/(?<!\\)}/g) || []).length) {
    return true;
  }
  return false;
}

// LaTeX commands whose backslash the scraper stripped render as a conspicuous
// bare WORD (e.g. "xrightarrow" instead of "→"). KaTeX throws NO error on those,
// so whole-word matches on tokens that are ~never English catch them.
const BARE_LATEX_TOKENS = [
  'xrightarrow', 'xleftarrow', 'xrightleftharpoons',
  'longrightarrow', 'longleftarrow', 'longleftrightarrow',
  'rightarrow', 'leftarrow', 'leftrightarrow', 'rightleftharpoons',
  'Rightarrow', 'Leftarrow', 'Leftrightarrow',
  'overset', 'underset', 'overbrace', 'underbrace',
  'mathrm', 'mathbf', 'mathit', 'mathcal', 'mathbb', 'mathsf',
  // Escape-decode corruption: a command starting with \t \r \n \f \b \v lost
  // its first char (\rightarrow→"ightarrow", \times→"imes", \theta→"heta",
  // \nabla→"abla"). Only the never-English fragments are listed.
  'ightarrow', 'ightleftharpoons', 'ightharpoonup', 'ightharpoondown',
  'imes', 'heta', 'abla',
];
const BARE_LATEX_RE = new RegExp(`(?<![\\\\A-Za-z])(?:${BARE_LATEX_TOKENS.join('|')})(?![A-Za-z])`);

function hasBareLatexCommand(text: string | null | undefined): boolean {
  return !!text && BARE_LATEX_RE.test(normalizeForRender(text));
}

// A mangled "\text{...}" whose backslash+braces were eaten leaves "ext" glued
// to its content (e.g. "\text{atm}" → "extatm"). Renders cleanly, so no KaTeX
// error — match "ext" only when not inside a real word and followed by {, an
// uppercase letter, or a digit.
const MANGLED_TEXT_RE = /(?<![A-Za-z])ext(?:\{|[A-Z0-9])/;

function hasMangledText(text: string | null | undefined): boolean {
  return !!text && MANGLED_TEXT_RE.test(normalizeForRender(text));
}

// Every command KaTeX knows — ported from the extractor's _KATEX_KNOWN
// (extractor/main.py). Any "\command" NOT in this set is a wrong/misspelled/
// mangled command: KaTeX either errors on it or renders it as the literal word
// (e.g. "\xrightarow"), which the narrow BARE_LATEX_TOKENS list above can't see.
// This is the same generic check analyze_latex.py does — the biggest recall win.
const KATEX_KNOWN = new Set([
  'frac', 'sqrt', 'sum', 'int', 'oint', 'prod', 'coprod',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
  'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa', 'lambda',
  'mu', 'nu', 'xi', 'pi', 'varpi', 'rho', 'varrho', 'sigma',
  'varsigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma',
  'Upsilon', 'Phi', 'Psi', 'Omega',
  'infty', 'cdot', 'times', 'div', 'pm', 'mp',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'simeq', 'cong',
  'propto', 'll', 'gg', 'ne',
  'subset', 'supset', 'subseteq', 'supseteq',
  'cup', 'cap', 'in', 'notin', 'ni',
  'forall', 'exists', 'nexists',
  'partial', 'nabla', 'hbar', 'ell',
  'vec', 'hat', 'bar', 'dot', 'ddot', 'tilde', 'acute', 'grave',
  'overline', 'underline', 'widehat', 'widetilde',
  'overrightarrow', 'overleftarrow', 'overleftrightarrow',
  'overbrace', 'underbrace',
  'left', 'right', 'big', 'bigg', 'Big', 'Bigg',
  'langle', 'rangle', 'lfloor', 'rfloor', 'lceil', 'rceil',
  'vert', 'Vert',
  'text', 'mathrm', 'mathbf', 'mathit', 'mathcal', 'mathbb', 'mathsf', 'mathtt',
  'boldsymbol', 'pmb',
  'cos', 'sin', 'tan', 'cot', 'sec', 'csc',
  'arccos', 'arcsin', 'arctan', 'arccot',
  'cosh', 'sinh', 'tanh', 'coth',
  'log', 'ln', 'exp', 'lim', 'limsup', 'liminf',
  'max', 'min', 'sup', 'inf', 'det', 'arg', 'deg',
  'gcd', 'lcm', 'Pr',
  'binom', 'dbinom', 'tbinom',
  'pmatrix', 'bmatrix', 'vmatrix', 'Vmatrix', 'matrix',
  'begin', 'end', 'array', 'cases',
  'quad', 'qquad', 'hspace', 'vspace', 'phantom', 'vphantom',
  'to', 'gets', 'rightarrow', 'leftarrow', 'leftrightarrow',
  'Rightarrow', 'Leftarrow', 'Leftrightarrow',
  'uparrow', 'downarrow', 'updownarrow',
  'nearrow', 'searrow', 'swarrow', 'nwarrow',
  'mapsto', 'longmapsto', 'hookrightarrow', 'hookleftarrow',
  'iff', 'implies',
  'oplus', 'ominus', 'otimes', 'oslash', 'odot',
  'circ', 'bullet', 'star', 'dagger', 'ddagger',
  'angle', 'measuredangle', 'perp', 'parallel',
  'therefore', 'because',
  'ldots', 'cdots', 'vdots', 'ddots', 'dots', 'dotsc', 'dotsb',
  'AA', 'angstrom',
  'Box', 'square', 'triangle', 'triangledown',
  'checkmark', 'wr',
  'color', 'colorbox', 'boxed', 'cancel', 'bcancel', 'xcancel', 'cancelto', 'sout',
  'xrightarrow', 'xleftarrow', 'xRightarrow', 'xLeftarrow',
  'xleftrightarrow', 'xLeftrightarrow', 'xhookrightarrow', 'xhookleftarrow',
  'xmapsto', 'xrightharpoonup', 'xrightharpoondown',
  'xleftharpoonup', 'xleftharpoondown', 'xrightleftharpoons', 'xleftrightharpoons',
  'xtwoheadrightarrow', 'xtwoheadleftarrow', 'xtofrom', 'xlongequal',
  'overset', 'underset', 'stackrel', 'overgroup', 'undergroup',
  'overparen', 'underparen', 'underrightarrow', 'underleftarrow',
  'underleftrightarrow', 'overlinesegment', 'underlinesegment', 'utilde',
  'longrightarrow', 'longleftarrow', 'longleftrightarrow',
  'Longrightarrow', 'Longleftarrow', 'Longleftrightarrow',
  'rightharpoonup', 'rightharpoondown', 'leftharpoonup', 'leftharpoondown',
  'rightleftharpoons', 'leftrightharpoons',
  'upharpoonleft', 'upharpoonright', 'downharpoonleft', 'downharpoonright',
  'bigcup', 'bigcap', 'bigsqcup', 'bigvee', 'bigwedge',
  'bigoplus', 'bigotimes', 'bigodot', 'biguplus',
  'iint', 'iiint', 'iiiint', 'idotsint',
  'dfrac', 'tfrac', 'cfrac', 'genfrac', 'over', 'atop', 'choose', 'brace', 'brack',
  'check', 'breve', 'mathring', 'dddot', 'ddddot', 'not',
  'operatorname', 'operatornamewithlimits', 'mod', 'bmod', 'pmod', 'pod',
  'sgn', 'argmax', 'argmin', 'tr', 'Tr',
  'lt', 'gt', 'le', 'ge', 'coloneqq', 'eqqcolon', 'coloneq', 'eqcolon', 'colon',
  'doteq', 'prec', 'succ', 'preceq', 'succeq', 'lll', 'ggg',
  'lessgtr', 'gtrless', 'lesssim', 'gtrsim', 'asymp', 'models', 'vdash', 'dashv',
  'varnothing', 'emptyset', 'setminus', 'smallsetminus', 'complement',
  'sqsubset', 'sqsupset', 'sqsubseteq', 'sqsupseteq', 'sqcup', 'sqcap', 'uplus',
  'land', 'lor', 'lnot', 'neg', 'wedge', 'vee',
  'bigtriangleup', 'bigtriangledown', 'triangleleft', 'triangleright', 'bigcirc',
  'prime', 'degree', 'ang', 'clubsuit', 'diamondsuit', 'heartsuit', 'spadesuit',
  'flat', 'natural', 'sharp', 'surd', 'top', 'bot',
  'Re', 'Im', 'wp', 'aleph', 'imath', 'jmath', 'mho', 'eth',
  'diamond', 'lozenge', 'blacksquare', 'blacktriangle',
  'mathfrak', 'mathnormal', 'textbf', 'textit', 'textrm', 'textsf', 'texttt',
  'textnormal', 'textsc',
  'thinspace', 'medspace', 'thickspace', 'negthinspace', 'negmedspace',
  'negthickspace', 'kern', 'mkern', 'mskip', 'enspace', 'nobreakspace', 'space',
  'lvert', 'rvert', 'lVert', 'rVert', 'lbrace', 'rbrace', 'lbrack', 'rbrack',
  'lgroup', 'rgroup', 'lmoustache', 'rmoustache', 'backslash', 'middle',
  'mathstrut', 'strut', 'smash', 'hphantom', 'rule', 'raisebox', 'ov',
  // common KaTeX layout/style/table commands (kept so valid rows aren't flagged)
  'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
  'limits', 'nolimits', 'hline', 'hdashline', 'cr', 'substack',
  'mathchoice', 'nonumber', 'notag', 'sideset', 'stackbin', 'allowbreak',
]);

// Flag any "\command" (2+ letters) that KaTeX doesn't know — misspelled,
// wrong, or a bare word the extractor should have wrapped. Single-letter
// escapes (\, \; \! \% etc.) are skipped: they're spacing/escapes, not commands.
const COMMAND_RE = /\\([A-Za-z]{2,})/g;
function hasUnknownCommand(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = normalizeForRender(text);
  COMMAND_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = COMMAND_RE.exec(t)) !== null) {
    if (!KATEX_KNOWN.has(m[1])) return true;
  }
  return false;
}

// Unicode / dialect artifacts the scraper left in place of real LaTeX — these
// render as raw glyphs (no KaTeX error) but are wrong: bare "√" without a
// grouped radicand, diagonal vector arrows "↖ ↗", the "{a}/{b}" fraction dialect,
// a "\/" slash, or a non-standard \text "word" with a quote instead of a brace.
function hasUnicodeMathArtifact(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = normalizeForRender(text);
  if (t.includes('√')) return true;
  if (t.includes('↖') || t.includes('↗')) return true;
  if (/\{[^{}]+\}\/\{[^{}]+\}/.test(t)) return true;   // {a}/{b} fraction dialect
  if (t.includes('\\/')) return true;                  // \/ non-standard slash
  if (/\\text\s*"/.test(t)) return true;               // \text "word"
  return false;
}

function isBroken(text: string | null | undefined): boolean {
  return mathRenderErrors(text) > 0
    || structurallyBroken(text)
    || hasBareLatexCommand(text)
    || hasMangledText(text)
    || hasUnknownCommand(text)
    || hasUnicodeMathArtifact(text);
}

function totalRenderErrors(question: string, options: string[], explanation?: string | null): number {
  return mathRenderErrors(question)
    + options.reduce((a, o) => a + mathRenderErrors(o), 0)
    + (explanation ? mathRenderErrors(explanation) : 0);
}

// ---- Repair (BATCHED: many questions per prompt) -------------------------
const PROMPT = `You are repairing BROKEN LaTeX in competitive-exam questions that fail to render in KaTeX. The text contains malformed math such as: commands wrapped or misspelled (e.g. "\\text{xrightarrow}" should be "\\xrightarrow"); mismatched or missing delimiters (a "\\[" with no "\\]", a stray "$"); reagent-over-arrow notation (\\xrightarrow, \\overset, \\underset) that got mangled; duplicated visual/screen-reader renders; or unbalanced braces.

You are given a JSON array of items, each { "id": <number>, "question": "...", "options": ["..."]${'<EXPL_FIELD>'} }. Repair EACH item independently.

Your ONLY job is to make each item RENDER:
- Rewrite every formula as valid LaTeX that renders in KaTeX, wrapping inline math in $...$ and display math in $$...$$.
- Fix wrong/misspelled/unknown commands, balance every delimiter and brace, and reconstruct reagent-over-arrow notation using \\xrightarrow[below]{above} (or \\overset{above}{\\rightarrow}).
- Convert leftover unicode/dialect math to real LaTeX: a bare "√x" to "\\sqrt{x}", the "{a}/{b}" fraction dialect to "\\frac{a}{b}", diagonal vector arrows "{X}↖{→}" to "\\vec{X}", and a "\\/" slash to "/".
- Delete any duplicated visual or screen-reader copies of a formula.
- Keep ALL plain text, numbers, values, variable names, units, dates and wording EXACTLY as they are.
- Do NOT solve, answer, simplify, translate, or rephrase anything. Do not add or drop information.
- Leave any item that contains no math unchanged.
- Preserve each option's leading label (e.g. "A. ..."). If an item has no options, return "options": [].

Return ONLY a JSON array, one object per input item, each with the SAME "id" and the repaired fields.`;

type CleanInput = { id: number; question_text: string; options: string[]; explanation?: string };
type CleanOutput = { question: string; options: string[]; explanation?: string };

// Repair a GROUP of questions in a single API call. Returns a map id -> output.
async function cleanGroup(group: CleanInput[], withExplanation: boolean): Promise<Map<number, CleanOutput>> {
  const items = group.map((q) => {
    const item: any = { id: q.id, question: q.question_text, options: q.options };
    if (withExplanation && q.explanation) item.explanation = q.explanation;
    return item;
  });

  const itemProps: any = {
    id: { type: 'INTEGER' },
    question: { type: 'STRING' },
    options: { type: 'ARRAY', items: { type: 'STRING' } },
  };
  if (withExplanation) itemProps.explanation = { type: 'STRING' };

  const prompt = PROMPT.replace('<EXPL_FIELD>', withExplanation ? ', "explanation": "..."' : '');
  const out = new Map<number, CleanOutput>();

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ text: prompt + '\n\nInput:\n' + JSON.stringify(items) }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: { type: 'OBJECT', properties: itemProps, required: ['id', 'question', 'options'] },
          },
        },
      });
      const parsed = JSON.parse(res.text || '[]');
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (typeof p?.id === 'number' && typeof p?.question === 'string' && p.question.trim()) {
            out.set(p.id, {
              question: p.question.trim(),
              options: Array.isArray(p.options) ? p.options : [],
              explanation: withExplanation && typeof p.explanation === 'string' ? p.explanation : undefined,
            });
          }
        }
        return out;
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      // Free tier hits 429 often — back off hard and retry the whole group.
      if (/quota|rate limit|429|RESOURCE_EXHAUSTED/i.test(msg)) { await sleep(60000); attempt--; continue; }
      if (attempt === 4) console.error(`   model error: ${msg}`);
      else await sleep(2000 * attempt);
    }
  }
  return out;
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
  const subject = get('--subject');
  const limit = get('--limit') ? parseInt(get('--limit')!, 10) : undefined;

  const dbHost = (() => { try { return new URL(databaseUrl!).host; } catch { return '(unparseable)'; } })();
  console.log(`\n${colors.bright}${colors.cyan}🔧 Fixing BROKEN PYQ LaTeX — FREE Gemini (DB_DRIVER=${driver}, model=${MODEL})${colors.reset}`);
  console.log(`${colors.yellow}🎯 Target DB: ${dbHost}${colors.reset}`);
  console.log(`${colors.dim}   group=${GROUP_SIZE} q/call, rpm=${RPM} (~${(CALL_DELAY_MS / 1000).toFixed(1)}s between calls)${colors.reset}`);
  const mode = isScan ? 'SCAN (detect only)' : isDry ? 'DRY RUN' : 'LIVE WRITE';
  console.log(`   filter: ${exam ? `exam_type=${exam} ` : ''}${subject ? `subject=${subject} ` : ''}${topic ? `topic=${topic} ` : ''}${withExplanation ? '+explanation ' : ''} [${mode}]\n`);

  const where: any = {};
  if (exam) where.exam_type = exam;
  // subject / topic both live on the related Pattern — merge into one relation filter.
  const patternFilter: any = {};
  if (subject) patternFilter.subject = subject;
  if (topic) patternFilter.topic_name = topic;
  if (Object.keys(patternFilter).length) where.pattern = { is: patternFilter };

  const rows = await prisma.pYQ.findMany({
    where,
    select: { id: true, question_text: true, options: true, explanation: withExplanation },
    ...(limit ? { take: limit } : {}),
  });

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

  if (isScan) {
    for (const r of targets.slice(0, 40)) {
      console.log(`  ${colors.yellow}• ${r.id.slice(-8)}${colors.reset} ${colors.dim}${r.question_text.slice(0, 120).replace(/\n/g, ' ')}${colors.reset}`);
    }
    if (targets.length > 40) console.log(`  ${colors.dim}…and ${targets.length - 40} more${colors.reset}`);
    const calls = Math.ceil(targets.length / GROUP_SIZE);
    console.log(`\n${colors.bright}${targets.length}${colors.reset} broken row(s) → ${calls} API call(s) at ${GROUP_SIZE}/call. Re-run with --dry to preview, or without --scan/--dry to write.`);
    return;
  }

  // PYQ ids are strings (cuid); map to a small integer index per call so the
  // model round-trips a compact id, then map back to the real row.
  let fixed = 0, failed = 0, unchanged = 0, regressed = 0;
  const totalCalls = Math.ceil(targets.length / GROUP_SIZE);

  for (let g = 0; g < targets.length; g += GROUP_SIZE) {
    const rowsInGroup = targets.slice(g, g + GROUP_SIZE);
    const callNo = Math.floor(g / GROUP_SIZE) + 1;
    console.log(`${colors.cyan}▶ call ${callNo}/${totalCalls} — ${rowsInGroup.length} question(s)${colors.reset}`);

    const input: CleanInput[] = rowsInGroup.map((r, idx) => ({
      id: idx,
      question_text: r.question_text,
      options: optionStrings(r.options),
      explanation: (r as any).explanation,
    }));

    const result = await cleanGroup(input, withExplanation);

    // Long/complex chemistry schemes sometimes make flash-lite return FEWER
    // items than we sent (a dropped or truncated JSON element throws no error).
    // Retry the omitted ones one-by-one so they aren't silently lost.
    const missing = input.filter((it) => !result.has(it.id));
    if (missing.length) {
      console.log(`  ${colors.yellow}↻ ${missing.length} item(s) missing from batch — retrying individually${colors.reset}`);
      for (const it of missing) {
        await sleep(CALL_DELAY_MS);
        const solo = await cleanGroup([it], withExplanation);
        const got = solo.get(it.id);
        if (got) result.set(it.id, got);
      }
    }

    for (let idx = 0; idx < rowsInGroup.length; idx++) {
      const r = rowsInGroup[idx];
      const tag = r.id.slice(-8);
      const origOptions = optionStrings(r.options);
      const cleaned = result.get(idx);
      if (!cleaned) { failed++; console.log(`  ${colors.red}✗ ${tag} failed (no output)${colors.reset}`); continue; }

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

    // Pace to stay under the free-tier RPM (skip the wait after the last call).
    if (g + GROUP_SIZE < targets.length) await sleep(CALL_DELAY_MS);
  }

  console.log(`\n${colors.bright}${colors.green}Done.${colors.reset} ${isDry ? 'Would fix' : 'Fixed'}: ${fixed}, unchanged: ${unchanged}, skipped(worse): ${regressed}, failed: ${failed}`);
  if (isDry) console.log(`${colors.yellow}(dry run — no DB writes)${colors.reset}`);
}

main()
  .catch((e) => { console.error('💥 FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
