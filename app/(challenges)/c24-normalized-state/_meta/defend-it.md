# Defend-It — C24 Large-scale Normalized State: Seller Data Grid

**Instructions:** Answer these questions from memory before opening the reference solution.
Commit your answers, then compare them to `solutions/c24-normalized-state/`. Focus on
articulating the *why* — the performance reasoning — not just the *what*.

---

## Q1 — The Array Update Problem

> You store 500 seller rows as a flat array: `state.rows: SellerRow[]`. A user edits the stock
> of row 42. You update it with `state.rows.map(r => r.id === id ? { ...r, stock: n } : r)`.
> How many Row components re-render, and why?

**Your answer:**

_Write here..._

**Model answer:**

All 500 Row components re-render. Here is the chain:

1. `Array.map()` creates a **new array reference** even for the 499 unchanged rows. Each
   element at index !== 42 is the same object (`r` is returned as-is), but the *array itself*
   is a new object.
2. If each Row subscribes to the store with an inline selector like
   `useStore(s => s.rows[index])`, Zustand evaluates whether the result changed. But the
   result is derived from the new array — Zustand sees a new reference for the entire slice.
3. Because all 500 Row subscriptions see a new slice reference (the new array), all 500 are
   notified and scheduled to re-render.
4. `React.memo` can prevent re-renders if the *props* are stable, but if the rows are passed
   as props from the parent (which reads the whole array), the parent re-renders first and
   passes new prop values down — `React.memo` fires anyway.

Result: 500 React renders for 1 logical data change. With 500 rows each taking 1–3ms, that is
500–1500ms of wasted CPU on a single keystroke.

---

## Q2 — The Normalized Fix

> Explain the normalized state shape `{ byId, allIds }`. Walk through what changes in memory
> when you update the stock of row 42 using a normalized point update. How many Row components
> re-render now, and why?

**Your answer:**

_Write here..._

**Model answer:**

The normalized shape stores entities in a plain object keyed by id:

```ts
rows: {
  byId: Record<string, SellerRow>,  // { "p-001": SellerRow, "p-002": SellerRow, ... }
  allIds: string[],                  // ["p-001", "p-002", ..., "p-500"] — iteration order
}
```

A point update:

```ts
rows = {
  ...state.rows,           // allIds unchanged (same reference — not in this spread)
  byId: {
    ...state.rows.byId,    // outer object is new (store detects a change)
    [id]: { ...state.rows.byId[id], stock: newStock }  // only this entry is a new object
  }
}
```

What changes in memory:
- `byId` is a **new object** (the spread), so the store knows something changed.
- `byId["p-042"]` is a **new object** (the updated row).
- `byId["p-001"]`, `byId["p-003"]`, ... all other entries point to the **same memory address**
  as before — no copy was made for them.

With fine-grained selectors (`makeSelectRow(id)` returning `state.rows.byId[id]`):
- Row 42&apos;s selector returns the new `byId["p-042"]` object → `Object.is` fails → re-render. 1 re-render.
- Every other Row&apos;s selector returns the same `byId[otherId]` reference as before → `Object.is`
  passes → Zustand does NOT notify → 0 re-renders for 499 rows.

Net: **1 re-render** for 500 logical rows.

---

## Q3 — Selector Stability

> Explain why passing an inline arrow function to `useStore` can cause a re-render storm even
> with the normalized state shape. Then show two ways to create a stable selector.

**Your answer:**

_Write here..._

**Model answer:**

Zustand compares selector functions by reference internally. If the selector is a new function
object on every render, Zustand cannot reuse the previous subscription — it treats every render
as a new subscription. Even if the underlying data did not change, the subscriber is notified
because Zustand cannot determine whether the new selector would return a different value than the
old one without calling it (and calling a new function produces a new result by identity).

In practice, even with normalized data, an inline selector defeats the optimization:

```ts
// BAD — new arrow function on every Row render
function Row({ id }) {
  const row = useGridStore(state => state.rows.byId[id]);
  // Every render: new function object → Zustand re-subscribes → all updates fire for this Row
}
```

**Fix 1 — Factory function at module scope:**

```ts
// stable: created once per id, not per render
export function makeSelectRow(id: string) {
  return (state: GridStore) => state.rows.byId[id];
}

function Row({ id }) {
  const selectRow = useMemo(() => makeSelectRow(id), [id]);
  const row = useGridStore(selectRow);
  // selectRow is the same function object as long as id does not change
}
```

**Fix 2 — Store the selector in a ref (alternative):**

```ts
const selectorRef = useRef(makeSelectRow(id));
// If id can change: update ref when id changes (rare in a grid)
const row = useGridStore(selectorRef.current);
```

`useMemo` (Fix 1) is the idiomatic React pattern — it is declarative and clearly expresses the
dependency (`[id]`).

---

## Q4 — React.memo vs. Fine-grained Subscriptions

> A colleague says: &quot;Just wrap Row in React.memo — that stops re-renders without normalization.&quot;
> Another says: &quot;Just use fine-grained selectors — React.memo is unnecessary overhead.&quot;
> Evaluate both claims.

**Your answer:**

_Write here..._

**Model answer:**

Both are incomplete on their own. The fix requires both together.

**React.memo alone (no normalization/fine-grained selectors):**

`React.memo` compares *props* by reference. If the parent DataGrid subscribes to the whole
rows array and passes `rows[index]` as a prop, the parent re-renders when any row changes
(because it sees a new array), and it passes a new prop value to every Row. `React.memo` sees
new props for all Rows and re-renders all of them. `React.memo` prevents re-renders caused by
*parent re-renders with unchanged props* — it does not fix the root cause (new array references).

**Fine-grained selectors alone (no React.memo):**

With normalized state and per-row selectors, only Row 42&apos;s Zustand subscription fires. But
if the parent DataGrid also reads from the store (e.g., to know the total row count or to pass
`visibleIds` to the virtualizer), the parent may re-render when any store update occurs. If the
parent passes any derived prop to Row (e.g., the row&apos;s index in the virtualizer), all Rows
receive a potentially-changed prop and React must check each one. Without `React.memo`, React
re-renders every Row in the tree even if the prop comparison would show no change.

**Together:** Fine-grained selectors prevent Zustand from notifying unrelated Row subscriptions.
`React.memo` prevents parent re-renders from cascading into Row components that received the same
props. Each guards a different re-render vector; both are needed for zero wasted renders.

---

## Q5 — Virtualization Trade-offs

> `@tanstack/react-virtual` renders only visible rows. Name two situations where virtualization
> could cause a problem, and describe how to handle each.

**Your answer:**

_Write here..._

**Model answer:**

**Problem 1: Variable row height + layout jumps**

If rows have different heights (e.g., expandable detail panels), the virtualizer&apos;s
`estimateSize` will be wrong for some rows. As the user scrolls past items with wrong estimates,
the total scroll height suddenly changes — the scrollbar &quot;jumps&quot;. Fix: use the `measureElement`
callback so the virtualizer dynamically measures each rendered row and updates its internal
size cache. This is more expensive than a fixed estimate but handles variable heights correctly.

**Problem 2: Focus and accessibility (screen readers)**

Screen readers walk the DOM in linear order. If only 25 of 500 rows are in the DOM, a screen
reader announces 25 items in a list with a total height that implies 500. Tab-focus may skip
rows that are not currently rendered. Fix: use ARIA attributes (`aria-rowcount`, `aria-rowindex`,
`aria-setsize`) to declare the full list size to assistive technology, and ensure focused rows
are scrolled into view (the virtualizer&apos;s `scrollToIndex` helps). For keyboard navigation,
intercept arrow keys and call `scrollToIndex` to bring the target row into the DOM before
focusing it.

---

## Q6 — Derived Views in Hooks vs. Store

> The DataGrid needs to show rows in a sort order the user can change. Should the sorted id
> list live in the Zustand store or be derived in a hook? Justify your answer.

**Your answer:**

_Write here..._

**Model answer:**

Derived in a hook (via `useMemo`), not in the store.

**Why not in the store:**

If the store holds `sortedIds: string[]`, every write action (stock update, selection toggle)
must also re-sort the full list. With 500 rows and a comparison-based sort, that is O(n log n)
work on every keystroke. Worse, the sort action would need to be called after every mutation —
more imperative code, more coupling, and the sorted list becomes a second source of truth that
can fall out of sync with `byId`.

**Why in a hook:**

`useMemo` computes the sorted list from `byId`, `allIds`, `sortKey`, and `filterKey` — all
read from the store. It only recomputes when one of those inputs changes. The sorted list is
ephemeral view state, not data state. It cannot be &quot;stale&quot; relative to the store because it is
always derived on-demand from the current store state.

The tradeoff: every stock update changes `byId`, which is a `useMemo` input, so the sort does
re-run after each edit. But sorting 500 ids is fast (a few milliseconds of JavaScript, no DOM
work), and this is vastly cheaper than the alternative re-render storm.
