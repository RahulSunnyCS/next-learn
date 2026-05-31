// ─── app/(challenges)/c06-metadata-seo/sitemap.ts ────────────────────────────
//
// DOCUMENTED EXAMPLE — THIS IS NOT THE REAL APP SITEMAP.
//
// ⚠  IMPORTANT SCOPING NOTE:
//   In a production Next.js app, the sitemap MUST live at:
//     app/sitemap.ts   → served at https://example.com/sitemap.xml
//
//   Placing it here (inside a route group segment) produces a segment-scoped
//   sitemap served at the segment's path, NOT at /sitemap.xml.  That means
//   it would only be found by Google if you explicitly submit the segment
//   URL — which is not what you want.
//
//   In this repo the root app/ directory is owned by the shell/capstone and
//   is out of scope for this challenge.  This file is here as a teaching
//   example.  The capstone is expected to copy/adapt this pattern into the
//   real app/sitemap.ts.
//
// HOW IT WORKS:
//   Next.js calls the default-exported function, receives the array, and
//   serialises it into valid <urlset> XML automatically.  You do not write
//   XML — just return MetadataRoute.Sitemap.
//
// SEE ALSO:
//   solutions/c06-metadata-seo/NOTES.md for the full explanation.

import type { MetadataRoute } from "next";
import { getCachedProductsForSitemap } from "./_lib/seo";

// In production this would be process.env.NEXT_PUBLIC_SITE_URL.
const SITE_URL = "https://nextmart.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static routes ─────────────────────────────────────────────────────────
  // These are known at build time and don't require data fetching.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      // changeFrequency: how often search engines should re-crawl.
      // The homepage changes frequently (daily promotions, etc.).
      changeFrequency: "daily",
      // priority: 0.0–1.0.  The homepage is the most important page.
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // ── Dynamic product routes ─────────────────────────────────────────────────
  // Fetched from the data layer using the cached helper in _lib/seo.ts.
  // In production this would query a database; here it uses the in-memory
  // fixture store.
  //
  // getCachedProductsForSitemap() wraps the repository call with
  // `'use cache'` + cacheLife('days') so repeated sitemap regenerations
  // within the day are fast.
  const products = await getCachedProductsForSitemap();

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: new Date(product.createdAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
