// ─── _lib/cached.ts — C08 'use cache' demo: FILE-LEVEL + FUNCTION-LEVEL ──────
//
// This module demonstrates TWO of the three 'use cache' placement levels:
//
//   Level 1 — FILE-LEVEL (this file): 'use cache' as the first line of the
//   module means EVERY exported async function in this file has its return
//   value cached by Next.js. You do not need to repeat 'use cache' inside each
//   function — the module-level directive applies to all.
//
//   Level 2 — FUNCTION-LEVEL: see getCachedProductSummary() below. Even though
//   the file directive would cover it, we add an inner 'use cache' to show what
//   that looks like explicitly. In a mixed-cache module (where only SOME
//   functions should be cached) you would use function-level only, without the
//   file-level directive.
//
// WHY FILE-LEVEL HERE?
//   This module is a pure "cached data layer" — every export is a lookup helper
//   that should share the same caching discipline. File-level is appropriate
//   when all exports have similar cache policies and there is no reason to leave
//   any function uncached. If you ever add a mutation helper to this file,
//   prefer function-level only.
//
// ─── CACHE COMPONENTS RULES ───────────────────────────────────────────────
// • cacheTag() and cacheLife() MUST be called before the first `await` inside
//   any 'use cache' boundary — Next.js reads them synchronously at entry creation.
// • Tag constants come from @/lib/data (never hard-code tag strings here).
// • No route-segment config exports (dynamic/revalidate) anywhere.

"use cache";

import { cacheTag, cacheLife } from "next/cache";
import {
  listCategories,
  getProductById,
  tags,
} from "@/lib/data";
import type { Category, Product } from "@/lib/data";

// ---------------------------------------------------------------------------
// Example A — File-level 'use cache' in action
// ---------------------------------------------------------------------------
//
// This function does NOT have its own 'use cache' directive — it inherits the
// file-level one. The cache entry is keyed on the function's arguments (none
// here, so all callers share one slot) and tagged + lifetimed below.
//
// LIFETIME CHOICE: 'days' — category names rarely change. A 24-hour window is
// acceptable even without explicit revalidation. If a new category is added,
// call `revalidateTag(tags.categories)` from the Server Action that creates it.

export async function getAllCachedCategories(): Promise<Category[]> {
  // Call cacheTag and cacheLife BEFORE any await. Next.js reads these to
  // annotate the cache entry; calling them after an await is a bug.
  cacheTag(tags.categories);
  cacheLife("days");
  return await listCategories();
}

// ---------------------------------------------------------------------------
// Example B — Function-level 'use cache' (explicit inner directive)
// ---------------------------------------------------------------------------
//
// Here we add 'use cache' explicitly inside the function body. In a file
// WITHOUT the module-level directive, this is how you opt a single function
// in while leaving others uncached. In this file, the module directive already
// covers it — we add it here to show the function-level syntax explicitly.
//
// CACHE KEY: the `productId` argument. Calling this with "p-elec-001" and
// "p-home-003" produces two separate cache entries — not one.
//
// LIFETIME CHOICE: 'hours' — product data (name, price) changes more often
// than categories but still not per-request. An hour TTL plus tag-based
// invalidation (`revalidateTag(tags.product(productId))`) covers most update
// scenarios.

export async function getCachedProductSummary(
  productId: string
): Promise<Product | null> {
  "use cache"; // function-level: explicit, even though file directive covers us
  // Annotate before any await — order is meaningful here.
  cacheTag(tags.product(productId));
  cacheLife("hours");
  return await getProductById(productId);
}

// ---------------------------------------------------------------------------
// Example C — Multiple tags on one cache entry
// ---------------------------------------------------------------------------
//
// A cache entry can have MORE than one tag. This is useful when the data
// participates in two invalidation domains: e.g. a "featured products" list
// that should be invalidated both when any product changes AND when the
// featured-products collection is updated.
//
// Here we tag with BOTH the specific product tag AND the collection tag
// `tags.products` so that either a product-specific update or a collection-
// level reshuffle will evict this entry.
//
// NOTE: In production you would use a real "featured" tag. We reuse
// tags.products here for demo simplicity.

export async function getCachedProductWithCollectionTag(
  productId: string
): Promise<Product | null> {
  "use cache";
  // Multiple tags: either revalidateTag call will evict this entry.
  cacheTag(tags.product(productId), tags.products);
  cacheLife("hours");
  return await getProductById(productId);
}
