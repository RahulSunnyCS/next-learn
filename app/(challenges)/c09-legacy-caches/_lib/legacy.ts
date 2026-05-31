// ─── _lib/legacy.ts — C09 data helpers ───────────────────────────────────
//
// This module wraps lib/data for the C09 challenge.
//
// PURPOSE: Show the BEFORE/AFTER migration in one place, with inline comments.
//
// SECTION A (at the bottom of this file) is the LEGACY implementation — the
// way this would have been written in Next.js 14 using `unstable_cache`.  It
// is present as a commented-out example ONLY.  It does NOT run.  It CANNOT
// run in this app because `cacheComponents: true` supersedes unstable_cache
// and implicit fetch caching.  It is here so you can read the before/after
// diff without switching files.
//
// SECTION B is the LIVE, MIGRATED implementation using `'use cache'` +
// `cacheTag()` + `cacheLife()`.  This is what the challenge page uses.
//
// ── Why we have a local _lib instead of importing lib/data directly ──────
// Under cacheComponents: true, lib/data's repository functions call
// simulateNetworkDelay() which uses Math.random() — a non-deterministic call
// that Next.js 16 rejects during static prerendering unless it is inside a
// `'use cache'` boundary or a <Suspense>-wrapped dynamic component.
// This wrapper puts the Math.random()-containing code inside 'use cache',
// satisfying the build.  Other challenges do the same (see c02's _lib/catalog.ts).

import { cacheTag, cacheLife } from "next/cache";
import { listProducts, tags, type Product } from "@/lib/data";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — LIVE (MIGRATED) implementation using 'use cache' (v16 model)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the first 6 products for the "featured" panel.
 *
 * MIGRATION NOTES (compare with the LEGACY block below):
 *
 * OLD approach (Next.js 14, unstable_cache):
 *   const getFeaturedProducts = unstable_cache(
 *     async () => { ... },
 *     ["c09-featured-products"],         ← separate cache key array
 *     { revalidate: 3600, tags: ["products"] }
 *   );
 *
 * NEW approach (Next.js 16, 'use cache'):
 *   async function getCachedFeaturedProducts() {
 *     'use cache';                       ← directive in the function body
 *     cacheTag(tags.products);           ← tag co-located with the code
 *     cacheLife('hours');                ← lifetime co-located with the code
 *     ...
 *   }
 *
 * The observable behaviour is identical: the return value is cached for ~1 hour,
 * tagged "products", and invalidatable with revalidateTag("products").
 * But the intent is now clear at the reading site — no wrapper, no separate key.
 */
export async function getCachedFeaturedProducts(): Promise<Product[]> {
  // 'use cache' marks this function as a Cache Component.  The compiler
  // intercepts calls to this function and returns the stored value when the
  // cache is warm.  Arguments (none here) are automatically included in the
  // cache key by the compiler.
  "use cache";

  // Tag this cache entry so a Server Action can call
  // revalidateTag(tags.products) to purge it immediately (e.g. after an admin
  // updates product data).
  cacheTag(tags.products);

  // Set a ~1-hour stale window.  After expiry the next request gets stale data
  // immediately (stale-while-revalidate) and a background re-run populates the
  // cache.  This reproduces the ISR behaviour of the old `revalidate: 3600`.
  cacheLife("hours");

  // listProducts() calls simulateNetworkDelay() (Math.random()) — that is why
  // this function MUST be inside a 'use cache' boundary, or the static
  // prerender would fail with "non-deterministic value outside cache boundary".
  const result = await listProducts({ pageSize: 6 });
  return result.items;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — LEGACY (COMMENTED OUT) implementation using unstable_cache
//
// This is an accurate representation of how this function would have been
// written in Next.js 13–15.  It is intentionally NOT runnable in this codebase
// (cacheComponents: true disables the implicit caching model).
// Read it to understand the "before" state — compare with SECTION B above.
//
// NOTE: unstable_cache is still importable in Next.js 16 for backward
//       compatibility, but it is superseded by 'use cache' and will eventually
//       be removed.  Do NOT use it in new code.
// ─────────────────────────────────────────────────────────────────────────────

/*
// ── LEGACY (Next.js 14 style) ────────────────────────────────────────────
//
// import { unstable_cache } from "next/cache";
//
// The outer `unstable_cache()` call wraps the async function and stores its
// return value in the DATA CACHE (the server-side persistent cache).
//
// Three arguments:
//   1. The async function to cache.
//   2. Cache key array — an array of strings that uniquely identify this
//      cache entry.  If you have a function that takes arguments, you would
//      include the arguments here manually.
//   3. Options:
//      - revalidate: how many seconds before the cache entry becomes stale.
//        Equivalent to `cacheLife('hours')` in the new model.
//      - tags: an array of cache tags.  Calling revalidateTag("products")
//        busts this entry and (transitively) the Full Route Cache for any
//        route that consumed it.
//
// Problems with this approach:
//   - The cache key (arg 2) is MANUAL.  If getFeaturedProducts took a
//     `limit` argument, you would have to remember to include it:
//     ["c09-featured", String(limit)].  Miss it and you get incorrect cache
//     hits (limit=6 would return the same results as limit=12).
//   - The options (arg 3) are SEPARATE from the function body.  A reader of
//     `getFeaturedProducts` cannot see the cache config without scrolling up
//     to the `unstable_cache` call site.
//   - The `unstable_` prefix signals "not production-ready" — it was never
//     stabilised because the design was superseded.
//
// export const getFeaturedProducts = unstable_cache(
//   async () => {
//     const result = await listProducts({ pageSize: 6 });
//     return result.items;
//   },
//   ["c09-featured-products"],           // ← cache key: manual and error-prone
//   {
//     revalidate: 3600,                  // ← stale window: 1 hour (seconds)
//     tags: ["products"],                // ← invalidation tags
//   }
// );
//
// ── END LEGACY ──────────────────────────────────────────────────────────────
*/
