/**
 * seed_from_json.ts
 *
 * Seeds PYQs directly from scraper JSON files.
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Seed PRODUCTION. `.env` holds the prod connection; loading it with
// override:true means this script targets prod no matter how it's launched
// (`tsx`, `prisma db seed`, or a shell with a stray DATABASE_URL set).
config({ path: '.env', override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — expected the production connection string in .env');
}

// Respect DB_DRIVER exactly like lib/prisma.ts so this seed follows prod
// wherever it lives:
//   "standard"  -> plain TCP PrismaClient (the self-hosted VPS + localhost
//                  Postgres). Full feature set; updateMany/transactions work.
//   "neon-http" -> Neon HTTP adapter (serverless/Neon). No transactions, so
//                  the create path uses single create()s.
// Without this, the hardcoded Neon adapter would force every write to Neon even
// when .env says DB_DRIVER=standard — which silently lands seeds on the wrong DB.
const driver = process.env.DB_DRIVER ?? 'neon-http';
const prisma = driver === 'standard'
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(databaseUrl, {}) });

// A unique-constraint violation surfaces as Prisma's "P2002" on most paths, but
// the Neon HTTP adapter sometimes throws the RAW Postgres SQLSTATE "23505"
// instead — accept either so skipDuplicates is reliable. (See lib/dbHttp.ts.)
function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return code === 'P2002' || code === '23505';
}

function normalizeText(s: string): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function questionIdHash(question_text: string): string {
  return sha256(normalizeText(question_text));
}

function questionContentHash(q: {
  question_text: string;
  question_text_hindi?: string | null;
  options: unknown;
  options_hindi?: unknown;
  correct_answer: string;
  explanation: string;
  explanation_hindi?: string | null;
  year: number;
  question_type: string;
  images: unknown;
}): string {
  const canonical = JSON.stringify([
    normalizeText(q.question_text),
    normalizeText(q.question_text_hindi ?? ''),
    q.options ?? [],
    q.options_hindi ?? null,
    q.correct_answer ?? '',
    q.explanation ?? '',
    normalizeText(q.explanation_hindi ?? ''),
    q.year ?? 0,
    q.question_type ?? 'MCQ',
    q.images ?? [],
  ]);
  return sha256(canonical);
}

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

const SCRAPER_OUTPUT_DIR = '';

const FILE_TOPIC_MAP: Array<{
  file: string;
  topic_name: string;
  exam_type: string;
  branch: string;
  subject: string;
  // imagesOnly: match each scraped question to an EXISTING PYQ (by question hash/
  // text, scoped to this pattern) and update ONLY its `images` field. Never
  // creates rows and never touches any other column. Used to restore the GATE-EE
  // images whose files were truly missing from ImageKit (re-scraped fresh).
  imagesOnly?: boolean;
}> = [
    // ── JEE Main → Physics ───────────────────────────────────────────────────
    // Full seed (create + update), NOT imagesOnly. JEE Main is branchless, so
    // branch is "Common" (see lib/seo.ts branchWhereClause). Files come from the
    // sibling exam-scraper project's extractor output; the per-question
    // `topic_name`/`exam_type`/`year`/`marks` in the JSON match these entries.
   

    { file: '../exam-scraper/extractor/jee_circles_1.json',
      topic_name: 'Circles', exam_type: 'JEE_MAIN', branch: 'Common', subject: 'Mathematics' },
    { file: '../exam-scraper/extractor/jee_circles_2.json',
      topic_name: 'Circles', exam_type: 'JEE_MAIN', branch: 'Common', subject: 'Mathematics' },
    { file: '../exam-scraper/extractor/jee_ellipse_1.json',
      topic_name: 'Ellipse', exam_type: 'JEE_MAIN', branch: 'Common', subject: 'Mathematics' },
    { file: '../exam-scraper/extractor/jee_hyperbola_1.json',
      topic_name: 'Hyperbola', exam_type: 'JEE_MAIN', branch: 'Common', subject: 'Mathematics' },
    { file: '../exam-scraper/extractor/jee_logarithms_1.json',
      topic_name: 'Logarithms', exam_type: 'JEE_MAIN', branch: 'Common', subject: 'Mathematics' },
    { file: '../exam-scraper/extractor/jee_parabola_1.json',
      topic_name: 'Parabola', exam_type: 'JEE_MAIN', branch: 'Common', subject: 'Mathematics' },
    { file: '../exam-scraper/extractor/jee_parabola_2.json',
      topic_name: 'Parabola', exam_type: 'JEE_MAIN', branch: 'Common', subject: 'Mathematics' },
    { file: '../exam-scraper/extractor/jee_trigonometric_ratios_and_identities_1.json',
      topic_name: 'Trigonometric Ratios and Identities', exam_type: 'JEE_MAIN', branch: 'Common', subject: 'Mathematics' },
  ];

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}📂 Seeding PYQs from JSON files (DB_DRIVER=${driver})${colors.reset}`);
  const dbHost = (() => { try { return new URL(databaseUrl!).host; } catch { return '(unparseable)'; } })();
  console.log(`${colors.yellow}🎯 Target DB: ${dbHost}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  const totalFiles = FILE_TOPIC_MAP.length;
  let processedFiles = 0;
  let totalQuestions = 0;
  let errors = 0;

  for (const entry of FILE_TOPIC_MAP) {
    processedFiles++;
    const progress = `[${processedFiles}/${totalFiles}]`;
    const filePath = path.join(SCRAPER_OUTPUT_DIR, entry.file);

    if (!fs.existsSync(filePath)) {
      console.log(`${colors.yellow}⚠️  ${progress} File not found, skipping: ${entry.file}${colors.reset}`);
      continue;
    }

    const pyqs: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    let pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: entry.exam_type,
          branch: entry.branch,
          topic_name: entry.topic_name,
        },
      },
    });

    if (!pattern) {
      console.log(`${colors.yellow}⚠️  ${progress} Pattern not found, creating: ${entry.topic_name}${colors.reset}`);
      pattern = await prisma.pattern.create({
        data: {
          topic_name: entry.topic_name,
          subject: entry.subject,
          exam_type: entry.exam_type,
          branch: entry.branch,
          atomic_logic: `Practice problems for ${entry.topic_name} in ${entry.subject}.`,
        },
      });
    }

    try {
      // Tiny aggregate read to decide if backfill is needed for this pattern.
      const missingHashCount = await prisma.pYQ.count({
        where: { pattern_id: pattern.id, question_hash: null },
      });

      // On the first run after migration we need question_text once, to match
      // pre-existing rows and backfill their hashes. After that we only fetch
      // hashes — EXCEPT in imagesOnly mode, which always needs question_text for
      // its exact/normalized text fallback matching.
      const existing = (missingHashCount > 0 || entry.imagesOnly)
        ? await prisma.pYQ.findMany({
          where: { pattern_id: pattern.id },
          select: { id: true, question_text: true, question_hash: true, content_hash: true },
        })
        : await prisma.pYQ.findMany({
          where: { pattern_id: pattern.id },
          select: { id: true, question_hash: true, content_hash: true },
        });

      const byHash = new Map<string, { id: string; content_hash: string | null }>();
      const byText = new Map<string, { id: string; content_hash: string | null }>();
      for (const r of existing as any[]) {
        if (r.question_hash) byHash.set(r.question_hash, { id: r.id, content_hash: r.content_hash });
        if (r.question_text) byText.set(r.question_text, { id: r.id, content_hash: r.content_hash });
      }

      // Clean all questions upfront and compute hashes
      const cleaned = pyqs.map((pyq: any) => {
        const question_text = (pyq.question_text ?? '')
          .replace(/0 reply\s*Please log in or register to add a comment\./gi, '')
          .replace(/0 reply/gi, '')
          .replace(/🚩 Edit necessary \| 👮 Rhino \| 💬 "[^"]*"/gi, '')
          .trim();

        let correct_answer: string = pyq.correct_answer ?? '';
        if ((pyq.question_type === 'MCQ' || pyq.question_type === 'MSQ') && correct_answer.includes('.')) {
          correct_answer = correct_answer.split('.')[0].trim();
        }

        const images = (pyq.images ?? []).map((img: any) => ({
          ...img,
          url: img.filename ? `/${img.filename}` : img.url,
        }));

        const row = {
          question_text,
          question_text_hindi: pyq.question_text_hindi,
          options: pyq.options ?? [],
          options_hindi: pyq.options_hindi,
          correct_answer,
          explanation: pyq.explanation ?? '',
          explanation_hindi: pyq.explanation_hindi,
          year: pyq.year || Math.floor(Math.random() * 20) + 2005,
          exam_type: entry.exam_type,
          question_type: pyq.question_type,
          images,
        };

        return {
          ...row,
          question_hash: questionIdHash(question_text),
          content_hash: questionContentHash(row),
        };
      });

      // ── images-only mode ────────────────────────────────────────────────
      // Match each scraped question to an existing PYQ of this pattern and write
      // ONLY its images. No creates, no other columns. Matches by question_hash,
      // then exact text, then alphanumeric-normalized text (LaTeX/whitespace-safe).
      if (entry.imagesOnly) {
        const normAlnum = (s: string) =>
          (s ?? '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]/g, '');
        const byTextNorm = new Map<string, string>();
        const byTextExact = new Map<string, string>();
        for (const r of existing as any[]) {
          if (r.question_text) {
            byTextExact.set(r.question_text, r.id);
            byTextNorm.set(normAlnum(r.question_text), r.id);
          }
        }
        let updated = 0, notFound = 0, noImg = 0;
        const seen = new Set<string>();
        const toFix: Array<{ id: string; images: unknown }> = [];
        for (const q of cleaned) {
          if (!q.images || (q.images as any[]).length === 0) { noImg++; continue; }
          const id = byHash.get(q.question_hash)?.id
            ?? byTextExact.get(q.question_text)
            ?? byTextNorm.get(normAlnum(q.question_text));
          if (!id) { notFound++; continue; }
          if (seen.has(id)) continue;
          seen.add(id);
          toFix.push({ id, images: q.images });
        }
        const IMG_BATCH = 50;
        for (let i = 0; i < toFix.length; i += IMG_BATCH) {
          await Promise.all(toFix.slice(i, i + IMG_BATCH).map(t =>
            prisma.pYQ.update({ where: { id: t.id }, data: { images: t.images as any }, select: { id: true } })
              .then(() => { updated++; })
              .catch((err: any) => { errors++; console.error(`     ${err.message}`); })));
        }
        totalQuestions += updated;
        console.log(`${colors.green}✅ ${progress} ${colors.bright}${entry.topic_name}${colors.reset}${colors.green}: ${updated} images updated, ${colors.yellow}${notFound} not found, ${noImg} no-image${colors.reset}`);
        continue;
      }

      const toCreate: typeof cleaned = [];
      const toUpdate: Array<typeof cleaned[number] & { _existing_id: string }> = [];
      let skippedUnchanged = 0;

      for (const q of cleaned) {
        const existing = byHash.get(q.question_hash) ?? byText.get(q.question_text);
        if (!existing) {
          toCreate.push(q);
        } else if (existing.content_hash !== q.content_hash) {
          toUpdate.push({ ...q, _existing_id: existing.id });
        } else {
          skippedUnchanged++;
        }
      }

      // Create new records. The Neon HTTP adapter has no transactions, so we
      // can't use createMany — run the inserts concurrently as single create()s,
      // swallowing unique-constraint violations to mimic skipDuplicates.
      if (toCreate.length > 0) {
        await Promise.all(
          toCreate.map(q =>
            prisma.pYQ
              .create({ data: { ...q, pattern_id: pattern.id }, select: { id: true } })
              .catch((err: any) => {
                if (isUniqueViolation(err)) return; // duplicate — skip
                console.log(`${colors.red}  ❌ Error inserting question: ${q.question_text?.substring(0, 100)}...${colors.reset}`);
                console.error(`     Reason: ${err.message}`);
                errors++;
              })
          )
        );
      }

      // Updates: only changed rows. select:{id:true} prevents echoing the heavy row back.
      const BATCH_SIZE = 50;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(q => {
            const { _existing_id, ...data } = q;
            return prisma.pYQ.update({
              where: { id: _existing_id },
              data,
              select: { id: true },
            }).catch((err: any) => {
              console.log(`${colors.red}  ❌ Error updating question: ${q.question_text?.substring(0, 100)}...${colors.reset}`);
              console.error(`     Reason: ${err.message}`);
              errors++;
            });
          })
        );
      }

      const count = toCreate.length + toUpdate.length - errors;
      totalQuestions += count;
      console.log(`${colors.green}✅ ${progress} ${colors.bright}${entry.topic_name}${colors.reset}${colors.green}: ${toCreate.length} new, ${toUpdate.length} updated, ${colors.cyan}${skippedUnchanged} unchanged${colors.reset}`);
    } catch (err: any) {
      console.log(`${colors.red}❌ ${progress} Fatal error seeding topic ${entry.topic_name}${colors.reset}`);
      console.error(err.message);
      errors++;
    }
  }

  console.log(`\n${colors.bright}${colors.green}✨ Seeding Complete!${colors.reset}`);
  console.log(`${colors.cyan}Total Questions: ${colors.bright}${totalQuestions}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);
}

main()
  .catch((e) => {
    console.error('💥 FATAL ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
