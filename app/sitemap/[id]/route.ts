// app/sitemap/[id]/route.ts
//
// Serves individual child sitemaps. URL shape: /sitemap/<id>.xml where
// <id> is one of:
//   0          → hub: static, exam/subject/topic, mock landing
//   mock-N     → Nth chunk of mock test instances
//
// Replaces the previous `app/sitemap.ts` metadata file. The metadata
// convention was abandoned because it claims /sitemap.xml at build time
// (causing a route/metadata conflict) while not actually serving an
// index there.

import { buildSitemapById, renderUrlset } from "@/lib/sitemap-data";

// Cache each child sitemap for 24 hours. Heavy findMany/groupBy queries here
// (distinct exam/branch/subject/topic combos) are the most expensive in the
// sitemap path — keep them off Neon by letting the CDN edge serve bots.
export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;

  if (!rawId.endsWith(".xml")) {
    return new Response("Not found", { status: 404 });
  }
  const id = rawId.slice(0, -".xml".length);

  const entries = await buildSitemapById(id);
  if (entries === null) {
    console.error(`[sitemap] unknown id: ${id}`);
    return new Response("Not found", { status: 404 });
  }

  return new Response(renderUrlset(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
