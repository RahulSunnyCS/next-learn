"use client";
// ─── _components/FilterBar.tsx — Client-side controls bar for C16 ─────────
//
// WHY "use client"?
//   This component reads the current URL search params with useSearchParams()
//   and updates them with useRouter().replace().  Both hooks require a browser
//   environment (they read/write window.location), so this MUST be a Client
//   Component.
//
// PATTERN: CLIENT WRITES ↔ SERVER READS
//   This component NEVER stores filter state in React state (no useState for
//   category/sort/q values). The URL is the store.  On every user interaction
//   we call router.replace() with a new search string — the server component
//   page re-renders automatically because Next.js treats a searchParam change
//   as a navigation.
//
//   useSearchParams() reads back the current values so the inputs stay in sync
//   with the URL (e.g. on initial load from a shared link, or after back/forward).
//
// DEBOUNCE:
//   The text search input is debounced (300ms) so that every keystroke does not
//   push a new history entry.  Category and sort selects update immediately
//   (single-click, no rapid typing).  We use router.replace (not push) for all
//   updates so that partial typing during the debounce window does not pollute
//   the browser history stack with partial search strings.

import { useSearchParams, useRouter } from "next/navigation";
import { useRef, useCallback, useEffect, useState } from "react";
import type { Category } from "@/lib/data";
import {
  PARAM_KEYS,
  DEFAULTS,
  parseSearchParams,
  buildSearchParams,
} from "../_lib/search-params";
import type { ParsedSearchParams } from "../_lib/search-params";

interface FilterBarProps {
  categories: Category[];
}

export default function FilterBar({ categories }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse the current URL into typed values — this is the single source of
  // truth for what the inputs display.
  const current: ParsedSearchParams = parseSearchParams(
    Object.fromEntries(searchParams.entries())
  );

  // ---------------------------------------------------------------------------
  // Debounced text-search helper
  // ---------------------------------------------------------------------------

  // We keep the text input in *local* component state only for the
  // input's controlled value during the debounce window.  This is the ONE
  // place where a useState is used — it holds the "in-flight" text that has
  // not yet been committed to the URL.
  const [inputValue, setInputValue] = useState(current.q);

  // Sync input back from URL (handles back/forward navigation restoring state).
  // When the URL changes (e.g. via browser back), useSearchParams returns new
  // values and this effect updates the local input to match.
  const prevQ = useRef(current.q);
  useEffect(() => {
    if (current.q !== prevQ.current) {
      setInputValue(current.q);
      prevQ.current = current.q;
    }
  }, [current.q]);

  // Debounce timer ref — cleared on every keystroke, fired 300ms after the
  // last keystroke.  Using a ref so the timer ID persists across renders
  // without causing re-renders itself.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value); // Update controlled input immediately (for snappy typing feel).

      // Clear any pending timer.
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      // Wait 300ms after the user stops typing before updating the URL.
      // router.replace means no new history entry — back button skips partial
      // typed states.
      debounceTimer.current = setTimeout(() => {
        const sp = buildSearchParams(current, { q: value });
        const qs = sp.toString();
        router.replace(qs ? `?${qs}` : "?");
      }, 300);
    },
    [current, router]
  );

  // Clean up timer on unmount to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Immediate update helpers (category, sort — no debounce needed)
  // ---------------------------------------------------------------------------

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
        {/* Text search — debounced */}
        <div className="flex-1">
          <label
            htmlFor="c16-search"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Search
          </label>
          <input
            id="c16-search"
            type="search"
            placeholder="Search products…"
            value={inputValue}
            onChange={handleSearchChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Category filter */}
        <div className="sm:w-44">
          <label
            htmlFor="c16-category"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Category
          </label>
          <select
            id="c16-category"
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

        {/* Sort order */}
        <div className="sm:w-44">
          <label
            htmlFor="c16-sort"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Sort
          </label>
          <select
            id="c16-sort"
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

      {/* Clear filters */}
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

      {/* URL display — teaches that the URL reflects state */}
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
