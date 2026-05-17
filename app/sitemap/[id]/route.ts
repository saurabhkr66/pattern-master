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

// Cache each child sitemap for 1 hour so bot floods don't re-query Prisma on
// every hit. New content shows up within an hour, which is fine for SEO.
export const revalidate = 3600;

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
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
