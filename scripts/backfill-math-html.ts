// scripts/backfill-math-html.ts
//
// Option B backfill. Pre-renders the MathRenderer pipeline to HTML and stores it
// on PYQ + GeneratedQuestion rows, so the public SEO pages serve static HTML
// instead of running ~150 regexes + KaTeX per render at request time.
//
// Idempotent + resumable: only touches rows whose render_version is below the
// current RENDER_VERSION, and bumps it after writing. Stop/restart any time.
//
// Usage:
//   npx tsx --env-file=.env scripts/backfill-math-html.ts            # all stale rows
//   npx tsx --env-file=.env scripts/backfill-math-html.ts --dry-run  # render, don't write
//   BATCH=100 npx tsx --env-file=.env scripts/backfill-math-html.ts
//
// Run AFTER deploying the renderer code change and AFTER the migration that adds
// the *_html / render_version columns.

import { prisma } from "../lib/prisma";
import { renderMathHtml, renderMathHtmlArray, RENDER_VERSION } from "../lib/math/renderHtml";

const BATCH = parseInt(process.env.BATCH || "100", 10);
// Concurrent DB writes per batch. Neon HTTP is stateless but rate-limits high
// fan-out; keep this modest. Override with CONCURRENCY=N.
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "8", 10);
const DRY_RUN = process.argv.includes("--dry-run");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Run tasks with a bounded number in flight at once.
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

// Retry a write on transient Neon HTTP drops (matches the project's DB-retry policy).
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

// Render the six HTML fields for one question row. A null source field → null
// HTML (so the consumer's fallback never kicks in for genuinely-empty content).
function renderFields(row: {
  question_text: string | null;
  explanation: string | null;
  options: unknown;
  question_text_hindi: string | null;
  explanation_hindi: string | null;
  options_hindi: unknown;
}) {
  const optionsArr = Array.isArray(row.options) ? (row.options as (string | null)[]) : [];
  const optionsHiArr = Array.isArray(row.options_hindi) ? (row.options_hindi as (string | null)[]) : null;

  return {
    question_html: row.question_text ? renderMathHtml(row.question_text) : null,
    explanation_html: row.explanation ? renderMathHtml(row.explanation) : null,
    options_html: optionsArr.length ? renderMathHtmlArray(optionsArr) : undefined,
    question_html_hindi: row.question_text_hindi ? renderMathHtml(row.question_text_hindi) : null,
    explanation_html_hindi: row.explanation_hindi ? renderMathHtml(row.explanation_hindi) : null,
    options_html_hindi: optionsHiArr && optionsHiArr.length ? renderMathHtmlArray(optionsHiArr) : undefined,
    render_version: RENDER_VERSION,
  };
}

const SELECT = {
  id: true,
  question_text: true,
  explanation: true,
  options: true,
  question_text_hindi: true,
  explanation_hindi: true,
  options_hindi: true,
} as const;

type Model = "pyq" | "gq";

async function countStale(model: Model): Promise<number> {
  const where = { render_version: { lt: RENDER_VERSION } };
  return model === "pyq"
    ? prisma.pYQ.count({ where })
    : prisma.generatedQuestion.count({ where });
}

async function fetchBatch(model: Model) {
  const args = { where: { render_version: { lt: RENDER_VERSION } }, take: BATCH, select: SELECT };
  return model === "pyq"
    ? prisma.pYQ.findMany(args)
    : prisma.generatedQuestion.findMany(args);
}

async function writeRow(model: Model, id: string, data: ReturnType<typeof renderFields>) {
  // options_html keys are omitted (undefined) when there are no options, so we
  // don't overwrite with null. Prisma ignores undefined fields.
  if (model === "pyq") {
    await prisma.pYQ.update({ where: { id }, data });
  } else {
    await prisma.generatedQuestion.update({ where: { id }, data });
  }
}

async function backfillModel(model: Model) {
  const label = model === "pyq" ? "PYQ" : "GeneratedQuestion";
  const total = await countStale(model);
  console.log(`\n📦 ${label}: ${total} stale rows (render_version < ${RENDER_VERSION})`);
  if (total === 0) return;

  let done = 0;
  const startedAt = Date.now();

  // Each batch's rows get render_version bumped, so the next query excludes them.
  // Loop until no stale rows remain.
  for (;;) {
    const rows = await fetchBatch(model);
    if (rows.length === 0) break;

    // Render synchronously (CPU-bound), then fan out the DB writes concurrently
    // — Neon's HTTP transport is stateless so parallel updates are fine and turn
    // 100 sequential round-trips into a few.
    const updates = rows.map((row) => ({ id: row.id, data: renderFields(row as any) }));
    if (!DRY_RUN) {
      await runPool(updates, CONCURRENCY, (u) => withRetry(() => writeRow(model, u.id, u.data)));
    }

    done += rows.length;
    const rate = done / ((Date.now() - startedAt) / 1000);
    process.stdout.write(
      `\r  ${done}/${total}  (${rate.toFixed(0)} rows/s)${DRY_RUN ? "  [dry-run]" : ""}   `,
    );

    if (DRY_RUN) break; // one batch is enough to validate rendering in dry-run
  }
  console.log(`\n  ✓ ${label} done`);
}

async function main() {
  console.log(`\n🛠  Math HTML backfill — RENDER_VERSION=${RENDER_VERSION}  BATCH=${BATCH}${DRY_RUN ? "  (DRY RUN)" : ""}`);
  await backfillModel("pyq");
  await backfillModel("gq");
  console.log("\n✅ Backfill complete.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
