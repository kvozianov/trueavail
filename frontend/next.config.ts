import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle in .next/standalone (used by the Docker runtime image).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  agentRules: false,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
