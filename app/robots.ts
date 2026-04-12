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
          // Allow all question paths: /<exam>/<subject>/<topic>/<questionId>
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
    ],
    sitemap: "https://patternmaster.in/sitemap.xml",
  };
}
