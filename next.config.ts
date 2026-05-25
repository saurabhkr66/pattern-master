import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.8'],

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

  // Proxy Clerk Frontend API requests through our own domain so the
  // __client / __session cookies are first-party to www.battleexam.com.
  // Android WebView (Chromium 91+) blocks third-party SameSite=None cookies
  // even with setAcceptThirdPartyCookies(true), which broke native sign-in.
  // ClerkProvider sets proxyUrl=/__clerk to send all SDK traffic here.
  async rewrites() {
    return [
      {
        source: "/__clerk/:path*",
        destination: "https://clerk.battleexam.com/:path*",
      },
    ];
  },

  // Old URLs with a `-common` suffix used to be the canonical form for
  // branchless exams (JEE Main, NEET, SSC, etc.). We now hide "Common" from
  // URLs entirely — these permanent redirects fold the indexed `-common`
  // variants into the cleaner form so Google consolidates ranking signal.
  async redirects() {
    return [
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
