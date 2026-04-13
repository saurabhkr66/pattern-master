import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/sign-in",
          "/sign-up",
          "/practice",
          "/test",
          "/*/*/*/pyq-",
          "/*/*/*/spyq-",
          "/*/*/*/gq-",
        ],
        disallow: [
          "/dashboard",
          "/onboarding",
          "/api/",
          "/api/maintenance/",
        ],
      },
      // Explicitly allow AI crawlers for GEO
      {
        userAgent: ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended"],
        allow: [
          "/",
          "/practice",
          "/*/*/*/pyq-",
          "/*/*/*/spyq-",
          "/*/*/*/gq-",
        ],
        disallow: ["/dashboard", "/onboarding", "/api/"],
      },
    ],
    sitemap: "https://patternmaster.in/sitemap.xml",
  };
}
