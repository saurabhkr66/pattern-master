// scripts/coaching/backfill-coaching-rubrics.ts
//
// Precompute the per-question MARK SCHEME (rubric) for every subjective coaching
// question that has a model answer, so the grader applies it instead of deriving
// it on every call. Mirrors scripts/backfill-math-html.ts.
//
// Idempotent + resumable: only touches subjective rows WITH a non-empty solution
// whose rubric_version is below the current RUBRIC_VERSION, and bumps it after
// writing. Persistently-failing rows are skipped so the run always terminates.
// Stop/restart any time.
//
// Usage:
//   npx tsx --env-file=.env scripts/coaching/backfill-coaching-rubrics.ts            # all stale rows
//   npx tsx --env-file=.env scripts/coaching/backfill-coaching-rubrics.ts --dry-run  # generate one batch, don't write
//   BATCH=50 CONCURRENCY=4 npx tsx --env-file=.env scripts/coaching/backfill-coaching-rubrics.ts
//
// Run AFTER `prisma db push` adds the rubric / rubric_version columns. Each row is
// one Gemini call, so CONCURRENCY is GEMINI-bound (quota), not DB-bound — keep it
// modest. NOTE the .env trap: the CLI reads .env; point it at the DB you intend
// (dev Neon branch vs the VPS Postgres).

import { prisma } from "../../lib/prisma";
import { generateRubric, RUBRIC_VERSION } from "../../lib/coachingRubric";

const BATCH = parseInt(process.env.BATCH || "50", 10);
// Parallel Gemini calls. Each item is an API call, so this is rate-limited by
// Gemini, not Neon — keep it well under your per-minute quota.
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
async function withRetry(fn: () => Promise<void>, attempts = 4): Promise<void> {
  for (let a = 1; ; a++) {
    try {
      await fn();
      return;
    } catch (e) {
      if (a >= attempts) throw e;
      await sleep(500 * a);
    }
  }
}

// Subjective questions that still need a (re)generated rubric: have a real model
// answer and a stale/missing rubric. `failed` ids are excluded so a row that
// keeps erroring can't be refetched forever (the loop would never terminate).
function staleWhere(failed: string[]) {
  return {
    question_type: "subjective",
    rubric_version: { lt: RUBRIC_VERSION },
    AND: [{ solution: { not: null } }, { solution: { not: "" } }],
    ...(failed.length ? { id: { notIn: failed } } : {}),
  };
}

async function main() {
  console.log(
    `\n🛠  Coaching rubric backfill — RUBRIC_VERSION=${RUBRIC_VERSION}  BATCH=${BATCH}  CONCURRENCY=${CONCURRENCY}${DRY_RUN ? "  (DRY RUN)" : ""}`
  );

  const total = await prisma.coachingQuestion.count({ where: staleWhere([]) });
  console.log(`📦 ${total} subjective questions need a rubric`);
  if (total === 0) return;

  const failed: string[] = [];
  let done = 0;
  const startedAt = Date.now();

  for (;;) {
    const rows = await prisma.coachingQuestion.findMany({
      where: staleWhere(failed),
      take: BATCH,
      select: { id: true, question_text: true, solution: true, max_marks: true },
    });
    if (rows.length === 0) break;

    await runPool(rows, CONCURRENCY, async (row) => {
      try {
        const rubric = await generateRubric({
          question_text: row.question_text,
          solution: row.solution as string, // staleWhere guarantees non-empty
          max_marks: row.max_marks,
        });
        if (!DRY_RUN) {
          await withRetry(() =>
            prisma.coachingQuestion
              .update({
                where: { id: row.id },
                data: { rubric, rubric_version: RUBRIC_VERSION },
              })
              .then(() => undefined)
          );
        }
        done++;
        const rate = done / ((Date.now() - startedAt) / 1000);
        process.stdout.write(
          `\r  ${done}/${total}  (${rate.toFixed(1)}/s)${DRY_RUN ? "  [dry-run]" : ""}   `
        );
      } catch (e) {
        // Skip persistently-failing rows (excluded from future fetches) so the
        // run terminates; rerun later to retry them.
        failed.push(row.id);
        console.error(`\n  ✗ ${row.id}: ${e instanceof Error ? e.message : e}`);
      }
    });

    if (DRY_RUN) break; // one batch is enough to validate generation
  }

  console.log(`\n  ✓ done — ${done} rubric(s) written${failed.length ? `, ${failed.length} failed` : ""}`);
}

main()
  .catch((e) => {
    console.error("\n❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
