import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  summarizeSolvingIdeas,
  discoverSubPatterns,
  assignSubPatterns,
  typeRange,
  NEW_TYPE,
  type ChapterContext,
  type DiscoveredType,
  type IdeaItem,
  type SolvingQuestion,
} from "@/lib/subPatterns";
import { isDailyQuotaExceeded, stripBase64Text } from "@/lib/geminiPacing";
import { getImageBase64 } from "@/lib/aiImages";
import { toSlug } from "@/lib/seo";

// Sorts ONE chapter's PYQs into question-types. Shared by the CLI
// (scripts/build-subpatterns.ts) and the admin "Sort with AI" button
// (app/actions/subPatterns.ts → startSortChapter). Steps:
//
//   1. Summarize  — fill PYQ.solving_idea where null (resumable; saved even on
//                   dry runs, since it's invisible and re-used by every rerun).
//   2. Discover   — all notes of the chapter → named types.
//   3. Assign     — every PYQ → one type (or NEW).
//   4. Clean up   — one pass: split any type holding >25% of the chapter (≥8 Qs),
//                   discover extra types for ≥3 NEW leftovers, and fold the rest
//                   (NEW + single-question types) into an "Other" pile.
//   5. Write      — SubPattern rows + PYQ.sub_pattern_id (all unreviewed).
//
// Admin work is never overwritten: a chapter with ANY reviewed sub-pattern is
// skipped; one with unreviewed piles is skipped unless `redo`, which deletes
// only the unreviewed piles and rebuilds.
//
// Multi-row writes use $executeRaw: the Neon HTTP adapter has no
// updateMany/$transaction.

const GEMINI_BATCH_SIZE = parseInt(process.env.GEMINI_BATCH_SIZE || "15", 10);
const ASSIGN_BATCH = parseInt(process.env.ASSIGN_BATCH || "25", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "4", 10);
export const MIN_PYQS = parseInt(process.env.MIN_PYQS || "8", 10);
// Cap on total images per summary call, regardless of GEMINI_BATCH_SIZE.
const MAX_IMAGES_PER_GROUP = 15;
// A pile bigger than this share of the chapter is too broad → split it.
const SPLIT_SHARE = 0.25;
const SPLIT_MIN = 8;
export const OTHER_NAME = "Other / mixed";

/** Thrown when the Gemini daily quota is gone — callers should stop, not retry. */
export class QuotaExhausted extends Error {
  constructor() {
    super("Daily Gemini quota exhausted — try again after it resets (~midnight Pacific).");
  }
}

export type BuildStep = "notes" | "discover" | "assign" | "cleanup" | "write";

export type BuildOptions = {
  dryRun?: boolean;
  redo?: boolean;
  log?: (line: string) => void;
  onStep?: (step: BuildStep) => void | Promise<void>;
};

export type BuildResult =
  | { status: "written" | "dry-run"; piles: Pile[]; total: number }
  | { status: "skipped"; reason: string };

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

// Gemini call wrapper: daily-quota exhaustion aborts the whole build cleanly.
async function ai<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isDailyQuotaExceeded(e)) throw new QuotaExhausted();
    throw e;
  }
}

const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

export function snippet(text: string, maxLen = 70): string {
  const clean = stripBase64Text(text).replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
}

// ─── Step 1: solving-idea notes ──────────────────────────────────────────────

type Row = {
  id: string;
  question_text: string;
  options: unknown;
  correct_answer: string;
  question_type: string;
  images: unknown;
};

async function fetchImages(row: Row): Promise<Array<{ data: string; mimeType: string }>> {
  const rawImages = Array.isArray(row.images)
    ? (row.images as Array<{ filename?: string; type?: string }>)
    : [];
  const usable = rawImages.filter((i) => i && i.filename && i.type !== "explanation");
  const fetched = await Promise.all(usable.map((i) => getImageBase64(i.filename!)));
  return fetched.filter((x): x is { data: string; mimeType: string } => !!x);
}

function groupForCall(qs: SolvingQuestion[]) {
  const groups: SolvingQuestion[][] = [];
  let current: SolvingQuestion[] = [];
  let imageCount = 0;
  for (const q of qs) {
    const wouldExceed =
      current.length >= GEMINI_BATCH_SIZE ||
      (current.length > 0 && imageCount + q.images.length > MAX_IMAGES_PER_GROUP);
    if (wouldExceed) {
      groups.push(current);
      current = [];
      imageCount = 0;
    }
    current.push(q);
    imageCount += q.images.length;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

async function summarizeMissing(patternId: string, ctx: ChapterContext, log: (l: string) => void) {
  const rows: Row[] = await prisma.pYQ.findMany({
    where: { pattern_id: patternId, solving_idea: null },
    select: { id: true, question_text: true, options: true, correct_answer: true, question_type: true, images: true },
  });
  if (rows.length === 0) return;
  log(`  ✎ writing solving notes for ${rows.length} PYQs…`);

  const questions: SolvingQuestion[] = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      question_text: r.question_text,
      options: r.options,
      correct_answer: r.correct_answer,
      question_type: r.question_type,
      images: await fetchImages(r),
    })),
  );

  let quota = false;
  let done = 0;
  await runPool(groupForCall(questions), CONCURRENCY, async (group) => {
    if (quota) return;
    try {
      const ideas = await ai(() => summarizeSolvingIdeas(ctx, group));
      const results = [...ideas.entries()];
      done += results.length;
      log(`    [${done}/${rows.length}] notes`);
      for (const q of group) if (!ideas.has(q.id)) log(`    ✗ ${q.id}: no note returned`);
      if (results.length === 0) return;
      // Written per group so a crash loses at most one group of calls — and so
      // the admin progress bar (which counts solving_idea) moves as it goes.
      await withRetry(async () => {
        const values = Prisma.join(results.map(([id, idea]) => Prisma.sql`(${id}::text, ${idea}::text)`));
        await prisma.$executeRaw`
          UPDATE "PYQ" AS t SET solving_idea = v.idea
          FROM (VALUES ${values}) AS v(id, idea)
          WHERE t.id = v.id
        `;
      });
    } catch (e) {
      if (e instanceof QuotaExhausted) {
        quota = true;
        return;
      }
      log(`    ✗ summary group of ${group.length} failed: ${e instanceof Error ? e.message : e}`);
    }
  });
  if (quota) throw new QuotaExhausted();
}

// ─── Steps 2–4: discover, assign, clean up ──────────────────────────────────

type Item = IdeaItem & { year: number; text: string };
export type Pile = { type: DiscoveredType; items: Item[] };

/** Assign items to `types`; returns piles (same order as types) + leftovers. */
async function assignAll(ctx: ChapterContext, types: DiscoveredType[], items: Item[], log: (l: string) => void) {
  const picked = new Map<string, number>();
  const run = async (batch: Item[]) => {
    try {
      const got = await ai(() => assignSubPatterns(ctx, types, batch));
      for (const [id, n] of got) picked.set(id, n);
    } catch (e) {
      if (e instanceof QuotaExhausted) throw e;
      log(`    ✗ assignment batch of ${batch.length} failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  // Promise.all (not runPool) so a QuotaExhausted from any batch propagates.
  const batches = chunk(items, ASSIGN_BATCH);
  for (const wave of chunk(batches, CONCURRENCY)) await Promise.all(wave.map(run));
  // One retry for ids the model skipped.
  const missing = items.filter((it) => !picked.has(it.id));
  if (missing.length) for (const b of chunk(missing, ASSIGN_BATCH)) await run(b);

  const piles: Pile[] = types.map((type) => ({ type, items: [] }));
  const leftovers: Item[] = [];
  for (const it of items) {
    const n = picked.get(it.id);
    if (n === undefined || n === NEW_TYPE) leftovers.push(it);
    else piles[n - 1].items.push(it);
  }
  return { piles, leftovers };
}

async function sortChapter(
  ctx: ChapterContext,
  items: Item[],
  log: (l: string) => void,
  step: (s: BuildStep) => Promise<void>,
): Promise<Pile[]> {
  const n = items.length;

  await step("discover");
  const types = await ai(() => discoverSubPatterns(ctx, items, typeRange(n)));
  log(`  ◆ discovered ${types.length} types`);
  await step("assign");
  let { piles, leftovers } = await assignAll(ctx, types, items, log);

  await step("cleanup");
  // 4a. Split piles that are too broad.
  const splitPiles: Pile[] = [];
  for (const pile of piles) {
    const tooBig = pile.items.length > n * SPLIT_SHARE && pile.items.length >= SPLIT_MIN;
    if (!tooBig) {
      splitPiles.push(pile);
      continue;
    }
    const range = { min: 2, max: Math.max(2, Math.min(6, Math.round(pile.items.length / 4))) };
    const sub = await ai(() => discoverSubPatterns(ctx, pile.items, range));
    if (sub.length < 2) {
      splitPiles.push(pile);
      continue;
    }
    log(`  ✂ splitting "${pile.type.name}" (${pile.items.length} Qs) into ${sub.length}`);
    const res = await assignAll(ctx, sub, pile.items, log);
    splitPiles.push(...res.piles);
    leftovers.push(...res.leftovers);
  }
  piles = splitPiles;

  // 4b. Find types for leftovers the list didn't cover.
  if (leftovers.length >= 3) {
    const existing = piles.map((p) => p.type.name);
    const extra = await ai(() =>
      discoverSubPatterns(ctx, leftovers, { min: 1, max: Math.max(1, Math.min(5, Math.round(leftovers.length / 3))) }, existing),
    );
    if (extra.length) {
      log(`  ＋ ${extra.length} extra type(s) for ${leftovers.length} leftover Qs`);
      const res = await assignAll(ctx, extra, leftovers, log);
      piles.push(...res.piles);
      leftovers = res.leftovers;
    }
  }

  // 4c. Fold singletons + remaining leftovers into "Other".
  const other: Item[] = [...leftovers];
  const kept: Pile[] = [];
  for (const p of piles) {
    if (p.items.length === 0) continue;
    if (p.items.length === 1) other.push(...p.items);
    else kept.push(p);
  }
  kept.sort((a, b) => b.items.length - a.items.length);
  if (other.length) {
    kept.push({
      type: { name: OTHER_NAME, method: "Rare one-off questions — re-home them or leave here.", trick: null },
      items: other,
    });
  }
  return kept;
}

// ─── Step 5: write ───────────────────────────────────────────────────────────

async function writePiles(patternId: string, piles: Pile[]) {
  const used = new Set<string>();
  const rows = piles.map((p, i) => {
    const base = toSlug(p.type.name) || `type-${i + 1}`;
    let slug = base;
    for (let k = 2; used.has(slug); k++) slug = `${base}-${k}`;
    used.add(slug);
    return { id: randomUUID(), slug, pile: p, order: i };
  });

  await withRetry(async () => {
    const values = Prisma.join(
      rows.map(
        (r) =>
          Prisma.sql`(${r.id}::text, ${patternId}::text, ${r.pile.type.name}::text, ${r.slug}::text, ${r.pile.type.method}::text, ${r.pile.type.trick}::text, ${r.order}::int)`,
      ),
    );
    await prisma.$executeRaw`
      INSERT INTO "SubPattern" (id, pattern_id, name, slug, method, trick, sort_order)
      VALUES ${values}
    `;
  });

  const links = rows.flatMap((r) => r.pile.items.map((it) => [it.id, r.id] as const));
  for (const part of chunk(links, 200)) {
    await withRetry(async () => {
      const values = Prisma.join(part.map(([q, s]) => Prisma.sql`(${q}::text, ${s}::text)`));
      await prisma.$executeRaw`
        UPDATE "PYQ" AS t SET sub_pattern_id = v.sid
        FROM (VALUES ${values}) AS v(id, sid)
        WHERE t.id = v.id AND t.pattern_id = ${patternId}
      `;
    });
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function buildChapter(patternId: string, opts: BuildOptions = {}): Promise<BuildResult> {
  const log = opts.log ?? (() => {});
  const step = async (s: BuildStep) => {
    await opts.onStep?.(s);
  };

  const p = await prisma.pattern.findUnique({
    where: { id: patternId },
    select: { id: true, exam_type: true, subject: true, topic_name: true },
  });
  if (!p) return { status: "skipped", reason: "Chapter not found" };

  const [reviewed, unreviewed] = await Promise.all([
    prisma.subPattern.count({ where: { pattern_id: p.id, reviewed: true } }),
    prisma.subPattern.count({ where: { pattern_id: p.id, reviewed: false } }),
  ]);
  if (reviewed > 0) return { status: "skipped", reason: "Chapter already has reviewed types — edit them instead" };
  if (unreviewed > 0 && !opts.redo) {
    return { status: "skipped", reason: `${unreviewed} unreviewed types already exist — review them, or redo` };
  }

  const ctx: ChapterContext = { exam_type: p.exam_type, subject: p.subject, topic_name: p.topic_name };
  await step("notes");
  await summarizeMissing(p.id, ctx, log);

  const rows = await prisma.pYQ.findMany({
    where: { pattern_id: p.id, solving_idea: { not: null } },
    select: { id: true, solving_idea: true, year: true, question_text: true },
    orderBy: { id: "asc" },
  });
  if (rows.length < MIN_PYQS) {
    return { status: "skipped", reason: `Only ${rows.length} PYQs with notes (need ${MIN_PYQS})` };
  }
  const items: Item[] = rows.map((r) => ({ id: r.id, idea: r.solving_idea!, year: r.year, text: r.question_text }));

  const piles = await sortChapter(ctx, items, log, step);
  if (opts.dryRun) return { status: "dry-run", piles, total: items.length };

  await step("write");
  if (unreviewed > 0) {
    // redo: drop only the unreviewed piles (reviewed chapters never get here).
    await withRetry(async () => {
      await prisma.$executeRaw`UPDATE "PYQ" SET sub_pattern_id = NULL WHERE pattern_id = ${p.id}`;
      await prisma.$executeRaw`DELETE FROM "SubPattern" WHERE pattern_id = ${p.id} AND reviewed = false`;
    });
  }
  await writePiles(p.id, piles);
  return { status: "written", piles, total: items.length };
}
