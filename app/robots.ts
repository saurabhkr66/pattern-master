import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/sign-up"],
        disallow: ["/dashboard", "/practice", "/onboarding", "/api/"],
      },
    ],
    sitemap: "https://patternmaster.in/sitemap.xml",
  };
}
