"use client";
// ─── app/(challenges)/c24-normalized-state/_components/DataGrid.tsx ──────────
//
// VIRTUALIZATION WITH @tanstack/react-virtual
//
// The full dataset is 500+ rows.  Without virtualization, the browser creates
// 500+ DOM nodes immediately — layout, paint, and event listener overhead
// for all of them, even the 490+ rows the user cannot see.
//
// With useVirtualizer, the grid renders only the ~15 rows currently visible
// (a configurable overscan adds a few extra above/below the viewport for smooth
// scrolling).  As the user scrolls, existing DOM nodes are repositioned (with
// `position: absolute; top: offsetStart`) to show new data — no new DOM nodes
// are created, no old ones are destroyed.  The scroll container grows to the
// full list height via a padding or a tall spacer so the scrollbar is correct.
//
// WHY THE COMBINATION MATTERS:
//   Normalization → O(1) point updates, no unnecessary re-renders in the store.
//   Memoized selectors → only the updated row's subscriber fires, React.memo stops the cascade.
//   Virtualization → the browser never touches the DOM for off-screen rows.
//   Together: 500-row grid with single-row edits feels as snappy as a 10-row grid.

import React, { useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useGridStore } from "../_lib/store";
import {
  useDerivedIds,
  selectSelectedCount,
  selectTotalRevenue,
  selectRowCount,
} from "../_lib/selectors";
import type { NormalizedRows } from "../_lib/normalize";
import { Row } from "./Row";

// Note on store shape: the store was flattened to top-level `byId` and `allIds`
// keys (instead of nested `rows: { byId, allIds }`) so that a stock edit only
// creates a new `byId` reference — `allIds` stays stable.  The aggregate
// selectors selectSelectedCount and selectRowCount read `allIds` (unchanged on
// a stock edit), so Toolbar does NOT re-render when stock is edited.  This is
// the headline fix for the "zero wasted renders" teaching claim.

// ---------------------------------------------------------------------------
// Props — the DataGrid receives pre-normalized data from the server component
// ---------------------------------------------------------------------------

interface DataGridProps {
  initialRows: NormalizedRows;
}

// ---------------------------------------------------------------------------
// Toolbar — filter/sort/search controls
// ---------------------------------------------------------------------------

function Toolbar({ showRenderCount, onToggleRenderCount }: {
  showRenderCount: boolean;
  onToggleRenderCount: () => void;
}) {
  const sortKey = useGridStore((s) => s.sortKey);
  const filterKey = useGridStore((s) => s.filterKey);
  const searchQuery = useGridStore((s) => s.searchQuery);
  const setSortKey = useGridStore((s) => s.setSortKey);
  const setFilterKey = useGridStore((s) => s.setFilterKey);
  const setSearchQuery = useGridStore((s) => s.setSearchQuery);
  const selectedCount = useGridStore(selectSelectedCount);
  const totalRevenue = useGridStore(selectTotalRevenue);
  const rowCount = useGridStore(selectRowCount);

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-3 bg-gray-50 border-b border-gray-200 text-sm">
      {/* Search */}
      <input
        type="search"
        placeholder="Search products…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="flex-1 min-w-32 max-w-64 px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />

      {/* Sort */}
      <select
        value={sortKey}
        onChange={(e) =>
          setSortKey(
            e.target.value as import("../_lib/selectors").SortKey
          )
        }
        className="px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        <option value="revenue-desc">Revenue ↓</option>
        <option value="price-desc">Price ↓</option>
        <option value="price-asc">Price ↑</option>
        <option value="stock-asc">Stock ↑ (low first)</option>
        <option value="stock-desc">Stock ↓</option>
        <option value="rating-desc">Rating ↓</option>
        <option value="name-asc">Name A–Z</option>
        <option value="name-desc">Name Z–A</option>
      </select>

      {/* Filter */}
      <select
        value={filterKey}
        onChange={(e) =>
          setFilterKey(
            e.target.value as import("../_lib/selectors").FilterKey
          )
        }
        className="px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        <option value="all">All products</option>
        <option value="low-stock">Low stock (1–9)</option>
        <option value="no-stock">Out of stock</option>
        <option value="selected">Selected only</option>
      </select>

      {/* Render count toggle */}
      <button
        onClick={onToggleRenderCount}
        className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
          showRenderCount
            ? "bg-amber-100 border-amber-300 text-amber-800"
            : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
        }`}
        title="Show/hide React render count badges per row"
      >
        {showRenderCount ? "Hide" : "Show"} render counts
      </button>

      {/* Stats */}
      <div className="ml-auto flex gap-4 text-xs text-gray-500 flex-shrink-0">
        <span>
          <span className="font-medium text-gray-700">{rowCount}</span> rows
        </span>
        {selectedCount > 0 && (
          <span className="text-indigo-600 font-medium">
            {selectedCount} selected
          </span>
        )}
        <span>
          Revenue:{" "}
          <span className="font-medium text-green-700">
            ${(totalRevenue / 100).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}
          </span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column header
// ---------------------------------------------------------------------------

function ColumnHeader({ showRenderCount }: { showRenderCount: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
      <span className="w-4 flex-shrink-0" />
      {showRenderCount && <span className="w-6 flex-shrink-0">Re#</span>}
      <span className="flex-1">Product name</span>
      <span className="w-20 text-right flex-shrink-0">Price</span>
      <span className="w-24 text-right flex-shrink-0">Stock (click↗edit)</span>
      <span className="w-12 text-right flex-shrink-0">Rating</span>
      <span className="w-24 text-right flex-shrink-0">Revenue</span>
      <span className="w-12 text-right flex-shrink-0">Orders</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select-all header row
// ---------------------------------------------------------------------------

function SelectAllRow({
  visibleIds,
  showRenderCount,
}: {
  visibleIds: string[];
  showRenderCount: boolean;
}) {
  const setAllSelected = useGridStore((s) => s.setAllSelected);
  const selectedCount = useGridStore(selectSelectedCount);

  const allSelected =
    visibleIds.length > 0 && selectedCount >= visibleIds.length;

  const handleChange = useCallback(() => {
    setAllSelected(visibleIds, !allSelected);
  }, [visibleIds, allSelected, setAllSelected]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
      <input
        type="checkbox"
        checked={allSelected}
        onChange={handleChange}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
        aria-label="Select all visible rows"
      />
      {showRenderCount && <span className="w-6 flex-shrink-0 text-amber-700 font-mono">Re#</span>}
      <span>
        Select all {visibleIds.length} visible rows
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataGrid — the main component
// ---------------------------------------------------------------------------

export function DataGrid({ initialRows }: DataGridProps) {
  // Load initial data into store on mount (only once).
  // We load here rather than in the store initializer so that the server-
  // provided data (fetched fresh per request) seeds the client store.
  const loadRows = useGridStore((s) => s.loadRows);
  const isLoaded = useGridStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      // Pass byId and allIds separately — the store shape is flat (not nested).
      loadRows(initialRows.byId, initialRows.allIds);
    }
    // Only run once — initialRows is a stable prop from server (not reactive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read the raw normalized data for selector input (flat top-level keys).
  const byId = useGridStore((s) => s.byId);
  const allIds = useGridStore((s) => s.allIds);
  const sortKey = useGridStore((s) => s.sortKey);
  const filterKey = useGridStore((s) => s.filterKey);
  const searchQuery = useGridStore((s) => s.searchQuery);

  // Derive sorted/filtered id list — memoized, only recomputes when inputs change.
  const visibleIds = useDerivedIds(byId, allIds, sortKey, filterKey, searchQuery);

  // Render-count toggle (local UI state — doesn't need to be in the Zustand
  // store since it only affects the grid's own display, not any data).
  const [showRenderCount, setShowRenderCount] = React.useState(false);

  // Virtualizer setup — the scroll container ref is passed here.
  const parentRef = useRef<HTMLDivElement>(null);

  // Row height: fixed at 44px for performance.
  // Using a fixed estimate avoids measureElement overhead on every scroll event.
  // For variable-height rows, use the measureElement option instead.
  const ROW_HEIGHT = 44;

  const virtualizer = useVirtualizer({
    count: visibleIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Render 10 extra rows above/below viewport for smooth scroll.
  });

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-96 flex items-center justify-center text-gray-400 text-sm animate-pulse">
          Loading grid data…
        </div>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <Toolbar
        showRenderCount={showRenderCount}
        onToggleRenderCount={() => setShowRenderCount((v) => !v)}
      />

      <ColumnHeader showRenderCount={showRenderCount} />
      <SelectAllRow visibleIds={visibleIds} showRenderCount={showRenderCount} />

      {/* Scroll container — the virtualizer measures this element's clientHeight
          and scrollTop to determine which items are in the viewport. */}
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{ height: "480px" }}  // Fixed viewport height for the virtual list.
      >
        {/* Spacer div sized to the full list height so the scrollbar is correct.
            The virtualizer positions each rendered item absolutely inside here. */}
        <div
          style={{ height: totalHeight, position: "relative" }}
        >
          {virtualItems.map((virtualItem) => {
            const id = visibleIds[virtualItem.index];
            return (
              <Row
                key={id}
                id={id}
                // measureRef tells the virtualizer the measured height of this
                // item so it can update its internal size cache.
                measureRef={virtualizer.measureElement}
                style={{
                  // Absolute positioning is the virtualizer's trick:
                  // only ~15 DOM nodes exist at any time, repositioned via `top`.
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  // translateY places this DOM node at the correct scroll offset.
                  transform: `translateY(${virtualItem.start}px)`,
                  height: `${ROW_HEIGHT}px`,
                }}
                showRenderCount={showRenderCount}
              />
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
        <span>
          Showing <strong>{visibleIds.length}</strong> of{" "}
          <strong>{allIds.length}</strong> rows &mdash; only{" "}
          <strong>{virtualItems.length}</strong> rendered in DOM
        </span>
        <span className="text-indigo-500 text-xs">
          Scroll to virtualize &rarr;
        </span>
      </div>
    </div>
  );
}
