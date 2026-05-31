// ─── solutions/c08-use-cache/_lib/cached.ts — Reference solution ──────────
//
// This is the COMPLETE reference implementation of _lib/cached.ts for C08.
// It is identical in content to the challenge skeleton (which is not intentionally
// left incomplete in this challenge — the challenge teaches by demonstration, not
// by having a broken starting point to fix).
//
// ─── THREE PLACEMENT LEVELS OF 'use cache' ────────────────────────────────
//
// LEVEL 1 (this file): FILE-LEVEL — 'use cache' as the FIRST LINE of the module.
//   Every async function exported from this module has its return value cached
//   by Next.js Cache Components. No per-function directive is required.
//
// LEVEL 2: FUNCTION-LEVEL — 'use cache' as the FIRST LINE of one function body.
//   Only that function is cached; other exports in the same module are unaffected.
//   See getCachedProductSummary() below — we add the inner directive explicitly
//   to show the syntax, even though the file-level directive already covers it.
//
// LEVEL 3 (see _components/CachedPanel.tsx): COMPONENT-LEVEL — 'use cache' as
//   the first line of an async Server Component body. The RSC payload (the
//   rendered output, not just raw data) is cached.
//
// ─── CACHE COMPONENTS RULES ────────────────────────────────────────────────
// • cacheTag() and cacheLife() MUST be called BEFORE the first `await`.
// • Tag strings come from @/lib/data — never hard-code.
// • No route-segment config exports anywhere.

"use cache";

import { cacheTag, cacheLife } from "next/cache";
import {
  listCategories,
  getProductById,
  tags,
} from "@/lib/data";
import type { Category, Product } from "@/lib/data";

// ---------------------------------------------------------------------------
// A — File-level inheritance: getAllCachedCategories
// ---------------------------------------------------------------------------
//
// LIFETIME: 'days' — category names almost never change. A 24-hour TTL is
// generous. When a new category IS added, a Server Action calls
// revalidateTag(tags.categories) to evict this entry immediately.
//
// NOTE: No inner 'use cache' here — the file-level directive is sufficient.
// cacheTag/cacheLife still need to be called explicitly to annotate the entry.

export async function getAllCachedCategories(): Promise<Category[]> {
  cacheTag(tags.categories);
  cacheLife("days");
  return await listCategories();
}

// ---------------------------------------------------------------------------
// B — Function-level: getCachedProductSummary (explicit inner directive)
// ---------------------------------------------------------------------------
//
// In a module WITHOUT the file-level directive, this is how you opt a single
// function into caching while other exports remain uncached. We include the
// inner directive here to demonstrate the syntax explicitly.
//
// CACHE KEY: derived from the `productId` argument.
//   getCachedProductSummary("p-elec-001") and ("p-elec-002") are two separate
//   cache entries — never collapsed into one.
//
// LIFETIME: 'hours' — product data changes more often than categories.
//   Tag-based invalidation handles immediate updates; the TTL handles edge
//   cases (e.g. a price change that bypassed the Server Action).

export async function getCachedProductSummary(
  productId: string
): Promise<Product | null> {
  "use cache"; // function-level — explicit even though file directive covers it
  cacheTag(tags.product(productId));
  cacheLife("hours");
  return await getProductById(productId);
}

// ---------------------------------------------------------------------------
// C — Multiple tags on one cache entry
// ---------------------------------------------------------------------------
//
// A 'use cache' entry can be tagged with multiple strings. EITHER tag can
// trigger invalidation — useful when the data participates in multiple domains.
//
// Use case: a "featured products" slot that should be evicted both when a
// specific product changes (tags.product) AND when the collection is reshuffled
// (tags.products). Here we use tags.products as a stand-in for a real
// "featured" tag — production code would have a tags.featured constant.

export async function getCachedProductWithCollectionTag(
  productId: string
): Promise<Product | null> {
  "use cache";
  cacheTag(tags.product(productId), tags.products);
  cacheLife("hours");
  return await getProductById(productId);
}
