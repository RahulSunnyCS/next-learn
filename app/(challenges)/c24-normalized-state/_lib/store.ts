"use client";
// ─── app/(challenges)/c24-normalized-state/_lib/store.ts ─────────────────────
//
// Zustand store for the seller data grid.
//
// NORMALIZED STATE SHAPE:
//   rows: { byId: Record<string, SellerRow>, allIds: string[] }
//
// WHY NOT A FLAT ARRAY?
//   Array.map() for an update = O(n) work touching every element.
//   With 500 rows, editing one row's stock calls map() 500 times.
//   Every component subscribed to the array sees a new reference → re-renders.
//
//   With normalization, editing one row:
//     set(state => ({
//       rows: {
//         ...state.rows,
//         byId: { ...state.rows.byId, [id]: updatedRow }
//       }
//     }))
//   Only ONE entry in byId changes.  Components subscribed with makeSelectRow(id)
//   for OTHER rows get the same byId[otherId] reference → Object.is → skip re-render.
//   Only the mutated row's subscriber sees a new value and re-renders.

import { create } from "zustand";
import type { NormalizedRows, SellerRow } from "./normalize";

// ---------------------------------------------------------------------------
// View options (separate from the data — these are UI concerns)
// ---------------------------------------------------------------------------

import type { SortKey, FilterKey } from "./selectors";

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface GridStore {
  // Normalized entity map — the source of truth.
  rows: NormalizedRows;

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
  loadRows: (rows: NormalizedRows) => void;

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
  rows: { byId: {}, allIds: [] },
  sortKey: "revenue-desc",
  filterKey: "all",
  searchQuery: "",
  isLoaded: false,

  loadRows(rows) {
    set({ rows, isLoaded: true });
  },

  updateStock(id, newStock) {
    // O(1) point update — only this row's byId entry changes.
    // Rows for other products never change reference → their React.memo
    // and fine-grained Zustand subscriptions stay stable.
    set((state) => {
      const existing = state.rows.byId[id];
      if (!existing) return {};  // Guard: unknown id, no-op.
      return {
        rows: {
          ...state.rows,
          byId: {
            ...state.rows.byId,
            [id]: { ...existing, stock: Math.max(0, newStock) },
          },
        },
      };
    });
  },

  toggleSelected(id) {
    set((state) => {
      const existing = state.rows.byId[id];
      if (!existing) return {};
      return {
        rows: {
          ...state.rows,
          byId: {
            ...state.rows.byId,
            [id]: { ...existing, selected: !existing.selected },
          },
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
      const newById: Record<string, SellerRow> = { ...state.rows.byId };
      for (const id of idSet) {
        const row = newById[id];
        if (row) newById[id] = { ...row, selected };
      }
      return { rows: { ...state.rows, byId: newById } };
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
