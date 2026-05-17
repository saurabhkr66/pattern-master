// app/sitemap.xml/route.ts
//
// Next 16's `generateSitemaps` only publishes child sitemaps at
// /sitemap/[id].xml — it does NOT auto-publish a sitemap index at
// /sitemap.xml. Without this handler, /sitemap.xml falls through to the
// `[examType]` dynamic route and Google reports "Sitemap is HTML".
//
// This route reuses `generateSitemaps` from app/sitemap.ts so the index
// and children stay in lockstep.

import { generateSitemaps } from "../sitemap";

export const dynamic = "force-dynamic";

const BASE = "https://battleexam.com";

export async function GET() {
  const ids = await generateSitemaps();
  const lastmod = new Date().toISOString();

  const entries = ids
    .map(
      ({ id }) =>
        `  <sitemap><loc>${BASE}/sitemap/${id}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
