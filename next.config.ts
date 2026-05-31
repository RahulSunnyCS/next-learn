import type { NextConfig } from "next";

// cacheComponents: true enables the v16 Cache Components feature (PPR +
// `'use cache'` directive support).  In Next.js 16 this is a top-level key —
// the old experimental.cacheComponents was deprecated in favour of this.
// See: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
