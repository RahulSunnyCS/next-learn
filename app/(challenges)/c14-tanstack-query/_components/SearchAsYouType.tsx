"use client";
// ─── app/(challenges)/c14-tanstack-query/_components/SearchAsYouType.tsx ──
//
// Teaches: useQuery + debounced query key + request deduplication + staleTime
//
// KEY TANSTACK QUERY CONCEPTS SHOWN HERE:
//
// 1. DEBOUNCED QUERY KEY: The query key includes the search term. We debounce
//    the term (500ms) so rapid keystrokes don't fire a fetch per keystroke.
//    While the debounce timer is running, the previous cached result stays
//    visible (no loading flash on every keypress).
//
// 2. REQUEST DEDUPLICATION: If two components mount with the same query key
//    simultaneously, TanStack Query fires only ONE network request and shares
//    the result between both subscribers. This is "structural sharing" — it
//    works at the query key level, not the URL level.
//
// 3. staleTime CACHING: After a successful fetch, the result is considered
//    "fresh" for staleTime milliseconds (configured in QueryProvider: 30s).
//    If you type "shoes", navigate away, and return within 30s, the cached
//    result is shown immediately without a network round-trip. After 30s the
//    result is "stale" — it still shows (no flash) but a background refetch
//    fires to update it.
//
// 4. KEEP PREVIOUS RESULTS: We use `placeholderData: keepPreviousData` so
//    the UI shows the last successful results while a new query is in-flight.
//    Without this, changing the query key (typing) would briefly show an
//    empty state while the new fetch resolves.

import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { SearchResponse } from "../_lib/search-route";

// ── Fetcher ───────────────────────────────────────────────────────────────

async function fetchSearch(q: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ limit: "8" });
  if (q.trim()) params.set("q", q.trim());

  const res = await fetch(`/c14-tanstack-query/api/search?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SearchResponse>;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function SearchAsYouType() {
  // The raw input value (updates on every keystroke).
  const [inputValue, setInputValue] = useState("");
  // The debounced value that drives the query key (updated 500ms after typing stops).
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce: set a 500ms timer on every input change; clear on the next change.
  // This prevents a network request per keypress.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(inputValue), 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // useQuery: fires when debouncedQ changes (query key changes).
  // The key ["search", debouncedQ] means:
  //   - Different search terms = different cache entries (separate fetches, separate caches).
  //   - Same term within staleTime = cache HIT, no network round-trip.
  //   - Two components with the same key = single in-flight request shared between both.
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["c14-search", debouncedQ],
    queryFn: () => fetchSearch(debouncedQ),
    // placeholderData: show previous results while the new query is loading.
    // Without this, changing the search term briefly shows empty state.
    placeholderData: keepPreviousData,
    // staleTime is inherited from the QueryProvider default (30s).
    // Override here if needed: staleTime: 10_000
  });

  // isFetching is true even when the data is already in cache (background refetch).
  // isLoading is only true when there is NO cached data AND a fetch is in-flight.
  const isTyping = inputValue !== debouncedQ;

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="relative">
        <input
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type to search products…"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
          aria-label="Search products"
        />
        {/* Subtle spinner: only while actively fetching (not while debouncing) */}
        {isFetching && !isTyping && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400 animate-pulse">
            ↻
          </span>
        )}
        {/* "Waiting to search" indicator while debounce timer runs */}
        {isTyping && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300">
            …
          </span>
        )}
      </div>

      {/* State indicators (visible to learners) */}
      <div className="flex gap-2 text-xs flex-wrap">
        <CacheBadge
          label="Query key"
          value={debouncedQ ? `["c14-search", "${debouncedQ}"]` : `["c14-search", ""]`}
          color="indigo"
        />
        <CacheBadge
          label="Status"
          value={isLoading ? "loading" : isFetching ? "fetching (bg)" : isError ? "error" : "ready"}
          color={isError ? "red" : isLoading ? "yellow" : isFetching ? "blue" : "green"}
        />
        {data && (
          <CacheBadge
            label="Cached results"
            value={`${data.results.length} / ${data.total}`}
            color="gray"
          />
        )}
      </div>

      {/* Error state */}
      {isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          Error: {(error as Error).message}
        </p>
      )}

      {/* Results */}
      {isLoading && <ResultsSkeleton />}
      {!isLoading && data && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden">
          {data.results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-gray-400">
              No products match &quot;{debouncedQ}&quot;
            </li>
          ) : (
            data.results.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                {/* Placeholder image box */}
                <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs text-gray-400">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    "img"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    ${(item.priceCents / 100).toFixed(2)} · ★ {item.rating}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      {/* Teaching callout */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-700 space-y-1">
        <p className="font-medium">What is happening in the network tab:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Rapid typing fires ONE request per 500ms pause (debounced key).</li>
          <li>Repeating a previous query within 30 s = zero network requests (cache hit).</li>
          <li>Two &quot;c14-search&quot; consumers with the same key share one in-flight request.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function CacheBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "indigo" | "green" | "yellow" | "red" | "blue" | "gray";
}) {
  const colorMap: Record<typeof color, string> = {
    indigo: "bg-indigo-100 text-indigo-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono ${colorMap[color]}`}>
      <span className="font-sans font-medium">{label}:</span> {value}
    </span>
  );
}

function ResultsSkeleton() {
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-2.5 w-1/3 bg-gray-100 rounded animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}
