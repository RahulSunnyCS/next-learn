// ─── solutions/c03-product-ppr/[slug]/page.tsx ────────────────────────────
//
// REFERENCE SOLUTION — C03 Product Detail: PPR + Streaming SSR
//
// This is the canonical complete implementation. Read it AFTER filling in
// your defend-it.md worksheet. Compare it against your implementation to
// see what you got right, what you missed, and why.
//
// NOTE: This file is standalone documentation. The imports below are
// illustrative comments — not real import statements. The working implementation
// lives in app/(challenges)/c03-product-ppr/[slug]/page.tsx and its siblings.
//
// READING GUIDE
// ─────────────
// 1. Data layer    → app/(challenges)/c03-product-ppr/_lib/product.ts
//                    (what is cached and why — 'use cache', cacheTag, cacheLife)
// 2. Static shell  → app/(challenges)/c03-product-ppr/_components/ProductShell.tsx
//                    (prerendered at build time, uses only cached data)
// 3. Dynamic holes → app/(challenges)/c03-product-ppr/_components/
//                    {LiveInventory, Recommendations, Reviews}.tsx
//                    (uncached, each runs per-request, each in its own <Suspense>)
// 4. Error boundary→ app/(challenges)/c03-product-ppr/[slug]/error.tsx
//                    (what it catches vs what it doesn't — the after-flush rule)
// 5. Route loading → app/(challenges)/c03-product-ppr/[slug]/loading.tsx
//                    (route-level Suspense vs granular Suspense — why both exist)
// 6. This file     → how the pieces compose into a ◐ PPR page

// ---------------------------------------------------------------------------
// Data layer pattern (see _lib/product.ts)
// ---------------------------------------------------------------------------
//
//   // CACHED — safe to call at page top level:
//   async function getProductShellData(slug: string) {
//     "use cache";
//     cacheTag(tags.product(slug));  // tag: "product:<slug>"
//     cacheLife("hours");            // TTL: revalidate once per hour
//     return getProductBySlug(slug); // calls lib/data repository
//   }
//
//   // UNCACHED — must be inside <Suspense>:
//   getProductBySlug(slug);     // LiveInventory uses this directly
//   listProducts({ categoryId }); // Recommendations uses this directly
//   listReviews(productId);       // Reviews uses this directly

// ---------------------------------------------------------------------------
// Page structure pattern
// ---------------------------------------------------------------------------
//
// export default async function Page({ params }) {
//   const { slug } = await params;              // await params — Next.js 16 rule
//   const product = await getProductShellData(slug); // CACHED read at top level
//
//   if (!product) return <ProductNotFound slug={slug} />;
//
//   return (
//     <div>
//       {/* STATIC SHELL — prerendered, arrives in first byte */}
//       <ProductShell product={product} />
//
//       {/* DYNAMIC HOLE #1 — uncached, streams in independently */}
//       <Suspense fallback={<LiveInventorySkeleton />}>
//         <LiveInventory slug={slug} />
//       </Suspense>
//
//       {/* DYNAMIC HOLE #2 — uncached, concurrent with hole #1 */}
//       <Suspense fallback={<RecommendationsSkeleton />}>
//         <Recommendations currentSlug={slug} categoryId={product.categoryId} />
//       </Suspense>
//
//       {/* DYNAMIC HOLE #3 — uncached, concurrent with holes #1 and #2 */}
//       <Suspense fallback={<ReviewsSkeleton />}>
//         <Reviews productId={product.id} />
//       </Suspense>
//
//       {/* ERROR DEMO — throws after shell flush, caught by internal try-catch */}
//       <Suspense fallback={<ErrorDemoSkeleton />}>
//         <StreamErrorDemo />
//       </Suspense>
//     </div>
//   );
// }

// ---------------------------------------------------------------------------
// Key rules enforced by cacheComponents: true
// ---------------------------------------------------------------------------
//
//   1. NO `export const dynamic` — disallowed, build rejects it.
//   2. Uncached reads only INSIDE <Suspense> — or build fails.
//   3. 'use cache' + cacheTag() + cacheLife() — the opt-in pattern.
//   4. await params / await searchParams / await cookies() — all Promises in v16.
//
// ---------------------------------------------------------------------------
// The error-after-flush gotcha
// ---------------------------------------------------------------------------
//
//   Once the shell HTML is flushed (HTTP 200 + first bytes sent), errors
//   thrown inside Suspense holes:
//     - Cannot change the HTTP status (still 200).
//     - Cannot reach error.tsx (already past the flush point).
//     - Must be handled inside the async component with try-catch.
//
//   error.tsx ONLY catches errors thrown during the initial SYNCHRONOUS render
//   of the shell — BEFORE any HTTP byte is sent.
//
//   StreamErrorDemo demonstrates this by:
//     1. Awaiting 60ms (simulating async work, ensuring flush has happened).
//     2. Throwing intentionally.
//     3. Catching its own error in a try-catch and returning an error fallback.
//     4. The HTTP response remains 200. error.tsx is never invoked.
//
// ---------------------------------------------------------------------------
// loading.tsx vs manual <Suspense> — summary
// ---------------------------------------------------------------------------
//
//   loading.tsx:
//     - Wraps the ENTIRE page segment (coarse).
//     - Shown during client-side navigation before the segment is ready.
//     - Good: prevents a blank page during navigation transitions.
//     - Bad: replaces everything; the user sees nothing of the page until
//       the whole segment renders.
//
//   Manual <Suspense fallback={<Skeleton/>}>:
//     - Wraps ONE async component (granular).
//     - Multiple boundaries resolve CONCURRENTLY.
//     - The static shell is always visible; only the holes show skeletons.
//     - This is the PPR model — use manual Suspense for fine-grained streaming.
//
// ---------------------------------------------------------------------------
// Build output — what ◐ means
// ---------------------------------------------------------------------------
//
//   ◐  /c03-product-ppr/[slug]   (Partial Prerender)
//
//   ◐ = static shell prerendered at build (or on first request, then cached)
//       + dynamic holes run per-request and stream in
//
//   ○ = fully static (SSG — no per-request work)
//   ƒ = fully dynamic (SSR — all work per-request, no prerendered shell)

export {};
