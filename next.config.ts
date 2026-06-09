import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.8', '192.168.1.10'],

  // mupdf ships a WASM module that must not be webpack-bundled — load it from
  // node_modules at runtime (used by lib/pdfRaster for figure-question cropping).
  serverExternalPackages: ['mupdf'],

  // Use standard build to support dynamic API routes and Prisma
  // (Switching to 'export' requires refactoring all Server Components to Client Components)

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  experimental: {

    // Tree-shake these packages — only bundle the icons/functions actually imported
    // lucide-react: ~200KB full library → ~15KB (only icons you use)
    // katex: only bundle the rendering functions, not the full package
    optimizePackageImports: ['lucide-react', 'katex'],
  },

  // Old URLs with a `-common` suffix used to be the canonical form for
  // branchless exams (JEE Main, NEET, SSC, etc.). We now hide "Common" from
  // URLs entirely — these permanent redirects fold the indexed `-common`
  // variants into the cleaner form so Google consolidates ranking signal.
  // Keep the service worker script out of the HTTP cache so PWA updates ship
  // immediately on the next visit instead of being pinned to a stale version.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Legacy ?page=N topic pagination → path-based /page/N (ISR-compatible)
      {
        source: "/:p1/:p2/:p3",
        has: [{ type: "query", key: "page", value: "(?<page>\\d+)" }],
        destination: "/:p1/:p2/:p3/page/:page",
        permanent: true,
      },
      { source: "/jee-main-common", destination: "/jee-main", permanent: true },
      { source: "/jee-main-common/:path*", destination: "/jee-main/:path*", permanent: true },
      { source: "/jee-advanced-common", destination: "/jee-advanced", permanent: true },
      { source: "/jee-advanced-common/:path*", destination: "/jee-advanced/:path*", permanent: true },
      { source: "/neet-common", destination: "/neet", permanent: true },
      { source: "/neet-common/:path*", destination: "/neet/:path*", permanent: true },
      { source: "/ugc-net-p1-common", destination: "/ugc-net-p1", permanent: true },
      { source: "/ugc-net-p1-common/:path*", destination: "/ugc-net-p1/:path*", permanent: true },
      { source: "/ugc-net-p2-common", destination: "/ugc-net-p2", permanent: true },
      { source: "/ugc-net-p2-common/:path*", destination: "/ugc-net-p2/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
