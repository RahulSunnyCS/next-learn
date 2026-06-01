# C24 — Large-scale Normalized State: Seller Data Grid

**Tier 4 — Senior-level client state performance**

## The Problem This Challenge Teaches

Modern React applications that manage large datasets (100–10,000+ rows) face three compounding
performance problems when state is stored naively:

1. **Re-render storms** — storing rows as a flat array means updating one row calls `Array.map()`
   over all N rows. Every `Row` component sees a new array reference and re-renders, even though
   only 1 of N rows changed.

2. **Selector instability** — passing an inline arrow function as a Zustand selector creates a new
   function reference on every render. Zustand re-subscribes every time, notifying every subscriber
   on every store update regardless of whether the relevant slice changed.

3. **DOM overhead** — rendering 500 `<div>` elements (even if React skips their updates via
   `React.memo`) still burdens the browser's layout and paint engines. Off-screen rows waste memory
   and layout budget.

This challenge teaches the **three-part fix** that eliminates all three problems together.

---

## Learning Objectives

After completing this challenge you should be able to:

- [ ] Describe the normalized state shape (`{ byId, allIds }`) and explain why a point update
      (`byId[id] = newRow`) touches fewer references than `array.map()`.
- [ ] Explain why a selector function must be stable (same object reference) across renders and
      show two ways to achieve this: module-level factory functions and `useMemo` with `[id]` dep.
- [ ] Implement `React.memo` on a Row component and articulate why memo alone is insufficient
      without fine-grained subscriptions, and vice versa.
- [ ] Use `@tanstack/react-virtual` to virtualize a list, explaining the absolute-positioning trick
      that keeps only visible DOM nodes active.
- [ ] Diagnose a re-render storm using the React DevTools Profiler and the render-count
      instrumentation pattern (`useRef` counter visible as a badge).

---

## Acceptance Criteria

1. **Normalization** — Seller entities are stored in `{ byId: Record<string, SellerRow>, allIds: string[] }`.
   `_lib/normalize.ts` converts raw `Product[]` + `Order[]` into this shape in a single O(n) pass.
   Updating one row in the store does not touch other rows&apos; references.

2. **Memoized selectors** — Each `Row` component subscribes to the store with a per-row selector
   created by `makeSelectRow(id)` and memoized with `useMemo(() => makeSelectRow(id), [id])`.
   When row A changes, row B&apos;s selector returns the same `byId[B]` reference — Zustand&apos;s
   `Object.is` check passes — and row B does not re-render.

3. **Virtualization** — The grid uses `useVirtualizer` from `@tanstack/react-virtual`.
   Only the currently visible rows plus an overscan buffer are rendered as DOM nodes.
   The scroll container is sized to the full list height via the virtualizer&apos;s `getTotalSize()`.

4. **Render-count instrumentation** — Each `Row` component tracks its render count with a `useRef`
   counter. A toolbar toggle shows/hides render-count badges per row. After the fix, editing one
   row increments only that row&apos;s counter; all other rows stay at their current count.

5. **500-row scale** — The grid seeds from real `lib/data` products and synthesizes additional rows
   client-side (via `expandToCount`) to reach 500 entries, demonstrating virtualization benefits
   at realistic scale.

---

## Normalization: The Shape That Makes O(1) Updates Possible

### Before (flat array)

```ts
// State shape — O(n) to update one item
type State = { rows: SellerRow[] };

// Update one row: O(n) map — touches ALL rows
state.rows = state.rows.map(r =>
  r.id === id ? { ...r, stock: newStock } : r
);
// Result: new array reference for every Row subscription → re-render storm
```

### After (normalized — flat top-level keys)

```ts
// State shape — O(1) to update one item
// NOTE: byId and allIds are TOP-LEVEL store keys, NOT nested under `rows`.
// This flatness is critical for the Toolbar zero-wasted-render guarantee (see below).
type State = {
  byId:   Record<string, SellerRow>;  // O(1) lookup
  allIds: string[];                    // preserves iteration order; NEVER changes on a stock edit
};

// Update one row: O(1) point update — only this entry changes
state.byId = {
  ...state.byId,
  [id]: { ...state.byId[id], stock: newStock }
};
// Result: byId[otherId] references unchanged → Object.is holds → no re-render for others
// Result: state.allIds reference unchanged → selectRowCount / selectSelectedCount return
//         the same values → Toolbar does NOT re-render on stock edits (zero wasted renders).
```

The spread `{ ...state.byId, [id]: ... }` creates a new outer `byId` object, so the store knows
something changed. But `byId[otherId]` still points to the same memory address as before — no
copy was made. This is the key insight: **only the mutated entry's reference changes**.

### Why flat (no `rows` wrapper)?

If `byId` and `allIds` were nested under a `rows` key, a stock edit would produce a new `rows`
object reference. Every selector that reads `state.rows` — including `selectSelectedCount` and
`selectRowCount` which only need `allIds` — would see a new input and re-run, causing the Toolbar
to re-render even though neither the selection count nor the row count changed.

With the flat shape, `state.allIds` keeps its exact reference on a stock edit. `selectRowCount`
returns the same integer; `selectSelectedCount` iterates `allIds` (unchanged) and the boolean
values for each id (unchanged by `updateStock`). Both return the same number. Zustand&apos;s
`Object.is` comparison on the returned number passes → Toolbar does not re-render.
**Zero wasted renders is now provably true.**

---

## Memoized Selectors: Fine-grained Subscriptions

### The Unstable Selector Problem

```ts
// BAD — new function reference on every render
function Row({ id }) {
  const row = useGridStore(state => state.byId[id]);
  //                       ^^^^^^^^^^^^^^^^^^^^^^^
  //           New arrow function object every render!
  //           Zustand re-subscribes on every render.
  //           On any store update, ALL Row subscribers fire.
}
```

Zustand internally compares the previous selector with the new one using reference equality. If
the selector function is a new object every render, Zustand cannot tell whether the slice it
reads has changed — it must assume it has. All subscribers are notified.

### The Fix: Stable Selector Reference

```ts
// Option 1: factory function at module scope (stable by definition)
export function makeSelectRow(id: string) {
  return (state: GridStore) => state.byId[id];  // flat top-level key, not state.rows.byId
}

// Option 2: memoize inside the component (stable as long as id is stable)
function Row({ id }) {
  const selectRow = useMemo(() => makeSelectRow(id), [id]);
  const row = useGridStore(selectRow);
  //          Zustand sees the same function reference → only re-subscribes if id changes
  //          When byId[id] is unchanged, Object.is passes → no re-render
}
```

Combined with `React.memo(Row)`, this creates a two-layer guard:
1. Zustand layer: only notifies this row if `byId[id]` changed.
2. React.memo layer: even if the parent re-renders, the Row is skipped unless its props changed.

---

## Virtualization: Only Render What Is Visible

`@tanstack/react-virtual` works by:

1. Measuring the scroll container height (via a ref).
2. Computing which index range `[startIndex, endIndex]` is currently visible based on `scrollTop`.
3. Rendering only those items plus an `overscan` buffer above and below.
4. Positioning each rendered item with `position: absolute; transform: translateY(offsetStart)`.
5. Sizing the inner container to `getTotalSize()` (full list height) so the scrollbar is correct.

```tsx
const virtualizer = useVirtualizer({
  count: visibleIds.length,       // total number of logical items
  getScrollElement: () => ref.current, // the scroll container
  estimateSize: () => 44,         // fixed row height (px)
  overscan: 10,                   // extra rows above/below viewport
});

// Render only virtual items
virtualizer.getVirtualItems().map(item => (
  <Row
    key={visibleIds[item.index]}
    id={visibleIds[item.index]}
    style={{
      position: "absolute",
      top: 0,
      transform: `translateY(${item.start}px)`,
      height: "44px",
    }}
  />
))
```

The browser creates ~25 DOM nodes regardless of list length. As the user scrolls, existing nodes
get new `transform` values — no create/destroy cycles, no layout thrashing.

---

## Diagnosing Re-render Storms with the React DevTools Profiler

### Step-by-step diagnosis

1. Install the **React Developer Tools** browser extension.
2. Open DevTools → **Profiler** tab → click **Start profiling**.
3. Edit a stock value in the grid.
4. Click **Stop profiling**.
5. Examine the **Flame graph**:
   - **Before the fix**: every `GridRow` bar appears with a blue/yellow highlight. All 500 rows
     rendered, each taking 1–3ms. Total: 500–1500ms of wasted work.
   - **After the fix**: only one `GridRow` bar is highlighted. The other 499 show as grey
     (skipped). Total: ~1–5ms.

### The render-count badge (in-app)

Enable **&quot;Show render counts&quot;** in the grid toolbar. Each row shows a number badge that increments
on every React render. After editing one row:

- **Naive approach**: all 500 counters increment.
- **Fixed approach**: only the edited row&apos;s counter increments.

This makes the re-render storm observable without DevTools — useful for screencasts and teaching.

---

## Derived Views: Why Sort/Filter Live in Hooks, Not the Store

Sorting and filtering are **view concerns** — they transform the normalized data into a display
order but should never be stored alongside the data itself. Storing a pre-sorted array means
every mutation must re-sort all N rows.

Instead:

```ts
// In the store: raw normalized data
rows: { byId, allIds }

// In the DataGrid: derived view (memoized, recomputes only when inputs change)
const visibleIds = useDerivedIds(byId, allIds, sortKey, filterKey, searchQuery);
```

`useDerivedIds` wraps its computation in `useMemo`. It re-runs only when `byId`, `allIds`,
`sortKey`, `filterKey`, or `searchQuery` change — not on every parent render. The sort is applied
to a copy of the filtered id array (never mutating `allIds`) so the store remains the single
stable source of truth.

---

## Files in This Challenge

```
app/(challenges)/c24-normalized-state/
├── page.tsx                      ← static shell + Suspense hole (GridDataLoader)
├── _components/
│   ├── DataGrid.tsx              ← "use client" — virtualizer + toolbar + store bootstrap
│   └── Row.tsx                   ← "use client" — React.memo + fine-grained subscription
├── _lib/
│   ├── normalize.ts              ← Normalized<T> types, buildNormalizedRows, expandToCount
│   ├── selectors.ts              ← makeSelectRow, useDerivedIds, aggregate selectors
│   └── store.ts                  ← Zustand store (GridStore) with normalized rows
└── _meta/
    ├── spec.md                   ← this file
    ├── defend-it.md              ← from-memory questions (fill in before viewing solution)
    ├── verification.md           ← manual test checklist
    ├── challenge.config.json
    └── challenge.config.ts
```
