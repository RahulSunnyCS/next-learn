// ─── app/(challenges)/c24-normalized-state/_lib/selectors.ts ─────────────────
//
// MEMOIZED SELECTORS — The Re-render Storm Problem and Its Fix
//
// THE PROBLEM (naive approach):
//   If you call useStore(state => state.rows.allIds.map(id => state.rows.byId[id]))
//   inside every Row component, React has no way to know the result is "the same"
//   as last time — a new array reference is returned on every render cycle.
//   Zustand's equality check on the store slice fires, React re-renders ALL rows
//   even when only one row changed.  With 500 rows this is a re-render storm.
//
// THE FIX (three parts working together):
//   1. STABLE SELECTORS: extract a function reference *outside* the component so
//      the same function object is passed to useStore on every render.  Zustand
//      uses Object.is for the store-level equality check, so if the selector
//      function object itself is unstable, every render triggers a subscription
//      update.
//
//   2. FINE-GRAINED SUBSCRIPTIONS: give each Row component a selector that reads
//      ONLY its own row entry (`state.rows.byId[id]`).  When an unrelated row
//      changes, this row's byId entry is untouched — Object.is equality holds —
//      so Zustand does not notify this Row's subscriber.  Zero re-renders for
//      unrelated rows.
//
//   3. REACT.MEMO on Row: even if a parent re-renders, React.memo prevents the
//      Row from re-rendering unless its `row` prop changes.  Combined with #2,
//      only the mutated row's subscriber fires AND React.memo confirms the prop
//      changed — exactly one re-render for exactly one Row.
//
// RENDER COUNT INSTRUMENTATION:
//   Each Row component tracks render counts via a useRef counter.  The NOTES.md
//   in solutions/ documents what the counts look like before and after the fix
//   so learners can reproduce the comparison in React DevTools Profiler.

import { useMemo } from "react";
import type { GridStore } from "./store";
import type { SellerRow } from "./normalize";

// ---------------------------------------------------------------------------
// Sort / filter options
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stable selector factories (created once, not inside components)
// ---------------------------------------------------------------------------

/**
 * Returns a selector that reads a single row from the normalized map.
 *
 * IMPORTANT: Call this OUTSIDE the component or wrap in useMemo with [id] dep.
 * A new function reference inside the render body would defeat the fine-grained
 * subscription — Zustand would see a new selector and re-subscribe on every render.
 *
 * Usage (in a Row component):
 *   const selectRow = useMemo(() => makeSelectRow(id), [id]);
 *   const row = useGridStore(selectRow);
 */
export function makeSelectRow(id: string) {
  // Reads from flat top-level byId (not nested state.rows.byId).
  return (state: GridStore): SellerRow | undefined => state.byId[id];
}

/**
 * Returns a selector for the selection state of a single row.
 * Reading only `selected` (not the full row) means price/stock/revenue updates
 * do NOT trigger this subscription.
 */
export function makeSelectRowSelected(id: string) {
  return (state: GridStore): boolean =>
    state.byId[id]?.selected ?? false;
}

// ---------------------------------------------------------------------------
// Aggregate selectors (used by the toolbar — not by individual rows)
// ---------------------------------------------------------------------------

/**
 * Number of selected rows.
 *
 * WHY THIS DOES NOT RE-RENDER ON STOCK EDITS:
 *   This selector reads state.allIds (a stable reference on stock edits) and
 *   state.byId[id]?.selected (only `selected` changes on toggleSelected, not
 *   on updateStock).  When updateStock fires, Zustand sees a new state.byId
 *   reference but this selector returns the SAME numeric count — Zustand's
 *   equality check (Object.is on the return value) sees no change → skip re-render.
 *   Combined with the flat store shape (state.allIds never changes on a stock
 *   edit), the Toolbar does NOT re-render when stock is edited.
 */
export function selectSelectedCount(state: GridStore): number {
  return state.allIds.filter((id) => state.byId[id]?.selected).length;
}

/**
 * Total revenue across all rows (for the summary bar).
 * This selector correctly re-computes on stock/revenue edits because it reads byId.
 */
export function selectTotalRevenue(state: GridStore): number {
  return state.allIds.reduce(
    (sum, id) => sum + (state.byId[id]?.revenueCents ?? 0),
    0
  );
}

/**
 * Total number of rows (before any filter).
 *
 * WHY THIS DOES NOT RE-RENDER ON STOCK EDITS:
 *   Reads only state.allIds.length.  allIds never changes during a stock edit
 *   (updateStock only mutates byId).  The returned number is the same integer
 *   → Zustand's Object.is check passes → Toolbar does not re-render.
 */
export function selectRowCount(state: GridStore): number {
  return state.allIds.length;
}

// ---------------------------------------------------------------------------
// Derived view selector (expensive — MUST be memoized)
// ---------------------------------------------------------------------------

/**
 * Derives the visible, sorted, filtered id list for the grid.
 *
 * WHY THIS BELONGS IN A HOOK, NOT IN THE STORE:
 *   Sorting and filtering are VIEW concerns — they derive from the normalized
 *   data but should not be stored alongside it.  Storing a pre-sorted array
 *   in the store means every write (e.g. a stock update) must re-sort the
 *   entire array.  Instead, keep raw data in the store; derive sorted views
 *   in hooks that memo-cache the result.
 *
 * The returned id array is memo-cached with useMemo.  It only recomputes when
 * rows.byId, sortKey, filterKey, or searchQuery changes — not on every parent
 * render.  Combined with stable makeSelectRow selectors on each Row, the chain
 * of re-renders stays minimal.
 */
export function useDerivedIds(
  byId: Record<string, SellerRow>,
  allIds: string[],
  sortKey: SortKey,
  filterKey: FilterKey,
  searchQuery: string
): string[] {
  return useMemo(() => {
    // 1. Filter
    let ids = allIds;

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

    // 2. Search (case-insensitive substring match on name)
    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      ids = ids.filter((id) => {
        const row = byId[id];
        return row?.name.toLowerCase().includes(query);
      });
    }

    // 3. Sort — sort a COPY to avoid mutating allIds in the store.
    //    We copy (spread) here; useMemo caches the result so the copy only
    //    happens when inputs change, not on every render.
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
  // NOTE: byId is the whole map object.  Zustand's normalized update
  // (`byId = { ...state.byId, [id]: newRow }`) creates a new object reference,
  // so this memo correctly invalidates when any row changes.
  // This is acceptable because the derive step is fast (array ops, no DOM).
  // The per-row subscriptions (makeSelectRow) are what prevent row-level
  // re-renders — these aggregate recalculations only affect the parent grid.
}
