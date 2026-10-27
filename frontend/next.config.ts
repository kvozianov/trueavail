import type { NextConfig } from "next";

// NEXT_PUBLIC_DEMO=1 (npm run build:demo): static export to out/ for static hosting (Vercel).
// The API client then reads precomputed backend responses from public/demo/*.json.
// Otherwise: self-contained server bundle in .next/standalone (used by the Docker runtime image).
const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

const nextConfig: NextConfig = {
  output: DEMO ? "export" : "standalone",
  // Static hosts serve /backtest/ from backtest/index.html.
  trailingSlash: DEMO,
  // Cache Components (PPR) is not supported with static export; the demo pages are fully static anyway.
  cacheComponents: !DEMO,
  partialPrefetching: !DEMO,
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
