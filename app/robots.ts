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
    ],
    sitemap: "https://battleexam.com/sitemap.xml",
  };
}
