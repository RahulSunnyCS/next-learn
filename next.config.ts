import type { NextConfig } from "next";

// cacheComponents: true enables the v16 Cache Components feature (PPR +
// `'use cache'` directive support).  In Next.js 16 this is a top-level key —
// the old experimental.cacheComponents was deprecated in favour of this.
// See: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
const nextConfig: NextConfig = {
  cacheComponents: true,
  // Seed data (lib/data) uses picsum.photos image URLs. next/image requires
  // remote hosts to be allowlisted here. Added by the orchestrator so every
  // image-using challenge works without editing this (frozen) config itself.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
