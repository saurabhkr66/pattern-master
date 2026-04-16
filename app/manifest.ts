import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PatternMaster – GATE CSE Prep",
    short_name: "PatternMaster",
    description:
      "Master GATE CSE, ISRO, BARC & ESE with AI-generated pattern-based practice questions.",
    start_url: "/practice",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    categories: ["education"],
  };
}
