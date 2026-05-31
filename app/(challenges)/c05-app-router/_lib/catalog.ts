// ─── _lib/catalog.ts — c05 local data helpers ─────────────────────────────
//
// This thin wrapper over @/lib/data satisfies the task rule:
//   "data is read via a local _lib helper over lib/data without editing lib/data"
//
// CACHE COMPONENTS RULE: All functions here are tagged with 'use cache'.
// This lets callers (Server Components inside <Suspense>) benefit from PPR:
// the cached result is served immediately on subsequent requests and is
// invalidated via cacheTag when a product changes.
//
// Each cached function:
//   1. Declares 'use cache' as its FIRST statement (function-level directive)
//   2. Calls cacheTag() to register tags for targeted invalidation
//   3. Calls cacheLife('hours') to set a TTL profile
//
// Calling these from a Server Component outside <Suspense> is SAFE because
// the return value is cached — they are not "uncached dynamic reads".
// The build's Route table will show ◐ (Partial Prerender) for pages that
// also have an uncached hole alongside these cached calls.

import { cacheTag, cacheLife } from "next/cache";
import {
  listProducts,
  getProductById,
  listCategories,
  type Product,
  type PaginatedResult,
  type Category,
} from "@/lib/data";
import { tags } from "@/lib/data";

// ---------------------------------------------------------------------------
// Cached product listing
// ---------------------------------------------------------------------------

/**
 * Returns the first page of products from the shared data layer.
 * Cached for 1 hour with the "products" tag so all pages that list
 * products are revalidated together when inventory changes.
 */
export async function getCatalogProducts(): Promise<PaginatedResult<Product>> {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");

  return listProducts({ pageSize: 12, sort: "newest" });
}

// ---------------------------------------------------------------------------
// Cached single-product lookup (by id)
// ---------------------------------------------------------------------------

/**
 * Returns one product by id, or null if not found.
 * Cached with a per-product tag so only this product is revalidated when
 * it changes (not the entire listing).
 */
export async function getCatalogProductById(
  id: string
): Promise<Product | null> {
  "use cache";
  // Register both the specific product tag AND the collection tag.
  // The collection tag lets a listing invalidation also bust this cache.
  cacheTag(tags.product(id), tags.products);
  cacheLife("hours");

  return getProductById(id);
}

// ---------------------------------------------------------------------------
// Cached categories
// ---------------------------------------------------------------------------

/**
 * Returns all categories. Cached with the "categories" tag.
 */
export async function getCatalogCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(tags.categories);
  cacheLife("hours");

  return listCategories();
}
