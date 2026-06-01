"use client";
// ─── app/(challenges)/c24-normalized-state/_lib/store.ts ─────────────────────
//
// Zustand store for the seller data grid.
//
// NORMALIZED STATE SHAPE (FLAT — top-level byId + allIds):
//
//   byId   : Record<string, SellerRow>  — the entity map
//   allIds : string[]                   — ordered id list (never changes during stock edits)
//
// WHY FLAT INSTEAD OF NESTED `rows: { byId, allIds }`?
//
//   With the nested shape, a stock edit produces:
//     set({ rows: { ...state.rows, byId: { ...state.rows.byId, [id]: updatedRow } } })
//   This creates a NEW `rows` object reference.  ANY selector that reads
//   `state.rows` (including selectSelectedCount and selectRowCount, which only
//   needed allIds) sees a new input value and re-runs — even though allIds
//   never changed.  The Toolbar re-renders unnecessarily on every stock edit.
//
//   With the flat shape:
//     set({ byId: { ...state.byId, [id]: updatedRow } })
//   Only `byId` changes reference.  `allIds` keeps its reference.
//   selectSelectedCount and selectRowCount subscribe to `state.allIds`
//   (stable on stock edits) — Zustand's Object.is check passes → zero
//   re-render for those selectors.  "Zero wasted renders" is now true.
//
//   selectTotalRevenue reads `byId` and correctly re-runs on stock edits
//   (revenue changes when stock changes if revenue is derived from stock).
//
// WHY NOT A FLAT ARRAY?
//   Array.map() for an update = O(n) work touching every element.
//   With 500 rows, editing one row's stock calls map() 500 times.
//   Every component subscribed to the array sees a new reference → re-renders.
//
//   With normalization, editing one row:
//     set({ byId: { ...state.byId, [id]: updatedRow } })
//   Only ONE entry in byId changes.  Components subscribed with makeSelectRow(id)
//   for OTHER rows get the same byId[otherId] reference → Object.is → skip re-render.
//   Only the mutated row's subscriber sees a new value and re-renders.

import { create } from "zustand";
import type { SellerRow } from "./normalize";

// ---------------------------------------------------------------------------
// View options (separate from the data — these are UI concerns)
// ---------------------------------------------------------------------------

import type { SortKey, FilterKey } from "./selectors";

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface GridStore {
  // Normalized entity map — flat top-level keys (see WHY FLAT above).
  byId: Record<string, SellerRow>;
  allIds: string[];

  // View configuration (filter / sort / search) — stored here so they can
  // be changed by toolbar actions and trigger re-derives in useDerivedIds.
  sortKey: SortKey;
  filterKey: FilterKey;
  searchQuery: string;

  // Whether the initial data load is complete.
  isLoaded: boolean;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Bulk-load the normalized rows (called once after server data arrives). */
  loadRows: (byId: Record<string, SellerRow>, allIds: string[]) => void;

  /** Update a single row's stock count (simulates an inline edit save). */
  updateStock: (id: string, newStock: number) => void;

  /** Toggle the selection state of a single row. */
  toggleSelected: (id: string) => void;

  /** Select / deselect all visible rows. */
  setAllSelected: (ids: string[], selected: boolean) => void;

  /** Update sort key. */
  setSortKey: (key: SortKey) => void;

  /** Update filter key. */
  setFilterKey: (key: FilterKey) => void;

  /** Update search query. */
  setSearchQuery: (query: string) => void;
}

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------

export const useGridStore = create<GridStore>((set) => ({
  byId: {},
  allIds: [],
  sortKey: "revenue-desc",
  filterKey: "all",
  searchQuery: "",
  isLoaded: false,

  loadRows(byId, allIds) {
    set({ byId, allIds, isLoaded: true });
  },

  updateStock(id, newStock) {
    // O(1) point update — only this row's byId entry changes.
    // allIds never changes on a stock edit → selectSelectedCount and
    // selectRowCount subscriptions are unaffected → Toolbar does NOT re-render.
    // Rows for other products never change reference → their React.memo
    // and fine-grained Zustand subscriptions stay stable.
    set((state) => {
      const existing = state.byId[id];
      if (!existing) return {};  // Guard: unknown id, no-op.
      return {
        byId: {
          ...state.byId,
          [id]: { ...existing, stock: Math.max(0, newStock) },
        },
      };
    });
  },

  toggleSelected(id) {
    set((state) => {
      const existing = state.byId[id];
      if (!existing) return {};
      return {
        byId: {
          ...state.byId,
          [id]: { ...existing, selected: !existing.selected },
        },
      };
    });
  },

  setAllSelected(ids, selected) {
    // Batch update — rebuilds byId once for all ids, not one call per id.
    // This is the one case where we touch multiple rows in one operation.
    // Still correct: we rebuild the whole map, but it only happens on
    // "Select All / Deselect All" which is an explicit user action, not
    // a data-update hot path.
    set((state) => {
      const idSet = new Set(ids);
      const newById: Record<string, SellerRow> = { ...state.byId };
      for (const id of idSet) {
        const row = newById[id];
        if (row) newById[id] = { ...row, selected };
      }
      return { byId: newById };
    });
  },

  setSortKey(key) {
    set({ sortKey: key });
  },

  setFilterKey(key) {
    set({ filterKey: key });
  },

  setSearchQuery(query) {
    set({ searchQuery: query });
  },
}));
