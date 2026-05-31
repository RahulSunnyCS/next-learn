// ─── _lib/queries.ts — Local data accessors for C07 Data Fetching ────────────
//
// CACHE COMPONENTS DISCIPLINE:
//   Any call to @/lib/data is non-deterministic (Math.random() latency) and
//   therefore dynamic. These helpers are used inside <Suspense>-wrapped child
//   components — never at the static shell level.
//
// WHY A LOCAL _lib INSTEAD OF CALLING @/lib/data DIRECTLY?
//   The task contract requires a local _lib helper "over" lib/data without
//   editing lib/data. This layer lets us:
//   1. Instrument calls for C07's dedup demonstration (fetchCount tracking).
//   2. Wrap React cache() here so every consumer gets memoised reads without
//      knowing the implementation detail.
//   3. Keep the lesson in one place — challenge code imports from here.
//
// REACT cache() vs 'use cache' — IMPORTANT DISTINCTION (also in spec.md):
//   React cache()       → per-request memoisation (deduplicate within ONE
//                         server render pass). The cache is thrown away when
//                         the request ends. Useful for: avoiding N+1 reads
//                         when multiple components call the same accessor in
//                         one render tree.
//
//   'use cache' directive → cross-request persistence (Next.js server-side
//                           cache that survives beyond the current request).
//                           Useful for: caching expensive data between users
//                           and between reloads. Paired with cacheTag() /
//                           cacheLife() for targeted invalidation.
//
//   They are complementary. In a real app you often want BOTH: 'use cache'
//   so the same data is shared across requests, AND React cache() so that
//   multiple components within one request don't even hit the cached layer
//   twice (saves serialisation overhead).

import { cache } from "react";
import {
  getProductById,
  getProductBySlug,
  listProducts,
  listCategories,
  listReviews,
} from "@/lib/data";
import type { Product, Category, Review, PaginatedResult } from "@/lib/data";

// ---------------------------------------------------------------------------
// Dedup instrumentation
// ---------------------------------------------------------------------------
// A per-module counter we expose for the demonstration UI. In production code
// you would not do this — it is purely for teaching request memoisation.
//
// Because this module is re-evaluated fresh per request in the Next.js App
// Router, the counter starts at 0 for each server render and therefore
// reflects within-request call counts correctly.
export let underlyingFetchCount = 0;

/** Reset — called by the demo page at the start of each render context. */
export function resetFetchCount() {
  underlyingFetchCount = 0;
}

// ---------------------------------------------------------------------------
// Memoised accessor — wrapped with React cache()
// ---------------------------------------------------------------------------

/**
 * getProductByIdMemo — wraps getProductById with React cache().
 *
 * WHAT THIS DEMONSTRATES:
 *   Multiple async components in one render tree can call getProductByIdMemo
 *   with the same id. React cache() deduplicates them: the underlying
 *   getProductById is invoked ONCE; all callers receive the same promise.
 *
 *   Without cache(), three components calling getProductById("p-elec-001")
 *   would fire three independent delays (3 × 30–120ms ≈ 90–360ms total
 *   serial waste even when they are all awaited in parallel — each still
 *   spins up its own delay).
 *
 *   With cache(), the first call fires the delay; the second and third
 *   callers receive the already-resolved value synchronously (0ms overhead).
 *
 * NOTE: The memo is per-request. Once the server response is sent, the
 * cache is discarded. This is NOT the same as 'use cache' (Next.js
 * cross-request cache). See spec.md for the full contrast.
 */
export const getProductByIdMemo = cache(async (id: string): Promise<Product | null> => {
  underlyingFetchCount++;        // count the underlying network/store hit
  return getProductById(id);
});

/**
 * getProductBySlugMemo — same pattern as above but keyed by slug.
 * Used by the preload pattern example.
 */
export const getProductBySlugMemo = cache(async (slug: string): Promise<Product | null> => {
  underlyingFetchCount++;
  return getProductBySlug(slug);
});

/**
 * listCategoriesMemo — memoised category list.
 * A category list is typically read in the shell AND in child components
 * (e.g. for breadcrumbs). One underlying call regardless of how many
 * components call this in the same render.
 */
export const listCategoriesMemo = cache(async (): Promise<Category[]> => {
  underlyingFetchCount++;
  return listCategories();
});

/**
 * listReviewsMemo — memoised review list for one product.
 */
export const listReviewsMemo = cache(async (productId: string): Promise<Review[]> => {
  underlyingFetchCount++;
  return listReviews(productId);
});

// ---------------------------------------------------------------------------
// Raw (non-memoised) accessors
// ---------------------------------------------------------------------------
// Re-exported for the WATERFALL example, which deliberately does NOT use
// cache() so that timing is real and the lesson is visible.

/**
 * getProductRaw — a direct, non-memoised product read.
 * Calling this multiple times fires multiple underlying delays.
 * Used intentionally by the waterfall demo to show the anti-pattern.
 */
export async function getProductRaw(id: string): Promise<Product | null> {
  underlyingFetchCount++;
  return getProductById(id);
}

/**
 * listProductsRaw — a direct, non-memoised product list.
 */
export async function listProductsRaw(
  opts: Parameters<typeof listProducts>[0]
): Promise<PaginatedResult<Product>> {
  underlyingFetchCount++;
  return listProducts(opts);
}

/**
 * listCategoriesRaw — non-memoised category list, for the waterfall demo.
 */
export async function listCategoriesRaw(): Promise<Category[]> {
  underlyingFetchCount++;
  return listCategories();
}
