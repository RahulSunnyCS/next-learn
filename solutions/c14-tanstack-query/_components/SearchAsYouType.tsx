"use client";
// ─── solutions/c14-tanstack-query/_components/SearchAsYouType.tsx ─────────
//
// REFERENCE SOLUTION — SearchAsYouType with optional teaching annotations.
//
// This extends the challenge component with `showAnnotations` prop that
// renders inline explanations of what is happening at each stage.
// The core logic is identical to the challenge component.
//
// KEY CONCEPTS (annotated inline below):
//
// 1. DEBOUNCED QUERY KEY
//    The query key is ["c14-search", debouncedQ]. We update debouncedQ only
//    after a 500ms pause. This means:
//    - Typing "s", "h", "o", "e" quickly fires at most one request (on pause).
//    - TanStack Query only fires a fetch when the key CHANGES.
//    - While debouncing (inputValue !== debouncedQ), we show the previous
//      result (via placeholderData: keepPreviousData) — no flash to empty state.
//
// 2. STRUCTURAL SHARING / DEDUPLICATION
//    Two mounted components with queryKey: ["c14-search", "shoe"] share ONE
//    in-flight request. TanStack Query sees the same key is already pending
//    and attaches the second subscriber to the existing Promise.
//
// 3. staleTime
//    Set in QueryProvider (30s default). A result fetched for "shoe" is "fresh"
//    for 30s. Typing "shoe" again within 30s returns from cache — zero network.
//    After 30s the result is "stale": still shown from cache, but a background
//    refetch fires silently to update it.
//
// 4. isLoading vs. isFetching
//    isLoading  = true only when: no cached data AND a fetch is in-flight.
//                 Shows the skeleton (first ever search for this term).
//    isFetching = true whenever ANY fetch is in-flight: initial, background,
//                 or stale refetch. Used for the subtle spinner.
//
// 5. keepPreviousData
//    While a new query key is resolving, show the data from the previous key.
//    Without this: typing changes the key → brief empty state → results appear.
//    With this:    typing changes the key → previous results dim → new results.
//    (We use a CSS `opacity` trick: reduce opacity during background fetching.)

import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { SearchResponse } from "../../../app/(challenges)/c14-tanstack-query/_lib/search-route";

async function fetchSearch(q: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ limit: "8" });
  if (q.trim()) params.set("q", q.trim());
  const res = await fetch(
    `/c14-tanstack-query/api/search?${params.toString()}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SearchResponse>;
}

interface Props {
  /** When true, render inline annotation boxes explaining each concept. */
  showAnnotations?: boolean;
}

export default function SearchAsYouType({ showAnnotations = false }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce: update the query key only after 500ms of inactivity.
  // The cleanup function clears the timer if the user keeps typing.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(inputValue), 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["c14-search", debouncedQ],
    queryFn: () => fetchSearch(debouncedQ),
    placeholderData: keepPreviousData,
    // staleTime is inherited from the QueryProvider (30s).
  });

  const isTyping = inputValue !== debouncedQ;
  // Dim the results list while a fetch is running but data is already shown.
  const isTransitioning = isFetching && !isLoading;

  return (
    <div className="space-y-4">
      {/* ── Annotation: query key ── */}
      {showAnnotations && (
        <Annotation title="Query Key">
          queryKey:{" "}
          <code className="font-mono text-xs">
            [&quot;c14-search&quot;,{" "}
            {debouncedQ ? `"${debouncedQ}"` : `""`}]
          </code>
          <br />
          Key changes when debounce resolves → new cache entry → new fetch.
        </Annotation>
      )}

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
        {isFetching && !isTyping && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400 animate-pulse">
            ↻
          </span>
        )}
        {isTyping && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300">
            …
          </span>
        )}
      </div>

      {/* State badges */}
      <div className="flex gap-2 text-xs flex-wrap">
        <Badge
          label="Status"
          value={
            isLoading
              ? "loading"
              : isFetching
              ? "fetching (bg)"
              : isError
              ? "error"
              : "ready"
          }
          color={
            isError
              ? "red"
              : isLoading
              ? "yellow"
              : isFetching
              ? "blue"
              : "green"
          }
        />
        {data && (
          <Badge
            label="Results"
            value={`${data.results.length} / ${data.total}`}
            color="gray"
          />
        )}
      </div>

      {/* ── Annotation: staleTime / cache hit ── */}
      {showAnnotations && data && !isLoading && (
        <Annotation title="Cache hit demo">
          Search for a term, wait for results, clear the box, type the same
          term again within 30 seconds. The status goes straight to
          &quot;ready&quot; with no network request.
        </Annotation>
      )}

      {isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          Error: {(error as Error).message}
        </p>
      )}

      {isLoading && <ResultsSkeleton />}

      {!isLoading && data && (
        <ul
          className={`divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden transition-opacity duration-150 ${
            isTransitioning ? "opacity-60" : "opacity-100"
          }`}
        >
          {data.results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-gray-400">
              No products match &quot;{debouncedQ}&quot;
            </li>
          ) : (
            data.results.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
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
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    ${(item.priceCents / 100).toFixed(2)} · ★ {item.rating}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────

function Annotation({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
      <span className="font-semibold">{title}: </span>
      {children}
    </div>
  );
}

function Badge({
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
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono ${colorMap[color]}`}
    >
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
