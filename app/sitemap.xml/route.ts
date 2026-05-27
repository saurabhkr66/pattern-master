// app/sitemap.xml/route.ts
//
// Sitemap index. Lists every child sitemap by URL so Google can discover
// all of them from a single submission. The metadata-file convention
// (`app/sitemap.ts` with `generateSitemaps`) does NOT publish an index at
// /sitemap.xml in Next 16 — only children at /sitemap/[id].xml — so we
// serve the index from an explicit Route Handler.

import { listSitemapIds, renderSitemapIndex } from "@/lib/sitemap-data";

// Cache for 24 hours. Sitemaps don't need hourly freshness — new content
// surfaces on topic pages (which have their own ISR) long before Google
// recrawls. s-maxage lets Vercel's CDN edge serve bot floods without ever
// invoking the function or waking Neon.
export const revalidate = 86400;

export async function GET() {
  const ids = await listSitemapIds();
  return new Response(renderSitemapIndex(ids), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
