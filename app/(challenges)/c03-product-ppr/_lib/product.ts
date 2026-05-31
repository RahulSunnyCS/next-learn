// ─── _lib/product.ts — Cached product data for C03 PPR challenge ─────────
//
// This module contains the ONLY cached data accessor for this challenge.
// Everything in this file is meant to end up in the STATIC SHELL — data that
// is the same for every visitor and safe to prerender at build time.
//
// CACHE COMPONENTS RULE: opt INTO caching with 'use cache', not out of
// dynamic with `export const dynamic`. Each function below is annotated
// with 'use cache' (function-level) so it caches its return value.
//
// WHY CACHE THE SHELL DATA?
//   Product name, description, price, and images rarely change. Caching them
//   means the shell is prerendered once and served instantly from the CDN/
//   server cache on every subsequent request — the "S" in PPR (Partial
//   Prerender). The dynamic holes (LiveInventory, Recommendations, Reviews)
//   are intentionally NOT cached here; they always execute per-request.

import { cacheTag, cacheLife } from "next/cache";
import { getProductBySlug, listProducts, tags } from "@/lib/data";
import type { Product } from "@/lib/data";

// ---------------------------------------------------------------------------
// Cached shell data loader
// ---------------------------------------------------------------------------

/**
 * Returns cached product data for the static shell.
 *
 * The 'use cache' directive tells Next.js to cache this function's return
 * value (keyed on the `slug` argument). The cache entry is:
 *   - Tagged with `tags.product(slug)` so a Server Action can call
 *     `revalidateTag(tags.product(slug))` to invalidate just this product
 *     when it is updated.
 *   - Given a lifetime of 'hours' so it revalidates periodically even if
 *     no explicit invalidation happens (belt-and-suspenders for price changes).
 *
 * Returns null if the product does not exist (unknown slug).
 */
export async function getProductShellData(slug: string): Promise<Product | null> {
  "use cache";
  // cacheTag and cacheLife MUST be called before any await inside a
  // 'use cache' function — Next.js reads them synchronously at cache-entry
  // creation time.
  cacheTag(tags.product(slug));
  cacheLife("hours");
  return getProductBySlug(slug);
}

// ---------------------------------------------------------------------------
// Cached sibling products (used by Recommendations to get the pool)
// ---------------------------------------------------------------------------

/**
 * Returns a cached list of products in the same category as the given
 * product. Used by <Recommendations> — but NOTE: the Recommendations
 * component itself is a DYNAMIC hole (it is NOT cached) because in a real
 * app you would personalise the list per user. This cached helper just
 * provides the pool; the selection logic runs uncached per-request.
 *
 * Tagged with `tags.products` so the whole list is invalidated when any
 * product is added or removed.
 */
export async function getCachedCategoryProducts(categoryId: string): Promise<Product[]> {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");
  const result = await listProducts({ categoryId, pageSize: 20 });
  return result.items;
}

// ---------------------------------------------------------------------------
// Helper — format price
// ---------------------------------------------------------------------------

/**
 * Formats an integer cent value as a locale currency string.
 * E.g. 24999 → "$249.99".
 * Exported so shell and solution components can share the same formatter.
 */
export function formatPrice(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
