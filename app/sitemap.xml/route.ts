// app/sitemap.xml/route.ts
//
// Sitemap index. Lists every child sitemap by URL so Google can discover
// all of them from a single submission. The metadata-file convention
// (`app/sitemap.ts` with `generateSitemaps`) does NOT publish an index at
// /sitemap.xml in Next 16 — only children at /sitemap/[id].xml — so we
// serve the index from an explicit Route Handler.

import { listSitemapIds, renderSitemapIndex } from "@/lib/sitemap-data";

// Cache the response for 1 hour so bot floods don't re-query Prisma on every
// hit. New mock tests show up within an hour, which is fine for SEO.
export const revalidate = 3600;

export async function GET() {
  const ids = await listSitemapIds();
  return new Response(renderSitemapIndex(ids), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
