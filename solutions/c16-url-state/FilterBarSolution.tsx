"use client";
// ─── solutions/c16-url-state/FilterBarSolution.tsx ────────────────────────
//
// Reference solution for the client-side controls bar.
// This is the "use client" component that:
//   - reads the current URL via useSearchParams()
//   - writes to the URL via router.replace()
//   - debounces the text search input (300ms, useRef for the timer)
//
// The inputs are controlled from the URL (not from useState for the actual
// filter values) — the URL IS the state.

import { useSearchParams, useRouter } from "next/navigation";
import { useRef, useCallback, useEffect, useState } from "react";
import type { Category } from "@/lib/data";
import {
  PARAM_KEYS,
  DEFAULTS,
  parseSearchParams,
  buildSearchParams,
} from "./_lib/search-params";
import type { ParsedSearchParams } from "./_lib/search-params";

interface FilterBarSolutionProps {
  categories: Category[];
}

export default function FilterBarSolution({
  categories,
}: FilterBarSolutionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current: ParsedSearchParams = parseSearchParams(
    Object.fromEntries(searchParams.entries())
  );

  // Local state only for the text input's in-flight value during the debounce
  // window.  This keeps the input snappy while not spamming the URL.
  const [inputValue, setInputValue] = useState(current.q);

  // Sync input from URL (handles back/forward).
  const prevQ = useRef(current.q);
  useEffect(() => {
    if (current.q !== prevQ.current) {
      setInputValue(current.q);
      prevQ.current = current.q;
    }
  }, [current.q]);

  // Timer ref — NOT state, so clearing/setting it doesn't cause re-renders.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const sp = buildSearchParams(current, { q: value });
        const qs = sp.toString();
        // router.replace: no history entry per keystroke.
        router.replace(qs ? `?${qs}` : "?");
      }, 300);
    },
    [current, router]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const sp = buildSearchParams(current, { category: e.target.value });
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : "?");
    },
    [current, router]
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const sp = buildSearchParams(current, {
        sort: e.target.value as ParsedSearchParams["sort"],
      });
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : "?");
    },
    [current, router]
  );

  const handleClearAll = useCallback(() => {
    router.replace("?");
    setInputValue("");
  }, [router]);

  const hasFilters =
    current.q !== DEFAULTS.q ||
    current.category !== DEFAULTS.category ||
    current.sort !== DEFAULTS.sort;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label
            htmlFor="sol-c16-search"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Search (debounced 300ms)
          </label>
          <input
            id="sol-c16-search"
            type="search"
            placeholder="Search products…"
            value={inputValue}
            onChange={handleSearchChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="sm:w-44">
          <label
            htmlFor="sol-c16-category"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Category
          </label>
          <select
            id="sol-c16-category"
            value={current.category}
            onChange={handleCategoryChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-44">
          <label
            htmlFor="sol-c16-sort"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Sort
          </label>
          <select
            id="sol-c16-sort"
            value={current.sort}
            onChange={handleSortChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating-desc">Top Rated</option>
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
        <p className="text-xs font-medium text-gray-500 mb-0.5">
          Current URL params (the state):
        </p>
        <code className="text-xs text-indigo-700 break-all font-mono">
          {searchParams.toString()
            ? `?${searchParams.toString()}`
            : "(none — showing defaults)"}
        </code>
      </div>
    </div>
  );
}
