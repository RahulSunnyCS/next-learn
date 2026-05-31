// ─── _lib/catalog.ts — C02 Catalog data helpers ────────────────────────────
//
// This module wraps the frozen lib/data repository so that challenge code
// never imports from lib/data directly.  Keeping the wrapper local to c02
// means: (a) the lib/data layer stays frozen, (b) other challenges cannot
// accidentally share this module.
//
// CHALLENGE: The two functions below are NOT correctly cached.  Your task:
//
//   1. Add 'use cache'; as the FIRST line inside each function body.
//   2. Call cacheTag(tags.products) / cacheTag(tags.categories) inside each.
//   3. Call cacheLife('hours') inside each — this is what makes the data
//      revalidate on an ~hourly schedule (ISR behaviour under Cache Components).
//
// WHY 'use cache' instead of the old `export const revalidate = 3600`:
//   Under Next.js 16 with cacheComponents: true, route-level `revalidate`
//   exports are replaced by function-level `'use cache'` directives.  The
//   advantage: different functions on the same page can have different
//   lifetimes (e.g. products every hour, categories every 24 hours).
//
// NOTE: cacheTag, cacheLife are stable imports from 'next/cache' in v16
//       (no 'unstable_' prefix required).

import { cacheTag, cacheLife } from "next/cache";
import {
  listProducts,
  listCategories,
  getCategoryBySlug,
  type ListProductsOptions,
  type PaginatedResult,
  type Product,
  type Category,
  tags,
} from "@/lib/data";

// ---------------------------------------------------------------------------
// Cached product listing (ISR via 'use cache' + cacheLife)
// ---------------------------------------------------------------------------

/**
 * Returns a paginated, optionally-filtered list of products.
 *
 * BROKEN SKELETON — currently NOT cached.  Add 'use cache', cacheTag, and
 * cacheLife to make this function serve stale-then-fresh data (ISR).
 *
 * @param opts  Same options as lib/data listProducts (categoryId, sort, etc.)
 */
export async function listCachedProducts(
  opts: ListProductsOptions = {}
): Promise<PaginatedResult<Product>> {
  // TODO (challenge): add the three lines below to enable ISR caching:
  //   'use cache';
  //   cacheTag(tags.products);
  //   cacheLife('hours');
  //
  // Remove this comment block and the TODO once you have fixed the caching.

  // Prevent unused-import lint errors on the incomplete skeleton.
  void cacheTag;
  void cacheLife;
  void tags;

  return listProducts(opts);
}

// ---------------------------------------------------------------------------
// Cached category listing (ISR via 'use cache' + cacheLife)
// ---------------------------------------------------------------------------

/**
 * Returns all categories, sorted alphabetically.
 *
 * BROKEN SKELETON — currently NOT cached.  Same fix as listCachedProducts:
 * add 'use cache', cacheTag(tags.categories), cacheLife('hours').
 */
export async function listCachedCategories(): Promise<Category[]> {
  // TODO (challenge): add the three lines below:
  //   'use cache';
  //   cacheTag(tags.categories);
  //   cacheLife('hours');

  return listCategories();
}

// ---------------------------------------------------------------------------
// Cached single-category lookup (used by the [slug] route)
// ---------------------------------------------------------------------------

/**
 * Looks up a category by its URL slug.  Returns null if not found.
 *
 * This is used by the [slug]/page.tsx to get the categoryId needed to filter
 * products.  It is intentionally NOT cached with cacheLife here because the
 * lookup is invoked per-request from inside a generateStaticParams path —
 * at build time the latency is irrelevant; at runtime the slug is known and
 * the overhead is negligible.
 *
 * A production app might cache this too (cacheLife('days') — category names
 * rarely change).  That is left as an exercise.
 */
export async function getCachedCategoryBySlug(
  slug: string
): Promise<Category | null> {
  return getCategoryBySlug(slug);
}
