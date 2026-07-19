// app/[examType]/[subject]/[topic]/[questionId]/route.ts
//
// Legacy per-question URLs (pyq-*, gq-*, spyq-*) permanently redirect to the
// PARENT TOPIC PAGE ROOT (page 1). The topic page hosts every question inline,
// so the per-question URL has no unique content of its own.
//
// URL example: /gate-cse/dbms/normalization/pyq-abc123
//              → 308 → /gate-cse/dbms/normalization
//
// WHY the topic root (and NOT /page/N#anchor): these thin URLs are what Google
// still has indexed from the old scheme. Two reasons to land them on page 1:
//   1. SEO — a 308 consolidates ranking signal onto the redirect TARGET. Sending
//      thousands of old question URLs to the canonical topic page 1 concentrates
//      all that signal on the one page we actually want to rank, instead of
//      scattering it across low-priority /page/N pagination URLs.
//   2. UX — a searcher clicking an old result landed deep in pagination (e.g.
//      /page/13) anchored to a mid-list question, which reads as "opened a
//      random question, not from the start." The topic root starts them at Q1.
//
// WHY a Route Handler and not a page.tsx: the previous page.tsx used
// permanentRedirect(), but App Router streams the layout shell before the page
// resolves, so the 200 status was already flushed and the redirect degraded to
// a client-side NEXT_REDIRECT payload. Googlebot kept ~340 of these thin URLs
// indexed as soft-404s/duplicates. A Route Handler returns a real HTTP 308
// (and a real 404 for unknown ids) with no streaming semantics.

import { prisma } from "@/lib/prisma";
import { toSlug, buildExamSlug } from "@/lib/seo";

// Resolve a legacy question id to its parent topic-page root path.
// Only needs the pattern (exam/subject/topic) — no pagination math.
async function buildRedirectUrl(questionId: string): Promise<string | null> {
  const patternSelect = {
    pattern: {
      select: { subject: true, topic_name: true, exam_type: true, branch: true },
    },
  } as const;

  if (questionId.startsWith("pyq-")) {
    const id = questionId.slice(4);
    const q = await prisma.pYQ.findUnique({ where: { id }, select: patternSelect });
    if (!q) return null;
    return `/${buildExamSlug(q.pattern.exam_type, q.pattern.branch)}/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}`;
  }

  const id = questionId.startsWith("gq-") ? questionId.slice(3) : questionId;
  const q = await prisma.generatedQuestion.findUnique({ where: { id }, select: patternSelect });
  if (!q) return null;
  return `/${buildExamSlug(q.pattern.exam_type, q.pattern.branch)}/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}`;
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

  // Real HTTP 308 — Google consolidates ranking signal onto the topic page root.
  return new Response(null, {
    status: 308,
    headers: {
      Location: url,
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
