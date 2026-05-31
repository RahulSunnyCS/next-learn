// ─── solutions/c09-legacy-caches/legacy/page.tsx ─────────────────────────
//
// LEGACY VARIANT — Next.js 14 / v15 style.
//
// THIS IS A DOCUMENTED CODE SAMPLE.  It does NOT run as a live route in this
// app because `cacheComponents: true` in next.config.ts disables the implicit
// caching model this file demonstrates.  It exists purely as a reference to
// show what the four-cache model looked like in practice.
//
// ── What to look for ──────────────────────────────────────────────────────
//
//  Line  32: `export const revalidate = 3600`
//    → Route-segment config.  Sets the stale window for ALL fetches on this
//      route to 3600 seconds (1 hour).  Forbidden in this app (cacheComponents
//      rule 1).  Every data fetch in this route inherits this lifetime.
//
//  Line  67: `unstable_cache(fn, keyArray, options)`
//    → The pre-v16 escape hatch for caching non-fetch data sources.  Stores
//      the function's return value in the DATA CACHE.  The key array is
//      separate from the function body — easy to forget an argument.
//
//  Line  90: `fetch(url, { next: { revalidate, tags } })`
//    → Implicit fetch caching.  In v14 the default is `force-cache`.  Adding
//      `next: { revalidate: 60, tags: ["stock"] }` overrides the route-level
//      `revalidate` for this specific fetch (60s instead of 3600s) and tags
//      the Data Cache entry so `revalidateTag("stock")` can bust it.
//
// ── Which caches are in play ──────────────────────────────────────────────
//
//  REQUEST MEMOIZATION: de-dupes the `getPriceData` fetch if two components
//    on the same page call it with the same URL within one render.
//
//  DATA CACHE: stores `getFeaturedProducts` (via unstable_cache) and the
//    `fetch(priceUrl)` response.  Persists across requests.
//
//  FULL ROUTE CACHE: Next.js pre-renders this route at build time (because
//    there is no per-request dynamic data) and caches the HTML + RSC payload.
//    Invalidated when the Data Cache entries it consumed are busted.
//
//  ROUTER CACHE: when the user navigates back to this page, the browser
//    serves the RSC payload from its in-memory store (TTL ~5min for static
//    routes in v14) without making a new server request.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// See solutions/c09-legacy-caches/migrated/page.tsx for the v16 equivalent.
// See solutions/c09-legacy-caches/migration-notes.md for the full comparison.
//
// ─────────────────────────────────────────────────────────────────────────────

// LEGACY: route-level ISR setting.  All fetches on this route are stale-while-
// revalidate on a 1-hour window — unless individually overridden.
// Forbidden in this app; shown here as a documentation sample.
//
//   export const revalidate = 3600;
//
// (Commented out so the file is valid TypeScript and the build does not fail
// when this file is compiled as part of the overall project.  Leaving it
// uncommented would produce a Next.js build error: "Route segment config
// 'revalidate' is not compatible with cacheComponents".)

// LEGACY: unstable_cache import.  In v16 this is replaced by 'use cache'.
//
//   import { unstable_cache, revalidateTag } from "next/cache";
//
// We import nothing from "next/cache" here because this file does not contain
// live executable code — the functions below are shown as commented examples.

// ─── Types (mirrors the real lib/data types for the example) ─────────────

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  rating: number;
};

// ─── LEGACY: unstable_cache-wrapped data accessor ────────────────────────
//
// In a real v14 project this would be the live implementation.  The pattern:
//
//   const getFeaturedProducts = unstable_cache(
//     async (): Promise<Product[]> => {
//       // ANY async function — database query, ORM call, SDK call, etc.
//       // This is NOT a fetch() — that is why unstable_cache is needed.
//       // (In v14, only fetch() calls participate in the Data Cache
//       //  automatically; all other async sources need unstable_cache.)
//       const result = await db.query("SELECT * FROM products LIMIT 6");
//       return result.rows;
//     },
//     ["featured-products"],      // ← cache key: a MANUAL array of strings.
//                                  //   If the function took args, you would
//                                  //   include them here: ["featured", String(limit)].
//                                  //   Forgetting an arg = incorrect cache hits.
//     {
//       revalidate: 3600,         // ← override the route-level revalidate
//                                  //   for this specific cache entry (optional).
//       tags: ["products"],       // ← invalidation tags: calling
//                                  //   revalidateTag("products") busts this
//                                  //   Data Cache entry and transitively marks
//                                  //   the Full Route Cache stale.
//     }
//   );
//
// Compare with the v16 equivalent in migrated/page.tsx:
//   async function getFeaturedProducts(): Promise<Product[]> {
//     'use cache';
//     cacheTag(tags.products);
//     cacheLife('hours');
//     // ... same body
//   }
//
// The observable behaviour is IDENTICAL. The implementation is cleaner.

// ─── LEGACY: implicit fetch caching ──────────────────────────────────────
//
// In v14, fetch() inside a Server Component defaults to force-cache.
// This means the response is stored in the Data Cache indefinitely unless
// you override it.  Two override patterns:
//
//   Pattern A — time-based revalidation:
//
//   async function getPriceData(productId: string) {
//     const res = await fetch(
//       `https://api.example.com/prices/${productId}`,
//       {
//         next: {
//           revalidate: 60,         // ← stale window: 60 seconds
//           tags: [`price:${productId}`], // ← fine-grained invalidation tag
//         },
//       }
//     );
//     return res.json();
//   }
//
//   Pattern B — opt out of caching entirely (always fresh):
//
//   async function getLiveStockLevel(productId: string) {
//     const res = await fetch(
//       `https://api.example.com/stock/${productId}`,
//       {
//         cache: "no-store",        // ← bypass Data Cache; always hit the network
//       }
//     );
//     return res.json();
//   }
//
// In v16 with cacheComponents: true, NEITHER of these patterns work —
// fetch() is uncached by default and there is no `cache` or `next` option
// that interacts with the Cache Components store.  You use 'use cache' + the
// same fetch call (or any other data source) instead.

// ─── LEGACY: page component ──────────────────────────────────────────────
//
// In v14, a page that uses `export const revalidate` is statically generated
// at build time.  The Full Route Cache stores the pre-rendered HTML.
// There is no `<Suspense>` required — the whole page is one static HTML file.
//
// export default async function LegacyFeaturedPage() {
//   // getFeaturedProducts is the unstable_cache-wrapped function above.
//   // On first render: hits the underlying data source, stores result in
//   //   Data Cache, renders the page, stores HTML in Full Route Cache.
//   // On subsequent renders (within 1 hour): returns from Data Cache, Full
//   //   Route Cache serves the pre-rendered HTML directly.
//   const products = await getFeaturedProducts();
//
//   return (
//     <main>
//       <h1>Featured Products</h1>
//       {products.map((p) => (
//         <div key={p.id}>
//           <p>{p.name}</p>
//           <p>${p.price.toFixed(2)}</p>
//         </div>
//       ))}
//     </main>
//   );
// }
//
// KEY DIFFERENCE FROM v16:
//   This component is async and reads data at the top level — it blocks the
//   entire page render until data is fetched.  No Suspense needed because the
//   whole page either comes from the Full Route Cache (instant) or is rendered
//   server-side and streamed (no partial prerender concept without PPR).
//
//   In v16, every async data read must be inside <Suspense>.  The static shell
//   prerenders immediately; the data streams in as a separate chunk.

// ─── LEGACY: Server Action for cache invalidation ─────────────────────────
//
// In both v14 and v16, you invalidate the Data Cache from a Server Action
// after a mutation.  The API is unchanged:
//
//   "use server";
//   import { revalidateTag } from "next/cache";
//
//   export async function updateProductAction(productId: string, data: ...) {
//     // ... save to database
//     revalidateTag("products");            // bust the collection cache
//     revalidateTag(`product:${productId}`); // bust the entity cache
//   }
//
// After revalidateTag:
//   1. Data Cache entry marked stale.
//   2. Full Route Cache entry for any route that consumed those tags: stale.
//   3. Next request to that route: re-renders, re-populates both caches.
//   4. Router Cache in the browser: NOT automatically busted.
//      The browser still holds its RSC payload until TTL expires (~30s for
//      dynamic routes, ~5min for static) or router.refresh() is called.

// ─── Placeholder export (makes this a valid TypeScript module) ────────────
//
// This file is compiled as part of the project but is NOT a live route.
// The export below prevents TypeScript from complaining about an empty module.
// In a real v14 project, this would be the `export default` page component.

export const legacyPageDocumentation: { version: string; caches: string[] } = {
  version: "Next.js 14 / v15",
  caches: [
    "Request Memoization",
    "Data Cache",
    "Full Route Cache",
    "Router Cache",
  ],
};
