"use client";
// ─── app/(challenges)/c24-normalized-state/_components/Row.tsx ───────────────
//
// THE RE-RENDER STORM FIX — TEACHING CENTERPIECE
//
// BEFORE (naive — causes re-render storms):
//   function Row({ index }) {
//     // This selector rebuilds a new array on every render and reads ALL rows.
//     const rows = useGridStore(state =>
//       state.rows.allIds.map(id => state.rows.byId[id])
//     );
//     const row = rows[index];
//     ...
//   }
//   Problem: when ANY row changes, this selector returns a new array reference
//   for every Row component → all N rows re-render, even the N-1 unchanged ones.
//
// AFTER (fixed — granular subscription + React.memo):
//   function Row({ id }) {
//     const selectRow = useMemo(() => makeSelectRow(id), [id]);
//     const row = useGridStore(selectRow);  // Only THIS row's data
//     ...
//   }
//   + wrapped in React.memo so parent re-renders don't cascade here.
//
//   When row "p-elec-001" is updated:
//     - Only the byId["p-elec-001"] reference changes.
//     - All other Row components get the same byId[otherId] reference.
//     - Object.is check in Zustand → no notification → no re-render.
//     - React.memo on Row → even if the parent re-renders, the Row that
//       didn't change is skipped.
//   NET: exactly ONE Row re-renders, not N rows.
//
// RENDER COUNT INSTRUMENTATION:
//   renderCount ref counts how many times React renders this component.
//   Check the render-counter badge in the grid to observe the difference
//   between the naive approach (all counters increment) and the fixed
//   approach (only the edited row's counter increments).

import React, { useMemo, useRef, useState, useCallback } from "react";
import { useGridStore } from "../_lib/store";
import { makeSelectRow } from "../_lib/selectors";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RowProps {
  id: string;
  /** Passed from the virtualizer — the absolute position of this row. */
  measureRef: (el: Element | null) => void;
  style: React.CSSProperties;
  /** Whether render-count badges are visible (toggled in DataGrid). */
  showRenderCount: boolean;
}

// ---------------------------------------------------------------------------
// Row — wrapped in React.memo for granular re-render control
// ---------------------------------------------------------------------------

const Row = React.memo(function Row({
  id,
  measureRef,
  style,
  showRenderCount,
}: RowProps) {
  // Fine-grained subscription: only re-runs when THIS row's byId entry changes.
  // makeSelectRow returns a stable function reference (not created inside render)
  // when memoized with [id] — Zustand's subscriber equality check stays O(1).
  const selectRow = useMemo(() => makeSelectRow(id), [id]);
  const row = useGridStore(selectRow);

  // Fine-grained action subscriptions — only the needed actions from the store.
  const updateStock = useGridStore((s) => s.updateStock);
  const toggleSelected = useGridStore((s) => s.toggleSelected);

  // Render count instrumentation — counts actual React renders for this row.
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Local inline-edit state — editing is local until "Save" is clicked.
  // This avoids triggering a store update (and thus subscriber notifications)
  // on every keystroke — only the final value hits the normalized store.
  const [editing, setEditing] = useState(false);
  const [draftStock, setDraftStock] = useState<string>("");

  const startEdit = useCallback(() => {
    if (!row) return;
    setDraftStock(String(row.stock));
    setEditing(true);
  }, [row]);

  const saveEdit = useCallback(() => {
    const parsed = parseInt(draftStock, 10);
    if (!isNaN(parsed)) {
      updateStock(id, parsed);
    }
    setEditing(false);
  }, [draftStock, id, updateStock]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const handleCheckbox = useCallback(() => {
    toggleSelected(id);
  }, [id, toggleSelected]);

  if (!row) return null;

  const priceFormatted = `$${(row.priceCents / 100).toFixed(2)}`;
  const revenueFormatted = `$${(row.revenueCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div
      ref={measureRef}
      style={style}
      className={`absolute left-0 right-0 flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 ${
        row.selected ? "bg-indigo-50" : "bg-white hover:bg-gray-50"
      } transition-colors`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={row.selected}
        onChange={handleCheckbox}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 flex-shrink-0"
        aria-label={`Select ${row.name}`}
      />

      {/* Render count badge — visible when showRenderCount is true */}
      {showRenderCount && (
        <span
          className="flex-shrink-0 inline-flex items-center justify-center w-6 h-5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 font-mono"
          title="React render count for this row"
        >
          {renderCount.current}
        </span>
      )}

      {/* Product name */}
      <span className="flex-1 min-w-0 truncate font-medium text-gray-900">
        {row.name}
      </span>

      {/* Price */}
      <span className="w-20 text-right text-gray-600 flex-shrink-0 font-mono text-xs">
        {priceFormatted}
      </span>

      {/* Stock — inline editable */}
      <div className="w-24 flex-shrink-0 flex items-center justify-end gap-1">
        {editing ? (
          <>
            <input
              type="number"
              value={draftStock}
              onChange={(e) => setDraftStock(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              autoFocus
              className="w-14 px-1 py-0.5 text-xs border border-indigo-300 rounded text-right font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
              min={0}
            />
            <button
              onClick={saveEdit}
              className="text-green-600 hover:text-green-800 text-xs font-bold"
              title="Save"
            >
              ✓
            </button>
            <button
              onClick={cancelEdit}
              className="text-red-400 hover:text-red-600 text-xs"
              title="Cancel"
            >
              ✕
            </button>
          </>
        ) : (
          <button
            onClick={startEdit}
            className={`font-mono text-xs ${
              row.stock === 0
                ? "text-red-600 font-bold"
                : row.stock < 10
                ? "text-amber-600"
                : "text-gray-700"
            } hover:text-indigo-600 hover:underline cursor-pointer`}
            title="Click to edit stock"
          >
            {row.stock === 0 ? "✕ 0" : row.stock}
          </button>
        )}
      </div>

      {/* Rating */}
      <span className="w-12 text-right text-gray-500 text-xs flex-shrink-0">
        ★{row.rating.toFixed(1)}
      </span>

      {/* Revenue */}
      <span className="w-24 text-right text-green-700 text-xs font-mono flex-shrink-0">
        {revenueFormatted}
      </span>

      {/* Order count */}
      <span className="w-12 text-right text-gray-400 text-xs flex-shrink-0">
        {row.orderCount}x
      </span>
    </div>
  );
});

Row.displayName = "GridRow";

export { Row };
