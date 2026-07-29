/**
 * seed_notes.ts — seeds Pattern.short_notes (the "Mastery Notes" tab).
 *
 * Notes live in prisma/notes/ as one file per topic:
 *
 *   prisma/notes/divide-and-conquer.md        -> short_notes
 *   prisma/notes/divide-and-conquer.hi.md     -> short_notes_hindi
 *   prisma/notes/asymptotic-analysis.json     -> short_notes (structured cards)
 *
 * The topic is taken from `topic:` in the YAML front-matter (markdown) or the
 * top-level "topic" key (JSON); otherwise the filename is de-slugified.
 *
 * Before writing, every $…$ / $$…$$ span is rendered with KaTeX at
 * throwOnError:true — the same check scripts/audit-math-errors.ts runs. A span
 * that throws here is exactly what shows up as a red error blob in the app, so
 * the seed refuses to store it unless you pass --force. This is the reason the
 * notes tab can be trusted to render cleanly: broken LaTeX never reaches the DB.
 *
 * Display math is also normalised at rest: remark-math only treats "$$" as
 * display math at the start of a line with a blank line before it. Inline "$$"
 * is silently passed through as literal text, which is how raw LaTeX leaks into
 * the page. normalizeDisplayMath() fixes that once, at seed time.
 *
 *   npx tsx prisma/seed_notes.ts                       # seed everything
 *   npx tsx prisma/seed_notes.ts --topic="Divide and Conquer"
 *   npx tsx prisma/seed_notes.ts --dry-run             # validate only, no writes
 *   npx tsx prisma/seed_notes.ts --force               # write despite KaTeX errors
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import katex from 'katex';
import * as fs from 'fs';
import * as path from 'path';
import { transformMathContent } from '../lib/math/transform';

config({ path: '.env', override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — expected the connection string in .env');
}

// Mirror lib/prisma.ts so the seed follows prod wherever it lives (VPS Postgres
// vs Neon HTTP). Note: the Neon HTTP adapter has no updateMany, so the write
// path below resolves ids first and updates them one by one.
const driver = process.env.DB_DRIVER ?? 'neon-http';
const prisma = driver === 'standard'
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(databaseUrl, {}) });

const NOTES_DIR = path.join(__dirname, 'notes');

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const ONLY_TOPIC = argv.find(a => a.startsWith('--topic='))?.slice('--topic='.length);

/* ── math validation ─────────────────────────────────────────────────────── */

interface MathError { span: string; message: string }

// Same span extraction the transform's final pass uses.
function extractSpans(transformed: string): string[] {
  const spans: string[] = [];
  const noDisplay = transformed.replace(/\$\$([\s\S]*?)\$\$/g, (_m, b: string) => { spans.push(b); return ' '; });
  noDisplay.replace(/\$([^$\n]+?)\$/g, (_m, b: string) => { spans.push(b); return ' '; });
  return spans;
}

function validateMath(content: string): MathError[] {
  const errors: MathError[] = [];
  let transformed: string;
  try {
    transformed = transformMathContent(content);
  } catch (e) {
    return [{ span: '(whole document)', message: `transform threw: ${(e as Error).message}` }];
  }
  for (const span of extractSpans(transformed)) {
    try {
      katex.renderToString(span, { throwOnError: true, strict: false });
    } catch (e) {
      errors.push({ span: span.slice(0, 160), message: (e as Error).message.replace(/^KaTeX parse error:\s*/, '') });
    }
  }
  return errors;
}

/** Pulls every renderable string out of a structured (JSON) note. */
function collectStrings(v: unknown, out: string[]): void {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach(x => collectStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => collectStrings(x, out));
}

/* ── content normalisation ───────────────────────────────────────────────── */

const FENCE_RE = /^\s*(?:```|~~~)/;

/**
 * Guarantees each "$$" starts its own line with a blank line before it, so
 * remark-math parses it as display math. Fenced code blocks are left untouched.
 * Mirrors components/masteryNotes/parseRawNoteData.ts — keep the two in step.
 */
function normalizeDisplayMath(raw: string): string {
  const out: string[] = [];
  let inFence = false;

  for (const line of raw.split('\n')) {
    if (FENCE_RE.test(line)) { inFence = !inFence; out.push(line); continue; }
    if (inFence || !line.includes('$$')) { out.push(line); continue; }

    for (const part of line.split(/(\$\$)/).filter(p => p !== '')) {
      if (part === '$$') {
        if (out.length && out[out.length - 1].trim() !== '') out.push('');
        out.push('$$');
      } else if (part.trim() !== '') {
        out.push(part.trim());
      }
    }
    out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/* ── file discovery ──────────────────────────────────────────────────────── */

interface NoteFile {
  topic: string;
  hindi: boolean;
  content: string;
  file: string;
}

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function unslugFileName(base: string): string {
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function readNoteFile(file: string): NoteFile | null {
  const full = path.join(NOTES_DIR, file);
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.md' && ext !== '.json') return null;

  let base = path.basename(file, ext);
  // Docs / drafts, not topics.
  if (base.startsWith('_') || base.toUpperCase() === 'README') return null;
  const hindi = base.endsWith('.hi');
  if (hindi) base = base.slice(0, -3);

  const raw = fs.readFileSync(full, 'utf8');

  if (ext === '.json') {
    const parsed = JSON.parse(raw) as { topic?: string };
    const topic = parsed.topic ?? unslugFileName(base);
    // Store the note verbatim minus the routing key, so the client parses the
    // same object shape it would get from a hand-written JSON note.
    const note: Record<string, unknown> = { ...parsed };
    delete note.topic;
    return { topic, hindi, content: JSON.stringify(note, null, 2), file };
  }

  const fm = raw.match(FRONT_MATTER_RE);
  const topic = fm?.[1].match(/^topic:\s*(.+)$/m)?.[1].trim().replace(/^['"]|['"]$/g, '')
    ?? unslugFileName(base);
  const body = fm ? raw.slice(fm[0].length) : raw;

  return { topic, hindi, content: normalizeDisplayMath(body), file };
}

/* ── main ────────────────────────────────────────────────────────────────── */

async function main() {
  if (!fs.existsSync(NOTES_DIR)) {
    throw new Error(
      `Notes directory not found: ${NOTES_DIR}\n` +
      `Create it and add one file per topic (e.g. prisma/notes/divide-and-conquer.md).`
    );
  }

  const notes = fs.readdirSync(NOTES_DIR)
    .map(readNoteFile)
    .filter((n): n is NoteFile => n !== null)
    .filter(n => !ONLY_TOPIC || n.topic.toLowerCase() === ONLY_TOPIC.toLowerCase());

  if (notes.length === 0) {
    console.log(`No note files matched${ONLY_TOPIC ? ` --topic="${ONLY_TOPIC}"` : ''} in ${NOTES_DIR}`);
    return;
  }

  console.log(`📝 Seeding ${notes.length} note file(s) from ${NOTES_DIR}\n`);

  let failed = 0;
  let written = 0;

  for (const note of notes) {
    // Validate every math span — for JSON notes, field by field.
    const strings: string[] = [];
    if (note.file.endsWith('.json')) collectStrings(JSON.parse(note.content), strings);
    else strings.push(note.content);

    const errors = strings.flatMap(validateMath);

    if (errors.length > 0) {
      failed++;
      console.error(`❌ ${note.file} — ${errors.length} KaTeX error(s) for "${note.topic}"`);
      for (const e of errors.slice(0, 5)) {
        console.error(`     ${e.message}`);
        console.error(`     in: ${e.span}`);
      }
      if (errors.length > 5) console.error(`     …and ${errors.length - 5} more`);
      if (!FORCE) {
        console.error(`   → skipped (pass --force to store anyway)\n`);
        continue;
      }
      console.error(`   → storing anyway (--force)\n`);
    }

    if (DRY_RUN) {
      console.log(`✓ ${note.file} → "${note.topic}"${note.hindi ? ' (hindi)' : ''} — valid, not written (--dry-run)`);
      continue;
    }

    const field = note.hindi ? 'short_notes_hindi' : 'short_notes';
    const targets = await prisma.pattern.findMany({
      where: { topic_name: note.topic },
      select: { id: true },
    });

    if (targets.length === 0) {
      console.warn(`⚠️  ${note.file} — no Pattern with topic_name "${note.topic}"; nothing updated`);
      continue;
    }

    // updateMany is unavailable on the Neon HTTP adapter — update by id instead.
    for (const t of targets) {
      await prisma.pattern.update({ where: { id: t.id }, data: { [field]: note.content } });
    }

    written += targets.length;
    console.log(`✅ ${note.file} → "${note.topic}" (${targets.length} pattern${targets.length === 1 ? '' : 's'}, ${field})`);
  }

  console.log(
    `\n✨ Done — ${written} pattern row(s) updated` +
    (failed ? `, ${failed} file(s) had KaTeX errors` : '') +
    (DRY_RUN ? ' (dry run)' : '')
  );

  if (failed && !FORCE) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('❌ Error seeding notes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
