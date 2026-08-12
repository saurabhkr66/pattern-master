// scripts/backfill-pyq-difficulty.ts
//
// Classifies every PYQ's difficulty (EASY/MEDIUM/HARD) via Gemini, using question
// text + options + correct answer + subject/topic context + any attached images.
// Idempotent + resumable: only touches rows where difficulty is still null.
// Stop/restart any time.
//
// Usage:
//   npx tsx --env-file=.env scripts/backfill-pyq-difficulty.ts            # all unclassified rows
//   npx tsx --env-file=.env scripts/backfill-pyq-difficulty.ts --dry-run  # one page, log only
//   BATCH=200 GEMINI_BATCH_SIZE=15 CONCURRENCY=4 npx tsx --env-file=.env scripts/backfill-pyq-difficulty.ts
//
// Run AFTER `prisma db push` adds the PYQ.difficulty column.
//
// Two separate knobs — don't confuse them:
//   GEMINI_BATCH_SIZE - how many questions go into ONE Gemini call (default 15).
//                        Recommended 10-15 for image-heavy groups, up to 25-30 for
//                        text-only groups — tune this during --dry-run.
//   CONCURRENCY       - how many of those Gemini calls run in parallel (default 4).
// BATCH controls how many rows are pulled from the DB per page (default 200),
// which then get chunked into GEMINI_BATCH_SIZE-sized groups for classification.
//
// NOTE the .env trap: the CLI reads .env; point it at the DB you intend (dev Neon
// branch vs. VPS Postgres) before running. Run the real production backfill ON THE
// VPS, not through the local SSH tunnel (it collapses under bulk write volume).

import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { classifyDifficultyBatch, type DifficultyQuestion } from "../lib/pyqDifficulty";
import { getImageBase64 } from "../lib/aiImages";

const BATCH = parseInt(process.env.BATCH || "200", 10);
const GEMINI_BATCH_SIZE = parseInt(process.env.GEMINI_BATCH_SIZE || "15", 10);
// Cap on total images per Gemini call, regardless of GEMINI_BATCH_SIZE — a group
// heavy on diagrams gets split further so no single call is overloaded.
const MAX_IMAGES_PER_GROUP = 15;
// Parallel Gemini calls (one call = one group). Gemini-quota-bound, not DB-bound.
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "4", 10);
const DRY_RUN = process.argv.includes("--dry-run");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

// Retry the DB write on transient Neon HTTP drops (matches the project's policy).
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let a = 1; ; a++) {
    try {
      return await fn();
    } catch (e) {
      if (a >= attempts) throw e;
      await sleep(500 * a);
    }
  }
}

type Row = {
  id: string;
  question_text: string;
  options: unknown;
  correct_answer: string;
  question_type: string;
  images: unknown;
  year: number;
  pattern: { subject: string; topic_name: string; exam_type: string };
};

async function fetchImages(row: Row): Promise<Array<{ data: string; mimeType: string }>> {
  const rawImages = Array.isArray(row.images)
    ? (row.images as Array<{ filename?: string; type?: string }>)
    : [];
  const usable = rawImages.filter((i) => i && i.filename && i.type !== "explanation");
  const fetched = await Promise.all(usable.map((i) => getImageBase64(i.filename!)));
  return fetched.filter((x): x is { data: string; mimeType: string } => !!x);
}

// Chunk rows into Gemini call groups of at most GEMINI_BATCH_SIZE questions AND
// at most MAX_IMAGES_PER_GROUP total images — whichever limit hits first starts
// a new group.
function groupForCall(rows: Array<{ row: Row; images: Array<{ data: string; mimeType: string }> }>) {
  const groups: typeof rows[] = [];
  let current: typeof rows = [];
  let imageCount = 0;
  for (const r of rows) {
    const wouldExceed =
      current.length >= GEMINI_BATCH_SIZE || (current.length > 0 && imageCount + r.images.length > MAX_IMAGES_PER_GROUP);
    if (wouldExceed) {
      groups.push(current);
      current = [];
      imageCount = 0;
    }
    current.push(r);
    imageCount += r.images.length;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function staleWhere(failed: string[]) {
  return {
    difficulty: null,
    ...(failed.length ? { id: { notIn: failed } } : {}),
  };
}

async function main() {
  console.log(
    `\n🛠  PYQ difficulty backfill — BATCH=${BATCH} GEMINI_BATCH_SIZE=${GEMINI_BATCH_SIZE} CONCURRENCY=${CONCURRENCY}${DRY_RUN ? "  (DRY RUN)" : ""}`,
  );

  const total = await prisma.pYQ.count({ where: staleWhere([]) });
  console.log(`📦 ${total} PYQs need difficulty classification`);
  if (total === 0) return;

  const failed: string[] = [];
  let done = 0;
  const startedAt = Date.now();

  for (;;) {
    const rows = await prisma.pYQ.findMany({
      where: staleWhere(failed),
      take: BATCH,
      select: {
        id: true,
        question_text: true,
        options: true,
        correct_answer: true,
        question_type: true,
        images: true,
        year: true,
        pattern: { select: { subject: true, topic_name: true, exam_type: true } },
      },
    });
    if (rows.length === 0) break;

    const withImages = await Promise.all(
      rows.map(async (row) => ({ row: row as Row, images: await fetchImages(row as Row) })),
    );
    const groups = groupForCall(withImages);

    const results: { id: string; difficulty: string }[] = [];

    await runPool(groups, CONCURRENCY, async (group) => {
      const questions: DifficultyQuestion[] = group.map(({ row, images }) => ({
        id: row.id,
        question_text: row.question_text,
        options: row.options,
        correct_answer: row.correct_answer,
        question_type: row.question_type,
        subject: row.pattern.subject,
        topic_name: row.pattern.topic_name,
        exam_type: row.pattern.exam_type,
        year: row.year,
        images,
      }));

      try {
        const classified = await classifyDifficultyBatch(questions);
        for (const q of questions) {
          const difficulty = classified.get(q.id);
          if (difficulty) {
            results.push({ id: q.id, difficulty });
            done++;
          } else {
            failed.push(q.id);
            console.error(`\n  ✗ ${q.id}: no difficulty returned by classifier`);
          }
        }
        const rate = done / ((Date.now() - startedAt) / 1000);
        process.stdout.write(`\r  ${done}/${total}  (${rate.toFixed(1)}/s)${DRY_RUN ? "  [dry-run]" : ""}   `);
      } catch (e) {
        for (const q of questions) failed.push(q.id);
        console.error(`\n  ✗ group of ${questions.length} failed: ${e instanceof Error ? e.message : e}`);
      }
    });

    if (DRY_RUN) {
      console.log("\n\n  Dry-run results:");
      for (const r of results) console.log(`    ${r.id} -> ${r.difficulty}`);
      break; // one page is enough to validate classification
    }

    if (results.length > 0) {
      await withRetry(async () => {
        const values = Prisma.join(results.map((r) => Prisma.sql`(${r.id}::text, ${r.difficulty}::text)`));
        await prisma.$executeRaw`
          UPDATE "PYQ" AS t SET
            difficulty = v.difficulty
          FROM (VALUES ${values}) AS v(id, difficulty)
          WHERE t.id = v.id
        `;
      });
    }
  }

  console.log(`\n  ✓ done — ${done} classified${failed.length ? `, ${failed.length} failed` : ""}`);
}

main()
  .catch((e) => {
    console.error("\n❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
