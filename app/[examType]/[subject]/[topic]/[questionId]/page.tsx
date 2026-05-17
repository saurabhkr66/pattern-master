// app/[examType]/[subject]/[topic]/[questionId]/page.tsx
//
// Per-question URLs (pyq-*, gq-*, spyq-*) now 308 permanent-redirect to their
// parent topic page with an anchor to the specific question (and the right
// pagination page if the question is on page 2+). The topic page hosts every
// question inline, so the per-question URL has no unique content of its own.
//
// URL example: /gate-cse/dbms/normalization/pyq-abc123
//              → 308 → /gate-cse/dbms/normalization?page=2#q-pyq-abc123

import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toSlug, buildExamSlug, TOPIC_PAGE_SIZE } from "@/lib/seo";

interface PageParams {
  examType: string;
  subject: string;
  topic: string;
  questionId: string;
}

// Compute which pagination page hosts a given PYQ. Topic page orders PYQs by
// `year desc, id asc`, so "before this row" = higher year OR same-year-lower-id.
async function pyqPagePosition(pyq: { pattern_id: string; year: number; id: string }) {
  const before = await prisma.pYQ.count({
    where: {
      pattern_id: pyq.pattern_id,
      OR: [
        { year: { gt: pyq.year } },
        { year: pyq.year, id: { lt: pyq.id } },
      ],
    },
  });
  return Math.floor(before / TOPIC_PAGE_SIZE) + 1;
}

// GQs come AFTER all PYQs in the combined list. Ordered by
// `difficulty_level asc, id asc` within GQs.
async function gqPagePosition(gq: { pattern_id: string; difficulty_level: string; id: string }) {
  const [pyqTotal, gqBefore] = await Promise.all([
    prisma.pYQ.count({ where: { pattern_id: gq.pattern_id } }),
    prisma.generatedQuestion.count({
      where: {
        pattern_id: gq.pattern_id,
        OR: [
          { difficulty_level: { lt: gq.difficulty_level } },
          { difficulty_level: gq.difficulty_level, id: { lt: gq.id } },
        ],
      },
    }),
  ]);
  return Math.floor((pyqTotal + gqBefore) / TOPIC_PAGE_SIZE) + 1;
}

async function buildRedirectUrl(questionId: string): Promise<string | null> {
  if (questionId.startsWith("pyq-")) {
    const id = questionId.slice(4);
    const q = await prisma.pYQ.findUnique({
      where: { id },
      select: {
        id: true,
        year: true,
        pattern_id: true,
        pattern: {
          select: { subject: true, topic_name: true, exam_type: true, branch: true },
        },
      },
    });
    if (!q) return null;
    const page = await pyqPagePosition({ pattern_id: q.pattern_id, year: q.year, id: q.id });
    const base = `/${buildExamSlug(q.pattern.exam_type, q.pattern.branch)}/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}`;
    const query = page > 1 ? `?page=${page}` : "";
    return `${base}${query}#q-pyq-${q.id}`;
  }

  if (questionId.startsWith("spyq-")) {
    // Subject-level PYQs don't live on a topic page (they're attached to a
    // SubjectPattern, not a Pattern). Redirect to the subject hub instead;
    // no anchor since the question isn't inlined there yet.
    const id = questionId.slice(5);
    const q = await prisma.subjectPYQ.findUnique({
      where: { id },
      select: {
        subject_pattern: {
          select: { subject_name: true, exam_type: true, branch: true },
        },
      },
    });
    if (!q) return null;
    return `/${buildExamSlug(q.subject_pattern.exam_type, q.subject_pattern.branch)}/${toSlug(q.subject_pattern.subject_name)}`;
  }

  const id = questionId.startsWith("gq-") ? questionId.slice(3) : questionId;
  const q = await prisma.generatedQuestion.findUnique({
    where: { id },
    select: {
      id: true,
      difficulty_level: true,
      pattern_id: true,
      pattern: {
        select: { subject: true, topic_name: true, exam_type: true, branch: true },
      },
    },
  });
  if (!q) return null;
  const page = await gqPagePosition({
    pattern_id: q.pattern_id,
    difficulty_level: q.difficulty_level,
    id: q.id,
  });
  const base = `/${buildExamSlug(q.pattern.exam_type, q.pattern.branch)}/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}`;
  const query = page > 1 ? `?page=${page}` : "";
  return `${base}${query}#q-gq-${q.id}`;
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { questionId } = await params;
  const url = await buildRedirectUrl(questionId);
  if (!url) notFound();

  // permanentRedirect emits a 308 (semantically equivalent to 301 for GET).
  // Google treats both as permanent and consolidates ranking signal.
  permanentRedirect(url);
}
