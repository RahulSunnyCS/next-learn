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
 * CHALLENGE SKELETON — currently missing proper ISR caching.  Your task:
 *
 *   1. Replace the existing 'use cache' below with the full ISR setup:
 *      add cacheTag(tags.products) and cacheLife('hours') after 'use cache'.
 *
 * The bare 'use cache' is present only so the build compiles (lib/data uses
 * Math.random() in its delay, which Next.js 16 rejects during prerender
 * outside a cache boundary).  Without cacheTag + cacheLife, the data is
 * cached but NOT ISR-tagged or time-bounded — the challenge is incomplete.
 *
 * @param opts  Same options as lib/data listProducts (categoryId, sort, etc.)
 */
export async function listCachedProducts(
  opts: ListProductsOptions = {}
): Promise<PaginatedResult<Product>> {
  // STARTER: bare 'use cache' makes the build pass (prevents Math.random()
  // rejection during prerender), but the ISR story is incomplete until you
  // add cacheTag(tags.products) and cacheLife('hours') on the lines below.
  "use cache";
  // TODO (challenge): add these two lines here to complete the ISR setup:
  //   cacheTag(tags.products);
  //   cacheLife('hours');

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
 * CHALLENGE SKELETON — same structure as listCachedProducts.  Your task:
 * replace the bare 'use cache' with the full ISR setup:
 *   cacheTag(tags.categories)
 *   cacheLife('hours')
 *
 * Bare 'use cache' present for the same reason as listCachedProducts — the
 * build must not fail before learners reach this exercise.
 */
export async function listCachedCategories(): Promise<Category[]> {
  // STARTER: bare 'use cache' — build passes, ISR is incomplete.
  "use cache";
  // TODO (challenge): add these two lines to complete the ISR setup:
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
 * Used by the [slug]/page.tsx, generateStaticParams, and generateMetadata.
 *
 * 'use cache' is required here: lib/data's getCategoryBySlug calls
 * simulateNetworkDelay which uses Math.random().  Next.js 16 rejects
 * Math.random() during static prerendering outside a cache boundary.
 * This is NOT the ISR challenge — it is build scaffolding.  cacheTag and
 * cacheLife are deliberately omitted (no time-based revalidation is needed
 * for a per-slug build-time lookup).
 */
export async function getCachedCategoryBySlug(
  slug: string
): Promise<Category | null> {
  "use cache";
  return getCategoryBySlug(slug);
}
