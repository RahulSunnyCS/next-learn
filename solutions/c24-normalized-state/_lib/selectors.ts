// ─── solutions/c24-normalized-state/_lib/selectors.ts ────────────────────────
//
// REFERENCE SOLUTION — Memoized selectors for the seller data grid.
//
// This is the complete, annotated version of the selectors from the challenge.
// The challenge version in app/(challenges)/c24-normalized-state/_lib/selectors.ts
// is identical — this copy exists for side-by-side comparison in the solutions directory.
//
// KEY CONCEPTS DEMONSTRATED:
//
// 1. FACTORY PATTERN (makeSelectRow, makeSelectRowSelected)
//    - Returns a new selector function for a given id.
//    - The returned function is stable as long as id is stable.
//    - Usage: const sel = useMemo(() => makeSelectRow(id), [id]);
//    - Why useMemo: ensures the same function object is passed to useStore across renders
//      so Zustand's subscription equality check stays valid.
//
// 2. GRANULAR SUBSCRIPTION (makeSelectRowSelected reads only .selected)
//    - If a Row component only needs to know whether it is checked, it subscribes to
//      makeSelectRowSelected — not to the full SellerRow.
//    - Result: a stock or price update does NOT trigger the selection subscriber.
//      Two separate selectors → two separate subscriptions → independent notification paths.
//
// 3. AGGREGATE SELECTORS (selectSelectedCount, selectTotalRevenue, selectRowCount)
//    - Called by the Toolbar, not by Row components.
//    - These DO re-run when any row changes (they read allIds + byId), but that is
//      acceptable because only one Toolbar instance exists — not 500.
//
// 4. DERIVED VIEW HOOK (useDerivedIds)
//    - Not a Zustand selector — it is a React hook that receives byId/allIds as arguments.
//    - Uses useMemo internally; re-derives only when inputs change.
//    - Keeps sort/filter logic out of the store (view concerns != data concerns).
//    - See NOTES.md for the full explanation of why this lives in a hook, not the store.

import { useMemo } from "react";

// Type imports — re-typed here to match the challenge's _lib types.
// In a real monorepo you would import from a shared package; here we redeclare
// to keep the solutions directory self-contained.

export interface SellerRow {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
  rating: number;
  categoryId: string;
  currency: string;
  revenueCents: number;
  orderCount: number;
  selected: boolean;
}

export interface NormalizedRows {
  byId: Record<string, SellerRow>;
  allIds: string[];
}

export interface GridStore {
  rows: NormalizedRows;
  sortKey: SortKey;
  filterKey: FilterKey;
  searchQuery: string;
  isLoaded: boolean;
  loadRows: (rows: NormalizedRows) => void;
  updateStock: (id: string, newStock: number) => void;
  toggleSelected: (id: string) => void;
  setAllSelected: (ids: string[], selected: boolean) => void;
  setSortKey: (key: SortKey) => void;
  setFilterKey: (key: FilterKey) => void;
  setSearchQuery: (query: string) => void;
}

export type SortKey =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock-asc"
  | "stock-desc"
  | "revenue-desc"
  | "rating-desc";

export type FilterKey = "all" | "low-stock" | "no-stock" | "selected";

// ─────────────────────────────────────────────────────────────────────────────
// STABLE SELECTOR FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a per-row selector that reads only that row's entry in byId.
 *
 * Pattern:
 *   const sel = useMemo(() => makeSelectRow(id), [id]);
 *   const row = useGridStore(sel);
 *
 * Why the factory pattern?
 *   We cannot create a single selector function for all rows — each Row needs
 *   to close over its own `id`. The factory returns a new closure per id, but
 *   we keep it stable across renders via useMemo.
 *
 * What happens without useMemo?
 *   A new arrow function is created every render. Zustand's internal subscription
 *   map checks whether the selector changed (by reference). A new function → new
 *   subscription → Zustand re-runs the selector for every store update, regardless
 *   of whether the data the selector reads actually changed. The fine-grained
 *   subscription optimization is completely defeated.
 */
export function makeSelectRow(id: string) {
  // This function is closed over `id` — it reads only byId[id], not the whole map.
  // When byId[otherId] changes, byId[id] still points to the same object → Object.is
  // returns true → Zustand does NOT schedule a re-render for this subscriber.
  return (state: GridStore): SellerRow | undefined => state.rows.byId[id];
}

/**
 * Creates a selector that reads only the `.selected` boolean for a row.
 *
 * Narrower than makeSelectRow — a subscriber using this selector is NOT notified
 * when stock, price, or revenue changes. Only selection changes trigger it.
 *
 * Use this in a component that only renders a checkbox, not the full row data.
 */
export function makeSelectRowSelected(id: string) {
  return (state: GridStore): boolean =>
    state.rows.byId[id]?.selected ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATE SELECTORS (toolbar / summary bar)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counts selected rows.
 *
 * This selector reads allIds + byId[id].selected for every id — it re-runs
 * whenever any row changes. This is acceptable because only one Toolbar
 * subscribes to it (not N Row components).
 *
 * If this were called in 500 Row components, it would be expensive (O(n)
 * per notification). But as a toolbar aggregate, the cost is negligible.
 */
export function selectSelectedCount(state: GridStore): number {
  return state.rows.allIds.filter((id) => state.rows.byId[id]?.selected).length;
}

/**
 * Sums revenue across all rows.
 *
 * Same considerations as selectSelectedCount — acceptable for toolbar use,
 * not suitable for use in individual Row components.
 */
export function selectTotalRevenue(state: GridStore): number {
  return state.rows.allIds.reduce(
    (sum, id) => sum + (state.rows.byId[id]?.revenueCents ?? 0),
    0
  );
}

/** Total row count (before any filter). */
export function selectRowCount(state: GridStore): number {
  return state.rows.allIds.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED VIEW HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives the visible, sorted, filtered id list from the normalized store data.
 *
 * This is a React hook (uses useMemo) rather than a Zustand selector because:
 *
 * 1. Zustand selectors run on every store notification. If the sort result were
 *    a Zustand selector, it would re-sort 500 rows on every single keystroke in
 *    the stock input (every updateStock call). useMemo is smarter — it only
 *    recomputes when its declared dependencies change.
 *
 * 2. The selector result (an array) is always a new reference, so Zustand&apos;s
 *    reference-equality check would always trigger re-renders. useMemo caches
 *    the reference, so the DataGrid does not re-render if inputs are unchanged.
 *
 * 3. Sorting and filtering are VIEW concerns. They derive from the data but are
 *    not the data. Keeping them in a hook makes the store simpler: it only holds
 *    the canonical byId map plus view configuration scalars (sortKey, filterKey).
 *
 * TRADE-OFF:
 *   byId is a `useMemo` dependency. Every call to `updateStock` creates a new
 *   byId object reference, so useDerivedIds re-sorts on every stock update.
 *   Sorting 500 ids takes ~0.5ms in JavaScript — far cheaper than 500 DOM
 *   re-renders. If the list were 50,000+ rows, this would need further
 *   optimization (e.g., a Web Worker for the sort).
 *
 * @param byId    The current byId map from the store.
 * @param allIds  The canonical id array (insertion order).
 * @param sortKey  Current sort selection.
 * @param filterKey Current filter selection.
 * @param searchQuery Current search text.
 * @returns       A new sorted/filtered array of ids (memoized).
 */
export function useDerivedIds(
  byId: Record<string, SellerRow>,
  allIds: string[],
  sortKey: SortKey,
  filterKey: FilterKey,
  searchQuery: string
): string[] {
  return useMemo(() => {
    // ── 1. Filter ────────────────────────────────────────────────────────
    let ids = allIds; // reference equality — no copy yet

    if (filterKey !== "all") {
      ids = ids.filter((id) => {
        const row = byId[id];
        if (!row) return false;
        if (filterKey === "low-stock") return row.stock > 0 && row.stock < 10;
        if (filterKey === "no-stock") return row.stock === 0;
        if (filterKey === "selected") return row.selected;
        return true;
      });
    }

    // ── 2. Search ────────────────────────────────────────────────────────
    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      ids = ids.filter((id) => {
        const row = byId[id];
        return row?.name.toLowerCase().includes(query);
      });
    }

    // ── 3. Sort ──────────────────────────────────────────────────────────
    // We spread `ids` into a new array before sorting to avoid mutating
    // the allIds array that lives in the store. This is safe because
    // useMemo caches the result — the spread+sort runs only when inputs change.
    const sorted = [...ids].sort((a, b) => {
      const ra = byId[a];
      const rb = byId[b];
      if (!ra || !rb) return 0;

      switch (sortKey) {
        case "name-asc":
          return ra.name.localeCompare(rb.name);
        case "name-desc":
          return rb.name.localeCompare(ra.name);
        case "price-asc":
          return ra.priceCents - rb.priceCents;
        case "price-desc":
          return rb.priceCents - ra.priceCents;
        case "stock-asc":
          return ra.stock - rb.stock;
        case "stock-desc":
          return rb.stock - ra.stock;
        case "revenue-desc":
          return rb.revenueCents - ra.revenueCents;
        case "rating-desc":
          return rb.rating - ra.rating;
        default:
          return 0;
      }
    });

    return sorted;
  }, [byId, allIds, sortKey, filterKey, searchQuery]);
  // NOTE: byId changes reference on every updateStock call (the Zustand spread
  // pattern creates a new byId object). This is intentional: the store needs a
  // new reference to notify subscribers. useDerivedIds therefore re-sorts on
  // every stock update. This is the correct trade-off: 0.5ms sort vs.
  // 500 × 1-3ms DOM renders. See NOTES.md §4 for the full analysis.
}
