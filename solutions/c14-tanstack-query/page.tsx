// ─── solutions/c14-tanstack-query/page.tsx ────────────────────────────────
//
// REFERENCE SOLUTION — C14 TanStack Query
//
// This is the completed page demonstrating all three TanStack Query patterns:
//   1. useQuery with debounced key + staleTime caching (SearchAsYouType)
//   2. useInfiniteQuery with IntersectionObserver scroll detection (InfiniteList)
//   3. Server prefetch + HydrationBoundary for zero-flash first paint
//
// ── HOW THE SERVER-PREFETCH + HYDRATION FLOW WORKS ───────────────────────
//
// The key insight is that the server and client each have their OWN QueryClient.
//
//  SERVER SIDE (this file, Node process, at request time):
//    1. PrefetchedProductList is an async Server Component inside <Suspense>.
//    2. It calls `await connection()` — required because @/lib/data uses
//       Math.random() which cacheComponents mode refuses to run during prerender.
//    3. A throw-away QueryClient is created (NOT the same one the client uses).
//    4. `prefetchInfiniteQuery` runs the fetcher ON THE SERVER, populates the
//       server QueryClient's in-memory cache with page 1 of products.
//    5. `dehydrate(queryClient)` serialises the cache to a plain JSON object.
//
//  STREAM TO CLIENT:
//    6. The dehydrated JSON is passed as `state` prop to <HydrationBoundary>.
//    7. Next.js includes this JSON in the RSC streaming payload sent to the browser.
//
//  CLIENT SIDE (browser, React hydration):
//    8. QueryProvider (the "use client" wrapper) creates the CLIENT QueryClient.
//    9. HydrationBoundary calls `hydrate(clientQueryClient, dehydratedState)`,
//       injecting the server-fetched page 1 into the CLIENT cache.
//   10. InfiniteList mounts. Its `useInfiniteQuery({ queryKey: ["c14-products"] })`
//       finds page 1 already in cache. Renders IMMEDIATELY — no loading spinner,
//       no network request, no flash.
//   11. After staleTime (30s), the client refetches in the background to stay fresh.
//   12. User scrolls → IntersectionObserver fires → fetchNextPage() → page 2 loads.
//
// ── WHY prefetchInfiniteQuery NOT prefetchQuery ───────────────────────────
//
// TanStack Query stores infinite query data as:
//   { data: { pages: [page1, page2, ...], pageParams: [1, 2, ...] } }
//
// Regular query data is stored as:
//   { data: result }
//
// If you use `prefetchQuery` but `useInfiniteQuery` on the client:
//   - The cache key matches ("c14-products") BUT the VALUE has the wrong shape.
//   - `useInfiniteQuery` expects `data.pages` but finds the plain result.
//   - React Query throws internally or returns undefined — cache MISS.
//   - The client re-fetches. Loading spinner appears. Prefetch wasted.
//
// Always match: prefetchInfiniteQuery ↔ useInfiniteQuery.
//              prefetchQuery         ↔ useQuery.
//
// ── WHY connection() IS REQUIRED ─────────────────────────────────────────
//
// @/lib/data's delay() uses Math.random(). Under cacheComponents: true, the
// Next.js compiler pre-renders every Server Component that doesn't explicitly
// access dynamic data. Non-deterministic calls during pre-render fail:
//   "Error: A non-deterministic call was made outside of a Suspense boundary..."
//
// `connection()` from `next/server` opts the component into per-request
// (dynamic) rendering. Any call AFTER the `await connection()` line runs at
// request time, not build time. Pattern: always call it first, before any
// @/lib/data function in a Server Component that isn't wrapped in 'use cache'.

import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
// Note: the solution imports from the challenge's _lib and _components, not
// from a separate solutions/ _lib. This is intentional — the challenge and
// solution share the same Route Handlers and data layer (no duplication).
import QueryProvider from "../../app/(challenges)/c14-tanstack-query/_components/QueryProvider";
import InfiniteList from "../../app/(challenges)/c14-tanstack-query/_components/InfiniteList";
import SearchAsYouType from "./_components/SearchAsYouType";
import { getProductPage } from "../../app/(challenges)/c14-tanstack-query/_lib/search-route";
import type { ProductPage } from "../../app/(challenges)/c14-tanstack-query/_lib/search-route";

export const metadata: Metadata = {
  title: "C14 — TanStack Query (Reference Solution)",
};

export default function C14SolutionPage() {
  return (
    <QueryProvider>
      <div className="max-w-3xl mx-auto space-y-10 pb-16">
        {/* Static shell header */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-mono text-green-600 mb-1">
            solutions/c14-tanstack-query — REFERENCE SOLUTION
          </p>
          <p className="text-sm text-green-700">
            Compare this with your solution. Focus on the
            server-prefetch + HydrationBoundary flow in{" "}
            <code className="font-mono text-xs bg-green-100 rounded px-1">
              PrefetchedProductList
            </code>.
          </p>
        </div>

        {/* Search-as-you-type with annotated solution component */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
              useQuery
            </span>
            <h2 className="font-semibold text-gray-900">Search As You Type</h2>
          </div>
          {/* Solutions version has extra annotations */}
          <SearchAsYouType showAnnotations />
        </section>

        {/* Infinite scroll with server prefetch */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              useInfiniteQuery
            </span>
            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
              HydrationBoundary
            </span>
            <h2 className="font-semibold text-gray-900">Infinite Product List</h2>
          </div>
          <Suspense fallback={<InfiniteListSkeleton />}>
            <PrefetchedProductList />
          </Suspense>
        </section>
      </div>
    </QueryProvider>
  );
}

// ── Server Component: runs the prefetch ───────────────────────────────────

async function PrefetchedProductList() {
  // Step 1: opt into dynamic rendering before any @/lib/data call.
  await connection();

  // Step 2: create a throw-away server-side QueryClient.
  // This instance is never stored in React state — it exists only to be
  // prefetched and then dehydrated.
  const queryClient = new QueryClient();

  // Step 3: prefetch page 1 using prefetchInfiniteQuery (not prefetchQuery).
  // This matches the cache key structure that useInfiniteQuery expects.
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["c14-products"],
    queryFn: ({ pageParam }) =>
      getProductPage(pageParam as number, 6, undefined),
    initialPageParam: 1,
    // getNextPageParam is required when pages is set.
    getNextPageParam: (lastPage: ProductPage) =>
      (lastPage as { hasNextPage: boolean; page: number }).hasNextPage
        ? (lastPage as { page: number }).page + 1
        : undefined,
    pages: 1, // only prefetch the first page — rest load on demand
  });

  // Step 4: serialise the cache to a plain JSON-safe DehydratedState object.
  const dehydrated = dehydrate(queryClient);

  // Step 5: pass dehydrated state to HydrationBoundary.
  // On the client, HydrationBoundary calls hydrate(clientQueryClient, dehydrated)
  // before any children mount, so useInfiniteQuery already has data in cache.
  return (
    <HydrationBoundary state={dehydrated}>
      <InfiniteList />
    </HydrationBoundary>
  );
}

function InfiniteListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="h-2.5 w-8 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-3 w-full bg-gray-100 rounded animate-pulse mb-1.5" />
          <div className="h-2.5 w-2/3 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
