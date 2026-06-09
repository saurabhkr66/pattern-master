import type { MetadataRoute } from "next";

// Single "/" allow with explicit disallow list. Previously the allow list was a
// hand-maintained per-exam allowlist (only gate-cse, isro-cse, barc-cse,
// ese-cse) which silently excluded jee-main, neet, gate-ce, etc. from the
// signal we send to crawlers. Allowing "/" lets every public route through and
// the disallow list still keeps gated/auth-only routes out.
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/dashboard",
    "/onboarding",
    "/practice",   // requires auth — no useful content for crawlers
    "/test",
    "/review",
    "/mistakes",
    "/api/",
    "/sign-in",
    "/sign-up",
    "/sso-callback",
    "/account",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      // Explicitly welcome AI crawlers for Generative Engine Optimisation (GEO)
      {
        userAgent: ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended"],
        allow: "/",
        disallow: ["/dashboard", "/onboarding", "/api/"],
      },
      // Block image-specific crawlers from fetching images. Page-rendering
      // crawlers (Googlebot, Bingbot) still see the images for context.
      {
        userAgent: ["Googlebot-Image", "Bingbot-Image", "msnbot-media"],
        disallow: "/",
      },
      // Block SEO-tool / scraper bots. They drive zero user traffic and
      // crawl aggressively (one was responsible for the May 14 CPU spike).
      // Googlebot / Bingbot / AI crawlers are still explicitly allowed above.
      {
        userAgent: [
          "SemrushBot",
          "AhrefsBot",
          "MJ12bot",
          "DotBot",
          "DataForSeoBot",
          "PetalBot",
          "Bytespider",
          "BLEXBot",
          "SeznamBot",
          "ZoominfoBot",
          "rogerbot",
          "Barkrowler",
          "Amazonbot",
        ],
        disallow: "/",
      },
    ],
    sitemap: "https://battleexam.com/sitemap.xml",
  };
}
