// ─── catalog.ts — local data helper for the optimizations lab ─────────────
//
// Design rule: this file is the ONLY entry point for data reads in this
// challenge.  It wraps lib/data functions with 'use cache' so all data
// reads happen through cached server functions — they must never be called
// directly at route top level outside <Suspense> (Cache Components rule).
//
// We keep a thin local wrapper instead of importing lib/data directly in the
// page to:
//   (a) demonstrate the 'use cache' pattern in isolation.
//   (b) let the page stay a static shell — it imports only this module, not
//       any async data function.

"use cache";

import { listProducts, listCategories } from "@/lib/data";
import { cacheLife } from "next/cache";

/** Return a small slice of products for the prefetch/Link demo section. */
export async function getFeaturedProducts() {
  // Mark this cache entry with a moderate TTL — revalidates after an hour.
  // This is appropriate for catalog data that changes infrequently.
  cacheLife("hours");

  const result = await listProducts({ pageSize: 4, sort: "rating-desc" });
  return result.items;
}

/** Return category list for the code-splitting demo's navigation example. */
export async function getCategories() {
  cacheLife("hours");
  return listCategories();
}
