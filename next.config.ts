import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js development indicator.
  devIndicators: false,

  // Preserve KitCart caching configuration.
  cacheComponents: true,
  partialPrefetching: true,

  // Use Next.js standard CSS Module processing.
  // Do not override all CSS files with a Turbopack loader.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
