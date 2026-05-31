// ─── solutions/c09-legacy-caches/migrated/page.tsx ───────────────────────
//
// MIGRATED VARIANT — Next.js 16, Cache Components model.
//
// This is the v16 equivalent of solutions/c09-legacy-caches/legacy/page.tsx.
// The user-visible output is IDENTICAL.  The implementation is fundamentally
// different.  Read the two files side-by-side to understand the migration.
//
// ── Summary of changes ───────────────────────────────────────────────────
//
//  REMOVED:
//    export const revalidate = 3600
//      → Replaced by cacheLife('hours') inside each 'use cache' function.
//        Forbidden in this app (cacheComponents rule 1).
//
//    unstable_cache(fn, keyArray, options)
//      → Replaced by the 'use cache' directive inside the function body.
//        unstable_cache is still importable but superseded; use 'use cache'.
//
//    fetch(url, { next: { revalidate, tags } })
//      → In v16, fetch is uncached by default.  Wrap the surrounding function
//        in 'use cache' + cacheTag + cacheLife.  The fetch() call inside is
//        unchanged; the caching is at the function boundary, not the fetch call.
//
//    async page component + top-level await
//      → The page is now a NON-async static shell.  Data reads are in child
//        async components wrapped in <Suspense>.
//
//  ADDED:
//    'use cache' directive inside getCachedFeaturedProducts()
//    cacheTag(tags.products) inside getCachedFeaturedProducts()
//    cacheLife('hours') inside getCachedFeaturedProducts()
//    <Suspense fallback={...}> wrapper around the dynamic hole
//    Static shell pattern (page is non-async, no top-level data reads)
//
// ── Which caches are in play (v16) ───────────────────────────────────────
//
//  DATA CACHE: getCachedFeaturedProducts() stores its return value here.
//    Tagged "products". Stale window: ~1 hour (cacheLife('hours')).
//    Busted by revalidateTag(tags.products).  Same as before.
//
//  FULL ROUTE CACHE / PPR:
//    The static shell of this page can be pre-rendered at build time.
//    The FeaturedProducts component streams in separately (Partial Prerendering).
//    In the legacy model, the WHOLE page was in the Full Route Cache.
//    In v16, only the static shell is in the Full Route Cache; the Suspense
//    holes are hydrated at request time.
//
//  ROUTER CACHE: unchanged — still browser-side, same TTL mechanics.
//
//  REQUEST MEMOIZATION: present but less visible — if two components on the
//    same page call getCachedFeaturedProducts() (same args → same cache key),
//    React deduplicates the calls within one render.
//
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense } from "react";
import { cacheTag, cacheLife } from "next/cache";
import { listProducts, tags, type Product } from "@/lib/data";

// ─── Migrated data accessor ───────────────────────────────────────────────
//
// BEFORE (v14, unstable_cache):
//
//   const getFeaturedProducts = unstable_cache(
//     async () => {
//       const result = await listProducts({ pageSize: 6 });
//       return result.items;
//     },
//     ["featured-products"],          // ← MANUAL key: easily wrong
//     { revalidate: 3600, tags: ["products"] }
//   );
//
// AFTER (v16, 'use cache'):
//
//   async function getCachedFeaturedProducts() {
//     'use cache';                    // ← intent is clear at the reading site
//     cacheTag(tags.products);        // ← co-located with the code it affects
//     cacheLife('hours');             // ← co-located with the code it affects
//     const result = await listProducts({ pageSize: 6 });
//     return result.items;
//   }
//
// The compiler automatically derives the cache key from the function name +
// module path + arguments (none here).  No manual key array needed.

async function getCachedFeaturedProducts(): Promise<Product[]> {
  // Cache Components directive: marks this function's return value as cacheable.
  // On subsequent calls with the same arguments, the stored value is returned
  // without executing the function body again.
  "use cache";

  // Tag this cache entry.  A Server Action can call revalidateTag(tags.products)
  // to purge it immediately after a product update (same as in v14).
  cacheTag(tags.products);

  // Set the stale window to ~1 hour.  After expiry, the next request receives
  // stale data immediately (stale-while-revalidate), and a background re-run
  // refreshes the cache.  Equivalent to `revalidate: 3600` in the legacy model.
  cacheLife("hours");

  // listProducts() calls simulateNetworkDelay() (Math.random()).
  // The 'use cache' boundary prevents the build from rejecting this
  // non-deterministic call during static prerender.
  const result = await listProducts({ pageSize: 6 });
  return result.items;
}

// ─── Migrated page component ──────────────────────────────────────────────
//
// BEFORE (v14): async page, top-level await, no Suspense:
//
//   export default async function LegacyFeaturedPage() {
//     const products = await getFeaturedProducts(); // blocks whole page
//     return <main>...</main>;
//   }
//
// AFTER (v16): non-async static shell + Suspense-wrapped dynamic hole:
//
//   export default function MigratedFeaturedPage() {
//     return (
//       <main>
//         <h1>Static shell — prerenders immediately</h1>
//         <Suspense fallback={<Skeleton />}>
//           <FeaturedProducts />  ← async, streams in
//         </Suspense>
//       </main>
//     );
//   }
//
// WHY NO `export const revalidate`:
//   In v16, the cache lifetime is set INSIDE the data function (cacheLife),
//   not at the route level.  export const revalidate is disallowed by
//   cacheComponents (docs/cache-components-rules.md rule 1).
//
// WHY <Suspense> REQUIRED:
//   Under cacheComponents: true, any async data read — even one wrapped in
//   'use cache' — must be inside a <Suspense> boundary.  Reading async data
//   at the route's top level fails the build:
//   "Uncached data was accessed outside of <Suspense>".
//   See docs/cache-components-rules.md rule 2.

export default function MigratedFeaturedPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Static shell — prerenders at build time, no data needed */}
      <h1 className="text-2xl font-bold text-gray-900">Featured Products</h1>
      <p className="text-sm text-gray-600">
        Cached via{" "}
        <code className="font-mono text-xs bg-gray-100 rounded px-1">
          &apos;use cache&apos;
        </code>{" "}
        +{" "}
        <code className="font-mono text-xs bg-gray-100 rounded px-1">
          cacheTag(tags.products)
        </code>{" "}
        +{" "}
        <code className="font-mono text-xs bg-gray-100 rounded px-1">
          cacheLife(&apos;hours&apos;)
        </code>
        . This is the migrated equivalent of the legacy{" "}
        <code className="font-mono text-xs bg-gray-100 rounded px-1">
          unstable_cache
        </code>{" "}
        pattern.
      </p>

      {/* Dynamic hole — streams in once getCachedFeaturedProducts() resolves */}
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>
    </main>
  );
}

// ─── Dynamic hole component ───────────────────────────────────────────────

async function FeaturedProducts() {
  // getCachedFeaturedProducts() is a 'use cache' function — it is safe to
  // await here inside Suspense.  The cache ensures fast resolution after the
  // first render.
  const products = await getCachedFeaturedProducts();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-1"
        >
          <p className="font-medium text-sm text-gray-900">{product.name}</p>
          <p className="text-xs text-gray-500">${product.price.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}

function FeaturedProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 h-16 animate-pulse"
        />
      ))}
    </div>
  );
}
