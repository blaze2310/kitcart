
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js development indicator.
  devIndicators: false,

  // Preserve existing KitCart configuration.
  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
