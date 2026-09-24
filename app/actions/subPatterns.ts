"use server";

// Admin review of AI-built question-types (sub-patterns) — /admin/sub-patterns.
// Piles are created by scripts/build-subpatterns.ts; here the admin renames,
// merges, re-homes questions and finally marks the chapter reviewed, which is
// what makes it visible on public topic pages.
//
// Multi-row writes use $executeRaw: the Neon HTTP adapter has no
// updateMany/$transaction.

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { stripBase64Text } from "@/lib/geminiPacing";
import { toSlug } from "@/lib/seo";

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
