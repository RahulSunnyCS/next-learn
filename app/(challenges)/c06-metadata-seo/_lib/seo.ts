// ─── app/(challenges)/c06-metadata-seo/_lib/seo.ts ───────────────────────────
//
// Thin caching wrapper around lib/data for the SEO challenge.
//
// WHY A SEPARATE HELPER INSTEAD OF CALLING lib/data DIRECTLY?
//   generateMetadata runs on every request (it cannot itself be a React
//   component or Suspense boundary).  Without a `'use cache'` wrapper, every
//   metadata generation call would hit the simulated repository latency.
//   By wrapping the data reads here we get:
//     1. The product data is fetched once and cached across both
//        generateMetadata and the page's render component during the same
//        request (React's request de-dup / cache).
//     2. Subsequent requests within the cacheLife window skip the repository
//        entirely and return the cached value immediately.
//
// WHY NOT JUST IMPORT FROM lib/data WITH 'use cache' ON THE IMPORT SITE?
//   The `'use cache'` directive must be on a function boundary, not at the
//   call site.  Wrapping here keeps the directive in one place and avoids
//   duplicating cache configuration across page.tsx and opengraph-image.tsx.

import { cacheTag, cacheLife } from "next/cache";
import { getProductBySlug, listProducts, tags } from "@/lib/data";
import type { Product } from "@/lib/data";

// Re-export Product so callers don't need two imports.
export type { Product };

/**
 * Fetch a single product by slug, cached per-slug.
 *
 * cacheLife('hours') — products change infrequently; an hour TTL is a
 * reasonable balance between freshness and cache efficiency for SEO use.
 *
 * cacheTag(tags.product(slug)) — allows targeted invalidation if a product
 * is updated via a Server Action (revalidateTag(tags.product(slug))).
 */
export async function getCachedProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.product(slug));
  return getProductBySlug(slug);
}

/**
 * Fetch the full product list for sitemap generation, cached as a collection.
 *
 * cacheLife('days') — the sitemap is generated infrequently; a day TTL is
 * fine.  Products added today will appear in the sitemap after the cache
 * expires (acceptable for most storefronts).
 *
 * cacheTag(tags.products) — invalidated when any product is added/removed.
 */
export async function getCachedProductsForSitemap(): Promise<Product[]> {
  "use cache";
  cacheLife("days");
  cacheTag(tags.products);
  const result = await listProducts({ pageSize: 1000 });
  return result.items;
}

/**
 * Format a price in cents as a USD dollar string.
 * e.g. 24999 → "$249.99"
 *
 * Used in the OG image and in metadata descriptions.
 */
export function formatPrice(priceCents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

/**
 * Truncate a string to maxLength characters, appending "…" if truncated.
 * Used to keep meta descriptions within the recommended 155-character limit.
 */
export function truncate(text: string, maxLength: number = 155): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}
