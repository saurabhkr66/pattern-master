// app/[examType]/[subject]/[topic]/[questionId]/route.ts
//
// Per-question URLs (pyq-*, gq-*, spyq-*) permanently redirect to their parent
// topic page with an anchor to the specific question (and the right pagination
// page if the question is on page 2+). The topic page hosts every question
// inline, so the per-question URL has no unique content of its own.
//
// URL example: /gate-cse/dbms/normalization/pyq-abc123
//              → 308 → /gate-cse/dbms/normalization/page/2#q-pyq-abc123
//
// WHY a Route Handler and not a page.tsx: the previous page.tsx used
// permanentRedirect(), but App Router streams the layout shell before the page
// resolves, so the 200 status was already flushed and the redirect degraded to
// a client-side NEXT_REDIRECT payload. Googlebot kept ~340 of these thin URLs
// indexed as soft-404s/duplicates. A Route Handler returns a real HTTP 308
// (and a real 404 for unknown ids) with no streaming semantics.

import { prisma } from "@/lib/prisma";
import { toSlug, buildExamSlug, TOPIC_PAGE_SIZE } from "@/lib/seo";

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
    const pageSuffix = page > 1 ? `/page/${page}` : "";
    return `${base}${pageSuffix}#q-pyq-${q.id}`;
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
  const pageSuffix = page > 1 ? `/page/${page}` : "";
  return `${base}${pageSuffix}#q-gq-${q.id}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const { questionId } = await params;

  let url: string | null = null;
  try {
    url = await buildRedirectUrl(questionId);
  } catch (err) {
    // DB errors (connection timeout, invalid id format, etc.) should 404 rather
    // than 500 so Google doesn't keep retrying these old URLs as broken pages.
    console.error("[question-redirect] DB error for", questionId, err);
  }

  if (!url) {
    return new Response("Not Found", {
      status: 404,
      // Short edge cache so crawler bursts on dead ids don't hammer the DB,
      // but a later reseed of the id isn't masked for long.
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  }

  // Real HTTP 308 — Google consolidates ranking signal to the topic page.
  // Long edge cache: the mapping only changes if questions are re-paginated,
  // and even then the anchor still lands on the right topic.
  return new Response(null, {
    status: 308,
    headers: {
      Location: url,
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
