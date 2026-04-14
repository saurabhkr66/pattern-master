import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.8'],

  experimental: {
    // Tree-shake these packages — only bundle the icons/functions actually imported
    // lucide-react: ~200KB full library → ~15KB (only icons you use)
    // katex: only bundle the rendering functions, not the full package
    optimizePackageImports: ['lucide-react', 'katex'],
  },
};

export default nextConfig;
