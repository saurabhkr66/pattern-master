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
};

export default nextConfig;
