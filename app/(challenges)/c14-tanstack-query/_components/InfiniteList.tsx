"use client";
// ─── app/(challenges)/c14-tanstack-query/_components/InfiniteList.tsx ─────
//
// Teaches: useInfiniteQuery + scroll-triggered pagination + getNextPageParam
//
// KEY CONCEPTS SHOWN HERE:
//
// 1. useInfiniteQuery vs. useQuery:
//    - useQuery fetches a single result set.
//    - useInfiniteQuery manages a LIST of pages. Each "fetch more" call appends
//      a new page to data.pages without replacing the previous pages.
//    - The result is data.pages: Page[] — all loaded pages, in order.
//
// 2. getNextPageParam:
//    A function that extracts the param for the NEXT page from the LAST loaded
//    page. Returns undefined when there is no more data (hasNextPage = false).
//    Here we return lastPage.page + 1 if hasNextPage, else undefined.
//
// 3. initialPageParam:
//    TanStack Query v5 requires you to explicitly declare the first page param.
//    We use page 1 (the API is 1-based).
//
// 4. Scroll detection:
//    A sentinel <div> at the bottom of the list is observed with
//    IntersectionObserver. When it enters the viewport, fetchNextPage() is
//    called. This is the most efficient infinite scroll pattern — no scroll
//    event listener needed.
//
// 5. No duplicate items:
//    Because each page is a separate cache entry keyed by page number, and the
//    UI renders data.pages.flatMap(p => p.items), items can never appear twice
//    even if the user scrolls quickly.
//
// 6. HydrationBoundary integration:
//    The first page was server-prefetched in page.tsx and passed via
//    HydrationBoundary. On mount, useInfiniteQuery finds page 1 already in the
//    cache — no loading spinner on first paint.

import { useRef, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ProductPage } from "../_lib/search-route";

// ── Fetcher ───────────────────────────────────────────────────────────────

async function fetchProductPage(
  page: number,
  pageSize: number = 6
): Promise<ProductPage> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await fetch(
    `/c14-tanstack-query/api/products?${params.toString()}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProductPage>;
}

// ── Component ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

export default function InfiniteList() {
  // Ref for the sentinel element at the bottom of the list.
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    // Query key: all pages share this key. TanStack Query stores them under
    // ["c14-products"] internally keyed by pageParam.
    queryKey: ["c14-products"],
    queryFn: ({ pageParam }) =>
      fetchProductPage(pageParam as number, PAGE_SIZE),

    // initialPageParam: REQUIRED in v5. Tells TanStack what param to use for
    // the first fetch. Our API is 1-based.
    initialPageParam: 1,

    // getNextPageParam: receives the last loaded page and all pages.
    // Return the next page number, or undefined to signal "no more pages".
    getNextPageParam: (lastPage: ProductPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,

    // staleTime inherited from QueryProvider (30s). Since page 1 was
    // server-prefetched, it is already in the cache when this component mounts.
  });

  // Flatten all pages into a single item array for rendering.
  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // IntersectionObserver: when the sentinel comes into view, load next page.
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersect, {
      // rootMargin: start loading before the sentinel is fully visible.
      rootMargin: "0px 0px 200px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  if (isLoading) {
    return <InfiniteListSkeleton />;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
        Error: {(error as Error).message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Showing <strong>{allItems.length}</strong> of{" "}
          <strong>{totalCount}</strong> products
        </span>
        <span className="font-mono bg-gray-100 text-gray-600 rounded px-2 py-0.5">
          {data?.pages.length ?? 0} page{(data?.pages.length ?? 0) !== 1 ? "s" : ""} loaded
        </span>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {allItems.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
          >
            {/* Tiny colored badge shows which page this item came from */}
            <span className="inline-block text-xs font-mono bg-indigo-50 text-indigo-500 rounded px-1 mb-1">
              pg {Math.ceil((idx + 1) / PAGE_SIZE)}
            </span>
            <p className="font-medium text-gray-900 truncate">{item.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              ${(item.priceCents / 100).toFixed(2)} · ★ {item.rating}
            </p>
          </div>
        ))}
      </div>

      {/* Sentinel element: observed by IntersectionObserver */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* Load-more status */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <span className="text-sm text-indigo-400 animate-pulse">Loading more…</span>
        </div>
      )}
      {!hasNextPage && allItems.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-3">
          All {totalCount} products loaded
        </p>
      )}

      {/* Teaching callout */}
      <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700 space-y-1">
        <p className="font-medium">What is happening:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Each page is a separate cache entry under <code>["c14-products"]</code>.</li>
          <li>Scrolling down triggers <code>fetchNextPage()</code> via IntersectionObserver.</li>
          <li>Items never duplicate — pages are appended, not replaced.</li>
          <li>Page 1 was server-prefetched: no loading spinner on first paint.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────

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
