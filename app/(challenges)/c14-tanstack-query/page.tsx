// ─── app/(challenges)/c14-tanstack-query/page.tsx ─────────────────────────
//
// C14 — TanStack Query challenge page.
//
// ── CACHE COMPONENTS PATTERN ──────────────────────────────────────────────
// This page follows the same static-shell + <Suspense> pattern as c01-auth:
//
//   - The page itself is a STATIC SHELL: no dynamic reads at the top level.
//   - The server-prefetch + HydrationBoundary work is inside <Suspense> so the
//     (tiny, sub-100ms) prefetch latency does not block the static shell.
//   - NO route-segment config exports (dynamic/revalidate/runtime) — those are
//     incompatible with cacheComponents: true.
//
// ── SERVER PREFETCH + HYDRATION FLOW ──────────────────────────────────────
// 1. PrefetchedProductList (Server Component, inside <Suspense>) creates a
//    THROW-AWAY server-side QueryClient.
// 2. It calls await queryClient.prefetchQuery({ queryKey: ["c14-products"] })
//    which runs the fetcher on the server and populates the server QueryClient's
//    cache with page 1 of products.
// 3. dehydrate(queryClient) serialises the cache entries to a plain JSON-safe
//    object (DehydratedState).
// 4. That state is passed as a prop to <HydrationBoundary state={dehydrated}>.
// 5. On the CLIENT, when InfiniteList mounts, its useInfiniteQuery with key
//    ["c14-products"] finds page 1 ALREADY in the cache (hydrated from the
//    server). It renders immediately with data — no loading spinner, no flash.
// 6. After staleTime (30s) passes, a background refetch fires to keep data fresh.
//
// WHY NOT prefetchInfiniteQuery for a paginated list?
//    We use prefetchInfiniteQuery (not prefetchQuery) because the client uses
//    useInfiniteQuery. The key structure for infinite queries differs from
//    regular queries internally — using the wrong prefetch method would cause
//    a cache MISS on the client (the client key would not match the server key).
//
// ── WHY connection() BEFORE DATA READS ────────────────────────────────────
// @/lib/data uses Math.random() for simulated latency. In cacheComponents mode,
// non-deterministic calls during prerender fail UNLESS they run after a dynamic
// signal. connection() (from next/server) is that signal — it tells the framework
// "everything after this point is dynamic (per-request), not prerendered".

import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import QueryProvider from "./_components/QueryProvider";
import SearchAsYouType from "./_components/SearchAsYouType";
import InfiniteList from "./_components/InfiniteList";
import type { ProductPage } from "./_lib/search-route";
import { getProductPage } from "./_lib/search-route";

export const metadata: Metadata = {
  title: "C14 — TanStack Query",
};

export default function C14TanStackQueryPage() {
  return (
    <QueryProvider>
      <div className="max-w-3xl mx-auto space-y-10 pb-16">
        {/* ── STATIC SHELL: page header ── */}
        <div>
          <p className="text-xs font-mono text-indigo-500 mb-1">c14-tanstack-query</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            TanStack Query: Client Data Management
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            This challenge teaches when to reach for TanStack Query over RSC
            server fetch or{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">
              &apos;use cache&apos;
            </code>
            , and how to use{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">
              useQuery
            </code>
            ,{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">
              useInfiniteQuery
            </code>
            , and the server-prefetch +{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">
              HydrationBoundary
            </code>{" "}
            pattern.
          </p>
        </div>

        {/* ── SECTION 1: Search-as-you-type (useQuery + debounce) ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
              useQuery
            </span>
            <h2 className="font-semibold text-gray-900">Search As You Type</h2>
          </div>
          <p className="text-xs text-gray-500">
            Debounced query key, request deduplication, and{" "}
            <code className="font-mono bg-gray-100 rounded px-1">staleTime</code>{" "}
            caching. Open DevTools → Network to observe.
          </p>
          {/* SearchAsYouType is purely client-driven: no server prefetch needed.
              It is fine to render without Suspense because the initial render
              shows an empty input with no data (no server reads here). */}
          <SearchAsYouType />
        </section>

        {/* ── SECTION 2: Infinite scroll (useInfiniteQuery + HydrationBoundary) ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              useInfiniteQuery
            </span>
            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
              HydrationBoundary
            </span>
            <h2 className="font-semibold text-gray-900">Infinite Product List</h2>
          </div>
          <p className="text-xs text-gray-500">
            Server-prefetched page 1 (no loading flash on first paint). Scrolling
            down triggers <code className="font-mono bg-gray-100 rounded px-1">fetchNextPage()</code>{" "}
            via IntersectionObserver.
          </p>

          {/* PrefetchedProductList runs the server-side prefetch inside Suspense.
              The skeleton below shows while the server prefetch resolves (~50-120ms).
              After hydration, InfiniteList renders immediately with prefetched data. */}
          <Suspense fallback={<InfiniteListSkeleton />}>
            <PrefetchedProductList />
          </Suspense>
        </section>

        {/* ── STATIC SHELL: Defend-it reminder ── */}
        <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">Before you read the reference solution:</p>
          <p>
            Fill in{" "}
            <code className="font-mono text-xs bg-amber-100 rounded px-1">
              app/(challenges)/c14-tanstack-query/_meta/defend-it.md
            </code>{" "}
            with your own answers, then open{" "}
            <code className="font-mono text-xs bg-amber-100 rounded px-1">
              solutions/c14-tanstack-query/
            </code>
            .
          </p>
        </section>
      </div>
    </QueryProvider>
  );
}

// ─── DYNAMIC HOLE: Server prefetch + HydrationBoundary ────────────────────
//
// This is a Server Component (no "use client"). It:
//   1. Calls connection() to opt into dynamic rendering (required before any
//      call to @/lib/data due to Math.random() non-determinism in cacheComponents).
//   2. Creates a server-side QueryClient (throw-away — not stored anywhere).
//   3. Prefetches page 1 of products using prefetchInfiniteQuery so the cache
//      key structure matches what useInfiniteQuery expects on the client.
//   4. Dehydrates the cache to a plain object.
//   5. Passes the dehydrated state to <HydrationBoundary> which rehydrates it
//      into the client QueryClient created by QueryProvider.
//
// The InfiniteList child component mounts and immediately finds page 1 in
// cache — zero loading flash for the first paint.
async function PrefetchedProductList() {
  // Opt into dynamic rendering before any @/lib/data call.
  // Required because listProducts() uses Math.random() — a non-deterministic
  // call that cacheComponents mode refuses to prerender without a dynamic signal.
  await connection();

  // Server-side QueryClient: throw-away, never stored in React state.
  // Its sole purpose is to be prefetched and then dehydrated.
  const queryClient = new QueryClient();

  // prefetchInfiniteQuery mirrors what the client's useInfiniteQuery will do.
  // Using prefetchQuery (for regular queries) here would produce a cache key
  // mismatch and result in a loading flash — the client would not find the data.
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["c14-products"],
    queryFn: ({ pageParam }) =>
      getProductPage(pageParam as number, 6, undefined),
    initialPageParam: 1,
    // Only prefetch the first page — the rest load on demand as the user scrolls.
    pages: 1,
  });

  // Serialise the cache to a JSON-safe DehydratedState object.
  // This is passed to HydrationBoundary as a prop and streamed to the client
  // as part of the RSC payload.
  const dehydrated = dehydrate(queryClient);

  return (
    // HydrationBoundary rehydrates `dehydrated` into the nearest QueryClient
    // in context (provided by QueryProvider above). After this runs on the
    // client, the InfiniteList's useInfiniteQuery finds page 1 already cached.
    <HydrationBoundary state={dehydrated}>
      <InfiniteList />
    </HydrationBoundary>
  );
}

// ── Skeleton shown while PrefetchedProductList resolves server-side ────────
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
