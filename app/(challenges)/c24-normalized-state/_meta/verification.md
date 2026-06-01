# Verification Checklist — C24 Large-scale Normalized State: Seller Data Grid

Manual test steps to verify the challenge works correctly. Run these after implementing your
solution. Each section maps to an acceptance criterion in `spec.md`.

---

## Setup

1. Start the dev server: `npm run dev`.
2. Open the page at `/c24-normalized-state`.
3. Open browser DevTools → **Console**, **Elements**, and **Performance** tabs.
4. Install the **React Developer Tools** extension (Chrome / Firefox) for the Profiler steps.

---

## Section 1 — Page Loads Without Errors

- [ ] The page loads without any console errors or TypeScript errors.
- [ ] The static header, problem description, and explainer sections render immediately
      (static shell — no spinner for these).
- [ ] The grid shows a skeleton while the server data loads, then the full grid appears.
- [ ] The grid shows **500 rows** in the footer: `Showing 500 of 500 rows — only N rendered in DOM`.

---

## Section 2 — Virtualization Verified

- [ ] Open DevTools → **Elements** tab → expand the scroll container.
  - **Expected:** Only ~15–30 `div` elements are visible in the DOM inside the scroll container,
    not 500.
- [ ] Scroll the grid slowly from top to bottom.
  - **Expected:** The same DOM nodes update their `transform: translateY(...)` style as you
    scroll — no new nodes are created or destroyed (watch the Elements tree).
  - **Expected:** The footer counter `N rendered in DOM` stays constant (typically 15–30).
- [ ] The scrollbar correctly represents the full 500-row height from the start.

---

## Section 3 — Re-render Instrumentation

- [ ] Click **&quot;Show render counts&quot;** in the toolbar.
  - **Expected:** Each visible row shows a small amber badge with a number (render count).
- [ ] Edit a stock value on one row (click the stock number, change it, press Enter or click ✓).
  - **Expected:** Only that one row&apos;s badge increments by 1.
  - **Expected:** All other visible rows&apos; badges stay at their previous count.
- [ ] Repeat the edit on a different row. Same outcome — only the edited row&apos;s count changes.

---

## Section 4 — Sort and Filter

- [ ] Change the sort selector to **&quot;Price ↓&quot;**.
  - **Expected:** The grid re-orders with the most expensive products first.
- [ ] Change the filter to **&quot;Low stock (1–9)&quot;**.
  - **Expected:** Only rows with stock between 1 and 9 are visible. The footer updates the count.
- [ ] Type a search term (e.g., part of a product name) in the search box.
  - **Expected:** The grid filters to matching rows only.
- [ ] Clear filters and search. Confirm the full 500 rows reappear.

---

## Section 5 — Selection

- [ ] Click the checkbox on a few individual rows.
  - **Expected:** Selected rows highlight in indigo. The toolbar shows &quot;N selected&quot;.
- [ ] Click **&quot;Select all N visible rows&quot;** at the top of the grid.
  - **Expected:** All visible rows check. The toolbar count matches the visible row count.
- [ ] Change the filter to **&quot;Selected only&quot;**.
  - **Expected:** Only the selected rows appear.
- [ ] Click **&quot;Select all&quot;** again (now as deselect-all when all are selected).
  - **Expected:** All checkboxes uncheck.

---

## Section 6 — React DevTools Profiler: Re-render Storm Comparison

This is the key learning verification step.

### Before fix (simulated)
To simulate the naive approach, temporarily swap the `Row.tsx` selector to:
```ts
const allRows = useGridStore(s => s.rows.allIds.map(id => s.rows.byId[id]));
const row = allRows.find(r => r.id === id);
```
Then profile an edit.

### Fixed approach (default)

- [ ] Open DevTools → **React DevTools Profiler** → click **Start profiling**.
- [ ] Edit one stock value in the grid.
- [ ] Stop profiling. Click on the recorded session.
- [ ] Examine the **Flame graph** or **Ranked chart**.
  - **Expected:** Only ONE `GridRow` component shows as rendered (highlighted). All others are
    greyed out (&quot;Did not render&quot;).
  - If using the Ranked chart, the rendered component list should contain only 1–3 components
    (DataGrid for store subscription updates, and 1 GridRow).

---

## Section 7 — TypeScript

- [ ] Run `npx tsc --noEmit` from the repo root.
  - **Expected:** Zero TypeScript errors for the c24 files.

---

## Section 8 — Code Understanding

- [ ] Read `_lib/normalize.ts` — `expandToCount`.
  Can you explain why the synthetic rows use `counter % realIds.length` as the template index?
  What would happen if `realIds` is empty?

- [ ] Read `_lib/selectors.ts` — `makeSelectRow`.
  Why is the factory function defined at module scope rather than inside the component?
  What would change if you moved it inside `Row`?

- [ ] Read `_lib/store.ts` — `updateStock`.
  Count the number of object spreads. Explain why each spread is necessary.
  Which of the three spread operations creates the new reference that Zustand detects?

- [ ] Read `_components/Row.tsx` — `React.memo`.
  The `showRenderCount` prop is passed from the parent DataGrid. If `showRenderCount` changes
  (user toggles the button), how many Row components re-render and why?
  (Hint: all of them will — this is an intentional trade-off in the demo for simplicity.)

- [ ] Read `_components/DataGrid.tsx` — `useDerivedIds`.
  `byId` is passed as an argument. When does the memoized sort re-run? Is this avoidable?
  What is the performance cost of re-sorting 500 items in JavaScript?
