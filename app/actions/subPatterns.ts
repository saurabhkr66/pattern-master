"use server";

// Admin review of AI-built question-types (sub-patterns) — /admin/sub-patterns.
// Piles are created by scripts/build-subpatterns.ts; here the admin renames,
// merges, re-homes questions and finally marks the chapter reviewed, which is
// what makes it visible on public topic pages.
//
// Multi-row writes use $executeRaw: the Neon HTTP adapter has no
// updateMany/$transaction.

import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { stripBase64Text } from "@/lib/geminiPacing";
import { toSlug } from "@/lib/seo";
import { buildChapter, MIN_PYQS, QuotaExhausted } from "@/lib/subPatternBuilder";
import { getSortJob, setSortJob, isJobActive, type SortJob } from "@/lib/subPatternJobs";
import { getDailyUsage, type DailyUsage } from "@/lib/geminiPacing";
import { estimateSortCalls } from "@/lib/subPatternEstimate";
import { latexifyTypes } from "@/lib/subPatterns";
import { isDailyQuotaExceeded } from "@/lib/geminiPacing";

// Every write can change a public topic page (breakdown box, chips, type page).
function invalidate() {
  revalidateTag("patterns", { expire: 0 });
}

export type SubPatternChapter = {
  id: string;
  exam_type: string;
  subject: string;
  topic_name: string;
  types: number;
  pyqs: number;
  unassigned: number;
  reviewed: boolean;
};

export async function listSubPatternChapters(): Promise<SubPatternChapter[]> {
  await requireAdmin();
  const rows = await prisma.$queryRaw<
    Array<{ id: string; exam_type: string; subject: string; topic_name: string; types: bigint; pyqs: bigint; unassigned: bigint; reviewed: boolean }>
  >`
    SELECT p.id, p.exam_type, p.subject, p.topic_name,
           (SELECT COUNT(*) FROM "SubPattern" s WHERE s.pattern_id = p.id) AS types,
           (SELECT COUNT(*) FROM "PYQ" q WHERE q.pattern_id = p.id) AS pyqs,
           (SELECT COUNT(*) FROM "PYQ" q WHERE q.pattern_id = p.id AND q.sub_pattern_id IS NULL) AS unassigned,
           (SELECT BOOL_AND(s.reviewed) FROM "SubPattern" s WHERE s.pattern_id = p.id) AS reviewed
    FROM "Pattern" p
    WHERE EXISTS (SELECT 1 FROM "SubPattern" s WHERE s.pattern_id = p.id)
    ORDER BY reviewed ASC, p.exam_type, p.subject, p.topic_name
  `;
  return rows.map((r) => ({
    ...r,
    types: Number(r.types),
    pyqs: Number(r.pyqs),
    unassigned: Number(r.unassigned),
    reviewed: !!r.reviewed,
  }));
}

export type PileQuestion = {
  id: string;
  year: number;
  text: string;
  idea: string | null;
  images: { index: number; filename: string; type?: string }[] | null;
};

export type Pile = {
  id: string;
  name: string;
  slug: string;
  method: string;
  trick: string | null;
  reviewed: boolean;
  questions: PileQuestion[];
};

export type ChapterPiles = {
  pattern: { id: string; exam_type: string; subject: string; topic_name: string };
  piles: Pile[];
  unassigned: PileQuestion[];
};

export async function getChapterPiles(patternId: string): Promise<ChapterPiles | null> {
  await requireAdmin();
  const [pattern, types, pyqs] = await Promise.all([
    prisma.pattern.findUnique({
      where: { id: patternId },
      select: { id: true, exam_type: true, subject: true, topic_name: true },
    }),
    prisma.subPattern.findMany({
      where: { pattern_id: patternId },
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true, slug: true, method: true, trick: true, reviewed: true },
    }),
    prisma.pYQ.findMany({
      where: { pattern_id: patternId },
      orderBy: [{ year: "desc" }, { id: "asc" }],
      select: { id: true, year: true, question_text: true, solving_idea: true, sub_pattern_id: true, images: true },
    }),
  ]);
  if (!pattern) return null;

  // Full text (minus inline base64): it's rendered through MathRenderer, and
  // cutting mid-LaTeX would break the render. The UI line-clamps it instead.
  const toQ = (q: (typeof pyqs)[number]): PileQuestion => ({
    id: q.id,
    year: q.year,
    text: stripBase64Text(q.question_text),
    idea: q.solving_idea,
    images: (q.images as PileQuestion["images"]) ?? null,
  });

  const byType = new Map<string, PileQuestion[]>(types.map((t) => [t.id, []]));
  const unassigned: PileQuestion[] = [];
  for (const q of pyqs) {
    const bucket = q.sub_pattern_id ? byType.get(q.sub_pattern_id) : undefined;
    (bucket ?? unassigned).push(toQ(q));
  }

  return {
    pattern,
    piles: types.map((t) => ({ ...t, questions: byType.get(t.id) ?? [] })),
    unassigned,
  };
}

async function uniqueSlug(patternId: string, name: string, exceptId?: string): Promise<string> {
  const base = toSlug(name) || "type";
  const taken = new Set(
    (
      await prisma.subPattern.findMany({
        where: { pattern_id: patternId, ...(exceptId ? { id: { not: exceptId } } : {}) },
        select: { slug: true },
      })
    ).map((s) => s.slug),
  );
  let slug = base;
  for (let k = 2; taken.has(slug); k++) slug = `${base}-${k}`;
  return slug;
}

export async function updateSubPattern(
  id: string,
  data: { name: string; method: string; trick: string | null },
): Promise<void> {
  await requireAdmin();
  const name = data.name.trim();
  const method = data.method.trim();
  if (!name || !method) throw new Error("Name and method are required");
  const current = await prisma.subPattern.findUnique({ where: { id }, select: { pattern_id: true, name: true, slug: true } });
  if (!current) throw new Error("Type not found");
  // Slug only changes with the name, so already-shared links survive trick/method edits.
  const slug = name === current.name ? current.slug : await uniqueSlug(current.pattern_id, name, id);
  await prisma.subPattern.update({
    where: { id },
    data: { name, slug, method, trick: data.trick?.trim() || null },
  });
  invalidate();
}

export async function createSubPattern(patternId: string, name: string, method: string): Promise<string> {
  await requireAdmin();
  if (!name.trim() || !method.trim()) throw new Error("Name and method are required");
  const [slug, last, reviewed] = await Promise.all([
    uniqueSlug(patternId, name.trim()),
    prisma.subPattern.findFirst({ where: { pattern_id: patternId }, orderBy: { sort_order: "desc" }, select: { sort_order: true } }),
    // A new type in an already-reviewed chapter is reviewed too (the admin made it).
    prisma.subPattern.count({ where: { pattern_id: patternId, reviewed: true } }),
  ]);
  const row = await prisma.subPattern.create({
    data: {
      pattern_id: patternId,
      name: name.trim(),
      slug,
      method: method.trim(),
      sort_order: (last?.sort_order ?? -1) + 1,
      reviewed: reviewed > 0,
    },
    select: { id: true },
  });
  invalidate();
  return row.id;
}

/** Moves every question of `fromId` into `intoId`, then deletes `fromId`. */
export async function mergeSubPatterns(fromId: string, intoId: string): Promise<void> {
  await requireAdmin();
  if (fromId === intoId) return;
  const [from, into] = await Promise.all([
    prisma.subPattern.findUnique({ where: { id: fromId }, select: { pattern_id: true } }),
    prisma.subPattern.findUnique({ where: { id: intoId }, select: { pattern_id: true } }),
  ]);
  if (!from || !into || from.pattern_id !== into.pattern_id) throw new Error("Types must belong to the same chapter");
  await prisma.$executeRaw`UPDATE "PYQ" SET sub_pattern_id = ${intoId} WHERE sub_pattern_id = ${fromId}`;
  await prisma.$executeRaw`DELETE FROM "SubPattern" WHERE id = ${fromId}`;
  invalidate();
}

/** `subPatternId` null = unassign. */
export async function moveQuestion(pyqId: string, subPatternId: string | null): Promise<void> {
  await requireAdmin();
  if (subPatternId) {
    const [q, t] = await Promise.all([
      prisma.pYQ.findUnique({ where: { id: pyqId }, select: { pattern_id: true } }),
      prisma.subPattern.findUnique({ where: { id: subPatternId }, select: { pattern_id: true } }),
    ]);
    if (!q || !t || q.pattern_id !== t.pattern_id) throw new Error("Question and type must belong to the same chapter");
  }
  await prisma.pYQ.update({ where: { id: pyqId }, data: { sub_pattern_id: subPatternId } });
  invalidate();
}

/** Deletes a type; its questions become unassigned. */
export async function deleteSubPattern(id: string): Promise<void> {
  await requireAdmin();
  await prisma.$executeRaw`UPDATE "PYQ" SET sub_pattern_id = NULL WHERE sub_pattern_id = ${id}`;
  await prisma.$executeRaw`DELETE FROM "SubPattern" WHERE id = ${id}`;
  invalidate();
}

/** Publishes (or un-publishes) every type in the chapter. */
export async function setChapterReviewed(patternId: string, reviewed: boolean): Promise<void> {
  await requireAdmin();
  await prisma.$executeRaw`UPDATE "SubPattern" SET reviewed = ${reviewed} WHERE pattern_id = ${patternId}`;
  invalidate();
}

// ─── "Sort with AI" from the admin page ──────────────────────────────────────
//
// Same pipeline as scripts/build-subpatterns.ts, one chapter per click. The
// run takes a minute or two (Gemini calls are paced to AI_RPM), so it goes in
// after(): the action returns at once and the page polls getSortProgress().

export async function listSortExams(): Promise<string[]> {
  await requireAdmin();
  const rows = await prisma.pattern.findMany({
    distinct: ["exam_type"],
    select: { exam_type: true },
    orderBy: { exam_type: "asc" },
  });
  return rows.map((r) => r.exam_type);
}

export type SortableChapter = {
  id: string;
  branch: string;
  subject: string;
  topic_name: string;
  pyqs: number;
  // PYQs that still need a solving note (the expensive, image-bearing step).
  pendingNotes: number;
  types: number;
  reviewed: boolean;
};

/** Chapters of one exam with enough PYQs to sort, biggest first within a subject. */
export async function listSortableChapters(examType: string): Promise<SortableChapter[]> {
  await requireAdmin();
  const rows = await prisma.$queryRaw<
    Array<{ id: string; branch: string; subject: string; topic_name: string; pyqs: bigint; pending_notes: bigint; types: bigint; reviewed: boolean | null }>
  >`
    SELECT p.id, p.branch, p.subject, p.topic_name,
           (SELECT COUNT(*) FROM "PYQ" q WHERE q.pattern_id = p.id) AS pyqs,
           (SELECT COUNT(*) FROM "PYQ" q WHERE q.pattern_id = p.id AND q.solving_idea IS NULL) AS pending_notes,
           (SELECT COUNT(*) FROM "SubPattern" s WHERE s.pattern_id = p.id) AS types,
           (SELECT BOOL_OR(s.reviewed) FROM "SubPattern" s WHERE s.pattern_id = p.id) AS reviewed
    FROM "Pattern" p
    WHERE p.exam_type = ${examType}
      AND (SELECT COUNT(*) FROM "PYQ" q WHERE q.pattern_id = p.id) >= ${MIN_PYQS}
    ORDER BY p.branch, p.subject, pyqs DESC
  `;
  return rows.map(({ pending_notes, ...r }) => ({
    ...r,
    pyqs: Number(r.pyqs),
    pendingNotes: Number(pending_notes),
    types: Number(r.types),
    reviewed: !!r.reviewed,
  }));
}

/** Free-tier Gemini usage today (requests counted by lib/geminiPacing). */
export async function getGeminiBudget(): Promise<DailyUsage> {
  await requireAdmin();
  return getDailyUsage();
}

export async function startSortChapter(patternId: string, redo: boolean): Promise<void> {
  await requireAdmin();
  if (isJobActive(await getSortJob(patternId))) throw new Error("Already sorting this chapter");

  const [reviewed, unreviewed] = await Promise.all([
    prisma.subPattern.count({ where: { pattern_id: patternId, reviewed: true } }),
    prisma.subPattern.count({ where: { pattern_id: patternId, reviewed: false } }),
  ]);
  if (reviewed > 0) throw new Error("This chapter is already reviewed — edit its types below instead");
  if (unreviewed > 0 && !redo) throw new Error("This chapter is already sorted — tick “Redo” to rebuild it");

  // Don't start what today's free-tier quota can't finish: a run that dies
  // halfway leaves notes but no piles, and burns the rest of the day's budget.
  const [total, pending, usage] = await Promise.all([
    prisma.pYQ.count({ where: { pattern_id: patternId } }),
    prisma.pYQ.count({ where: { pattern_id: patternId, solving_idea: null } }),
    getDailyUsage(),
  ]);
  const needed = estimateSortCalls(total, pending);
  const left = usage.limit - usage.used;
  if (needed > left) {
    const hours = Math.ceil(usage.resetsInMs / 3600_000);
    throw new Error(
      `Not enough Gemini quota left today: this chapter needs ~${needed} requests, ${Math.max(0, left)} left. Resets in ~${hours}h.`,
    );
  }

  const startedAt = Date.now();
  let job: SortJob = { state: "running", step: "notes", message: null, startedAt, updatedAt: startedAt };
  await setSortJob(patternId, job);

  const save = async (patch: Partial<SortJob>) => {
    job = { ...job, ...patch, updatedAt: Date.now() };
    await setSortJob(patternId, job).catch(() => {});
  };

  after(async () => {
    // Heartbeat on log lines (throttled) so a long notes step isn't mistaken
    // for a dead job by isJobActive().
    let lastBeat = Date.now();
    try {
      const res = await buildChapter(patternId, {
        redo,
        onStep: (step) => save({ step }),
        log: () => {
          if (Date.now() - lastBeat > 30_000) {
            lastBeat = Date.now();
            void save({});
          }
        },
      });
      if (res.status === "skipped") await save({ state: "skipped", step: null, message: res.reason });
      else await save({ state: "done", step: null, message: `Sorted ${res.total} PYQs into ${res.piles.length} types` });
    } catch (e) {
      const message = e instanceof QuotaExhausted ? e.message : `Failed: ${e instanceof Error ? e.message : String(e)}`;
      await save({ state: "error", step: null, message });
    }
  });
}

export type SortProgress = { job: SortJob | null; active: boolean; notesDone: number; total: number };

export async function getSortProgress(patternId: string): Promise<SortProgress> {
  await requireAdmin();
  const [job, total, notesDone] = await Promise.all([
    getSortJob(patternId),
    prisma.pYQ.count({ where: { pattern_id: patternId } }),
    prisma.pYQ.count({ where: { pattern_id: patternId, solving_idea: { not: null } } }),
  ]);
  return { job, active: isJobActive(job), notesDone, total };
}

// ─── Fix formulas ────────────────────────────────────────────────────────────
//
// Chapters sorted before the LaTeX rule have plain-text math in method/trick.
// One Gemini call per chapter rewrites it as $…$ KaTeX (lib/subPatterns →
// latexifyTypes). Types already using $…$ everywhere are left out of the call.

/** Returns how many types changed. */
export async function fixChapterFormulas(patternId: string): Promise<number> {
  await requireAdmin();
  const [pattern, types] = await Promise.all([
    prisma.pattern.findUnique({
      where: { id: patternId },
      select: { exam_type: true, subject: true, topic_name: true },
    }),
    prisma.subPattern.findMany({
      where: { pattern_id: patternId },
      select: { id: true, method: true, trick: true },
    }),
  ]);
  if (!pattern) throw new Error("Chapter not found");

  const hasMath = (s: string | null) => !s || s.includes("$");
  const todo = types.filter((t) => !(hasMath(t.method) && hasMath(t.trick)));
  if (todo.length === 0) return 0;

  const usage = await getDailyUsage();
  if (usage.used >= usage.limit) throw new Error("No Gemini quota left today — try after the reset.");

  let fixed: Awaited<ReturnType<typeof latexifyTypes>>;
  try {
    fixed = await latexifyTypes(pattern, todo);
  } catch (e) {
    if (isDailyQuotaExceeded(e)) throw new Error("Daily Gemini quota exhausted — try after the reset.");
    throw e;
  }

  let changed = 0;
  for (const t of todo) {
    const f = fixed.get(t.id);
    if (!f || (f.method === t.method && f.trick === t.trick)) continue;
    // Keep an existing trick if the model dropped it.
    await prisma.subPattern.update({
      where: { id: t.id },
      data: { method: f.method, trick: f.trick ?? t.trick },
    });
    changed++;
  }
  if (changed) invalidate();
  return changed;
}
