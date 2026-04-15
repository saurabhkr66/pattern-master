import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",                // homepage
          "/sign-in",
          "/sign-up",
          "/gate-cse/",       // all public subject/topic/question pages
          "/isro-cse/",
          "/barc-cse/",
          "/ese-cse/",
        ],
        disallow: [
          "/dashboard",
          "/onboarding",
          "/practice",        // requires auth — no useful content for crawlers
          "/test",
          "/review",
          "/mistakes",
          "/api/",
        ],
      },
      // Explicitly welcome AI crawlers for Generative Engine Optimisation (GEO)
      {
        userAgent: ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended"],
        allow: [
          "/",
          "/gate-cse/",
          "/isro-cse/",
          "/barc-cse/",
          "/ese-cse/",
        ],
        disallow: ["/dashboard", "/onboarding", "/api/"],
      },
    ],
    sitemap: "https://battleexam.com/sitemap.xml",
  };
}
