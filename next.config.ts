import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/smart-write/**/*": ["./docs/writing-tools/*.md"],
  },
  outputFileTracingExcludes: {
    "/api/smart-write/**/*": ["./.data/**/*", "./.env*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
