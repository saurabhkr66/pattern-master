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
    "/bookmarks", // auth-gated: returns a 200 empty shell to crawlers → soft 404
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
      // Explicitly welcome AI crawlers for Generative Engine Optimisation (GEO).
      // Two kinds of bots, both needed:
      //   • Training crawlers   — GPTBot, ClaudeBot, PerplexityBot, Google-Extended
      //   • Retrieval crawlers  — fetched live at answer time and cited in the
      //     response: OAI-SearchBot (ChatGPT Search), ChatGPT-User (browse),
      //     Perplexity-User, Claude-User, anthropic-ai. These decide whether we
      //     get CITED by ChatGPT / Perplexity / Claude, so keep them open.
      // (Gemini's live grounding uses plain Googlebot, allowed by the "*" rule.)
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
          "Perplexity-User",
          "ClaudeBot",
          "Claude-User",
          "anthropic-ai",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: "/",
        disallow: ["/dashboard", "/onboarding", "/api/"],
      },
      // Block image-specific crawlers from fetching content images. Page-rendering
      // crawlers (Googlebot, Bingbot) still see the images for context.
      //
      // IMPORTANT: the favicon/icon files MUST stay crawlable here. Google
      // fetches the search-results favicon with Googlebot-Image, so a blanket
      // disallow hides the icon from search results. Allow the icon assets
      // (longest-match wins, so these override the "/" disallow below).
      {
        userAgent: ["Googlebot-Image", "Bingbot-Image", "msnbot-media"],
        allow: [
          "/favicon.ico",
          "/favicon-48.png",
          "/favicon-192.png",
          "/favicon-512.png",
          "/icon.png",
          "/apple-icon.png",
        ],
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
