# C24 — Solution Notes: Large-scale Normalized State (Seller Data Grid)

## What This Challenge Builds

A 500-row seller data grid that demonstrates three performance techniques working together:
**entity normalization**, **memoized Zustand selectors**, and **virtual list rendering**.
Each technique solves a distinct problem; removing any one of them brings back a re-render
storm or DOM overhead.

---

## §1 — The Three-Part Fix (Why All Three Are Needed)

### Part 1: Normalization (`_lib/normalize.ts`)

**Problem solved:** O(n) array mutations cause new array references for every row, notifying
all N subscribers regardless of which row changed.

**How:** Store rows in `{ byId: Record<string, SellerRow>, allIds: string[] }`. A point update
spreads only the top-level objects:

```ts
byId = { ...state.rows.byId, [id]: updatedRow }
```

`byId[otherId]` is never copied — it points to the same object as before. Zustand's
`Object.is` check for other rows passes → no notification → no re-render.

**Does NOT fix alone:** Row components still need to subscribe with a stable, fine-grained
selector. Without Part 2, every Row subscribes to the whole `byId` map, which changes
reference on every update.

### Part 2: Memoized selectors (`_lib/selectors.ts`)

**Problem solved:** Inline arrow function selectors create new function references on every
render, causing Zustand to re-subscribe and re-notify all rows on any store update.

**How:** `makeSelectRow(id)` returns a selector that reads only `state.rows.byId[id]`.
Combined with `useMemo(() => makeSelectRow(id), [id])` in the Row component, the selector
function object is stable across renders. Zustand sees the same function → same subscription
→ only notifies when `byId[id]` changes.

**Does NOT fix alone:** Even with fine-grained subscriptions, if the parent DataGrid
re-renders (e.g., because the toolbar state changed), React will re-render all child Row
components unless they are wrapped in `React.memo`.

### Part 3: React.memo + Virtualization (`_components/Row.tsx`, `_components/DataGrid.tsx`)

**`React.memo`** prevents parent re-renders from cascading into Row components that received
the same props. Combined with Part 2, this creates a two-layer guard:
- Zustand layer: only the updated row's subscription fires.
- React.memo layer: only components with changed props re-render.

**Virtualization** (`@tanstack/react-virtual`) addresses DOM overhead — even if React.memo
prevents JS-level re-renders, having 500 DOM nodes causes layout and paint cost. The
virtualizer keeps only ~15–30 DOM nodes alive, repositioning them with CSS transforms as
the user scrolls.

---

## §2 — Re-render Count Analysis

With the render-count badge enabled (`"Show render counts"` toolbar toggle), here is what
you observe when editing one row's stock:

| Approach | Components that re-render | Render count per edit |
|---|---|---|
| **Naive (flat array + inline selector)** | All 500 visible GridRow + DataGrid | 501 |
| **Normalized + memoized selector** | 1 GridRow + DataGrid (store subscription) | 2 |
| **Normalized + memoized selector + React.memo** | 1 GridRow only | 1 |

The DataGrid itself re-renders when `byId` changes (it reads `byId` as input to
`useDerivedIds`). This is unavoidable and acceptable — one DataGrid re-render per edit is
cheap. The key win is the 499 GridRow components that do NOT re-render.

### Why DataGrid re-renders on every stock update

`DataGrid` reads `byId` from the store (as input to `useDerivedIds`). `updateStock` creates
a new `byId` object reference (spread pattern). Zustand notifies DataGrid's subscription.
DataGrid re-renders. `useDerivedIds`' `useMemo` re-runs its comparison function (inputs
changed) and re-sorts 500 ids — approximately 0.5ms.

This is the correct trade-off: **0.5ms sort in DataGrid vs. 500 × 1-3ms renders in Rows**.
The sort is fast because it is pure JavaScript with no DOM interaction.

---

## §3 — Virtualization: How @tanstack/react-virtual Works

The virtualizer uses a classic "overscan window" technique:

1. `parentRef` points to the scroll container (`<div style={{ height: "480px" }}`).
2. The virtualizer watches `scrollTop` via a scroll listener on the container.
3. Given `count` total items and `estimateSize: () => 44` (44px fixed row height), it
   computes: `startIndex = Math.floor(scrollTop / 44)`, `endIndex = startIndex + Math.ceil(480 / 44) + overscan`.
4. `getVirtualItems()` returns only the items in `[startIndex - overscan, endIndex + overscan]`.
5. Each item has a `start` offset: `item.start = item.index * 44`. This becomes the
   `transform: translateY(item.start)` CSS value.
6. The inner container height is set to `getTotalSize()` = `count * 44`. This gives the
   scrollbar the correct height, even though only ~25 DOM nodes exist.

**Fixed vs. dynamic heights:** This challenge uses fixed 44px rows (`estimateSize: () => 44`)
for simplicity. For variable heights, use `measureElement` to let the virtualizer measure each
rendered item and cache its actual height. The virtualizer then updates `start` offsets
dynamically as measurements arrive.

---

## §4 — Derived View: Why useDerivedIds Lives in a Hook

The question every learner asks: "Why isn't the sorted id list stored in Zustand?"

The answer is about **update granularity**:

- Every `updateStock` call triggers a store update. If the sorted list were in the store, the
  sort action would need to be called on every stock update (the stock change could affect
  sort order if sorted by stock). That is O(n log n) on every keystroke.

- Worse, Zustand would notify every component that subscribes to the sorted list — which
  is the entire DataGrid (it uses the list to render virtual rows). This causes a cascade
  regardless of memoization.

- `useMemo` in `useDerivedIds` is smarter: it recomputes only when its dependencies
  (`byId`, `allIds`, `sortKey`, `filterKey`, `searchQuery`) change. The `useMemo` result is
  a stable array reference until inputs change — so DataGrid does not re-render when the
  computed sorted list is identical.

The trade-off: `byId` changes on every `updateStock`, so `useDerivedIds` does re-sort on
every edit. At 500 rows, this is ~0.5ms — negligible. At 50,000 rows, you would move the
sort to a Web Worker and use a pagination/windowing approach for the data layer too.

---

## §5 — Server Data Flow

```
Server (GridDataLoader)
│
├── await connection()     — opt into dynamic render path
├── listProductsBySeller("u-seller-1")  ─┐
├── listOrdersForUser("u-buyer-1")      ─┘  await Promise.all
│
├── buildNormalizedRows(products, orders)
│   └── One O(n) pass: builds byId map, aggregates revenue/orderCount per product
│
├── expandToCount(baseRows, 500)
│   └── Synthesizes synthetic rows from real product templates
│       until allIds.length === 500
│
└── <DataGrid initialRows={rows} />
    └── Serialized as RSC prop (JSON-serializable plain object)

Client (DataGrid)
│
├── useEffect → loadRows(initialRows)   — seeds Zustand store once on mount
├── useGridStore(s => s.rows.byId)      — read byId for useDerivedIds
├── useDerivedIds(...)                  — compute sorted/filtered id list
│
└── useVirtualizer(...)
    └── getVirtualItems().map(item => <Row id={visibleIds[item.index]} />)
        └── Row: useMemo(() => makeSelectRow(id), [id])
                  useGridStore(selectRow)  — fine-grained subscription
```

---

## §6 — Files Touched / Created

| File | Purpose |
|---|---|
| `app/(challenges)/c24-normalized-state/page.tsx` | Static shell + Suspense hole (GridDataLoader) |
| `_components/DataGrid.tsx` | Client: virtualizer, toolbar, store bootstrap |
| `_components/Row.tsx` | Client: React.memo + fine-grained subscription + render counter |
| `_lib/normalize.ts` | `Normalized<T>` type, `buildNormalizedRows`, `expandToCount` |
| `_lib/selectors.ts` | `makeSelectRow`, `useDerivedIds`, aggregate selectors |
| `_lib/store.ts` | Zustand store with normalized rows + O(1) mutations |
| `_meta/challenge.config.json` | id:24, tier:4, slug, topics |
| `_meta/challenge.config.ts` | Typed re-export |
| `_meta/spec.md` | Full spec: normalization, selectors, virtualization, profiler |
| `_meta/defend-it.md` | 6 from-memory questions with model answers |
| `_meta/verification.md` | Manual test checklist (8 sections) |
| `solutions/c24-normalized-state/NOTES.md` | This file |
| `solutions/c24-normalized-state/page.tsx` | Annotated reference page |
| `solutions/c24-normalized-state/_lib/selectors.ts` | Heavily commented selectors reference |

**Files NOT touched** (as required by task contract):
- `lib/data/**` — shared data layer, read-only
- `app/layout.tsx` — root layout
- `package.json`, `next.config.ts`, `tsconfig.json` — project config
- All other challenge directories
