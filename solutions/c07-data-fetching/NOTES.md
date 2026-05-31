# C07 — Implementation Notes

> **File:** `solutions/c07-data-fetching/NOTES.md`

---

## Waterfall vs. Parallel Timing

The `@/lib/data` repository adds a random delay of 30–120ms per call to
simulate real database latency.

### Waterfall route (`/c07-data-fetching/waterfall`)

Three sequential awaits: product, then categories, then reviews.

Expected timing:
- Best case: 30 + 30 + 30 = **90ms**
- Average:   75 + 75 + 75 = **225ms**
- Worst case: 120 + 120 + 120 = **360ms**

Each fetch must wait for the previous one to resolve before starting. The
latencies add because the promises are chained implicitly by sequential awaits.

### Parallel route (`/c07-data-fetching/parallel`)

Three fetches started simultaneously with `Promise.all`.

Expected timing:
- Best case:  max(30, 30, 30) = **30ms**
- Average:    max(75, 75, 75) = **75ms**
- Worst case: max(120, 120, 120) = **120ms**

All three fetches start at t=0. The page waits only for the slowest one. Since
they all use the same delay range (30–120ms), the expected finish time is
E[max(U1, U2, U3)] where each Ui ~ Uniform(30, 120).

For Uniform(30, 120), E[max(U1, U2, U3)] = 30 + 3/4 × (120-30) = 30 + 67.5 ≈ **97ms**.
That is still ~2.3× faster than the sequential average of 225ms.

With more diverse latencies (some fast reads, some slow) the savings grow:
a mix of 30ms + 80ms + 100ms takes 210ms sequential but only 100ms parallel.

### Observed timings (dev server, local machine)

The `WaterfallData` and `ParallelData` components both render `Date.now()` timing
in their output. Run both routes in the browser and compare the rendered total:

| Route | Typical observed range |
|-------|------------------------|
| /waterfall | 90ms – 360ms |
| /parallel  | 30ms – 120ms |

The exact values vary because `Math.random()` is used in the delay. Reload
each route several times to see the range.

---

## Request Memoisation — Proof

The main `/c07-data-fetching` page renders an `underlyingFetchCount` counter.

- With `getProductByIdMemo` (wrapped in `React.cache()`): count = 1 after three
  component calls with the same id.
- With `getProductRaw` (not memoised): count = 3 after three calls.

The counter is implemented as a module-level variable in `_lib/queries.ts` that
increments inside the raw data accessor. Because Next.js evaluates Server
Component modules fresh per request, the counter resets automatically at the
start of each request.

---

## Preload Pattern — Timing

The preload calls on the index page (`preloadProduct`, `preloadCategories`)
are fire-and-forget. Their timing advantage is most visible when:

1. The parent component has significant synchronous work before rendering children.
2. The child components are deep in the tree (more render time before they mount).

In this demo the parent is trivial (mostly JSX), so the savings are modest. In
a real app with complex parent logic (auth checks, config loading, layout
computation), the preload savings can be 30–80ms per deep child.

---

## Design Decisions

### Why `underlyingFetchCount` is a module-level var (not a React ref)

Server Components do not have React state or refs. A module-level variable
works because Next.js isolates each request into its own module evaluation
context (the module is re-evaluated per request in the App Router). The
variable is reset at the start of each request automatically, which is exactly
the semantics we want for a per-request call counter.

### Why `resetFetchCount()` is called inside `MemoDemo`

In a real three-component scenario (three separate children each calling the
accessor once), the reset would happen at the parent level before any child
renders. Here, all three calls are consolidated in one component for clarity.
The reset is placed at the top of `MemoDemo` to zero the counter before the
three demonstration calls, producing a clean `1` reading.

### Why the waterfall uses `listReviewsMemo` (memoised) but the others are raw

`listReviewsMemo` and `getProductRaw`/`listCategoriesRaw` are both used in the
waterfall. The memoisation of reviews does not affect the waterfall timing
because in a single-component waterfall there is only one call to each accessor
— there is nothing to deduplicate. The memoised vs raw distinction only matters
when the same accessor is called multiple times in the same request.

### Why `solutions/` re-imports from the challenge `_lib`

The solutions directory re-uses the `_lib/queries.ts` from the challenge dir
(via relative import). This ensures the timing demos use the same simulated
latency as the challenge pages. A real solution would not cross-import like
this — in a production codebase, each module would have its own copy. Here we
do it to avoid duplicating the demo infrastructure.

### Why there is no `challenge.config.json` in solutions/

The registry (`lib/registry.ts`) only globs for
`app/(challenges)/[^_]*/_meta/challenge.config.json`. The solutions directory
is NOT part of the registry discovery — it is reference material, not a
routable challenge.
