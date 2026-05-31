# Challenge Spec — TanStack Query: Client Data Management

> **File:** `app/(challenges)/c14-tanstack-query/_meta/spec.md`

---

## Learning Goals

This challenge teaches when to reach for TanStack Query and how to use its
three core patterns in a Next.js App Router project:

1. **useQuery + debouncing** — search-as-you-type with request deduplication
   and `staleTime`-based client caching.

2. **useInfiniteQuery** — paginated infinite scroll that appends pages without
   replacing previously-loaded items.

3. **Server-prefetch + HydrationBoundary** — prefetch on the server inside a
   Server Component, dehydrate the cache, and rehydrate on the client so the
   first paint has data with no loading flash.

4. **TanStack Query vs. RSC vs. `'use cache'`** — the "who owns the data"
   decision: when each approach is correct and when you should NOT reach for TQ.

---

## Scenario

Nextmart needs two client-driven UI features:

1. A **product search box** that queries as the user types, deduplicated and
   cached so rapid keystrokes do not hammer the server and repeated searches
   return instantly from cache.

2. An **infinite-scroll product catalogue** that loads the next page when the
   user scrolls to the bottom, with page 1 pre-populated on first paint via
   server prefetch (no loading spinner on initial load).

---

## Acceptance Criteria

1. `npx tsc --noEmit` exits 0 (no TypeScript errors).

2. `next build` exits 0 with no type or lint errors.

3. **Search deduplication and caching** — Typing the same query twice within
   30 seconds shows the result from cache with zero new network requests
   (observable in DevTools → Network).

4. **Debounced query key** — Rapid keystrokes fire at most one request per
   500ms pause (observable in DevTools → Network).

5. **Infinite scroll** — Scrolling to the bottom of the product list loads the
   next page. Items from page 1 remain visible (not replaced). The page badge
   on each card updates correctly.

6. **No duplicate items** — Scrolling quickly through multiple pages never
   shows a product appearing twice.

7. **Hydration boundary** — On first load, the infinite list renders page 1
   immediately with no loading spinner (server-prefetched data is hydrated
   before the client mounts). No `console.error` hydration mismatch warnings.

8. **Local QueryProvider** — `app/layout.tsx` is NOT modified. The
   `QueryClientProvider` is scoped to the c14 subtree via `QueryProvider.tsx`.

9. **Local Route Handlers** — Data is served by `api/search/route.ts` and
   `api/products/route.ts` under the c14 challenge dir. `@/lib/data` is never
   imported from client components (only from Route Handlers and server-side
   `_lib/`).

10. **NOTES.md** — `solutions/c14-tanstack-query/NOTES.md` documents when to
    choose TanStack Query vs. RSC server fetch vs. `'use cache'` with concrete
    criteria.

---

## Part A — Search As You Type

### Starting Point

- `_components/SearchAsYouType.tsx` — the `"use client"` component.
- `api/search/route.ts` — the Route Handler it fetches.
- `_lib/search-route.ts` — validation + data-access layer.

### Tasks

- [ ] **A1** — Open DevTools → Network. Type `shoe` quickly, one letter at a
  time. Observe that requests fire only after you pause for ~500ms. Count the
  requests — they should be far fewer than the number of characters typed.

- [ ] **A2** — Type `shoe`, wait for results, clear the input, type `shoe`
  again. Observe that the second time no network request fires (cache hit).
  The status badge changes from `"loading"` to `"ready"` instantly.

- [ ] **A3** — Open two browser tabs to `c14-tanstack-query`. Type `shoe` in
  both at the same moment. Observe that only ONE network request fires (request
  deduplication — TanStack Query coalesces in-flight queries with the same key).
  *(Note: dedup works within a single page because the QueryClient is per-page.
  Cross-tab dedup requires a shared QueryClient via BroadcastChannel or similar.)*

- [ ] **A4** — Explain in your own words: what does `staleTime` control?
  What is the difference between `isLoading` and `isFetching`?

---

## Part B — Infinite Scroll

### Starting Point

- `_components/InfiniteList.tsx` — the `"use client"` component.
- `api/products/route.ts` — the paginated Route Handler.

### Tasks

- [ ] **B1** — On first load, observe the Network tab. The product list renders
  immediately with no loading spinner. Confirm there is NO `GET /api/products?page=1`
  request at load time — data was injected via `HydrationBoundary`.

- [ ] **B2** — Scroll to the bottom of the list. Observe a new request for
  `page=2`. The items from page 1 remain visible above the new items (no
  replacement).

- [ ] **B3** — Keep scrolling. After the last page loads, the sentinel is no
  longer observed (no further requests fire).

- [ ] **B4** — Read `page.tsx`'s `PrefetchedProductList` component. In your own
  words: what is the difference between `prefetchInfiniteQuery` and `prefetchQuery`
  for the HydrationBoundary pattern? What goes wrong if you use the wrong one?

---

## Part C — Server Prefetch + Hydration

### Starting Point

- `page.tsx` → `PrefetchedProductList` (Server Component inside `<Suspense>`).
- `_components/QueryProvider.tsx` — the client provider.

### Tasks

- [ ] **C1** — Read `PrefetchedProductList` in `page.tsx`. Trace the
  server-prefetch flow:
  1. `connection()` call
  2. `new QueryClient()` (throw-away)
  3. `prefetchInfiniteQuery()`
  4. `dehydrate(queryClient)`
  5. `<HydrationBoundary state={dehydrated}>`
  6. Client `useInfiniteQuery` finds data in cache, renders without fetch

- [ ] **C2** — Comment out the `await connection()` call in `PrefetchedProductList`
  and run `next build`. Observe the Cache Components error:
  *"Uncached data was accessed outside of `<Suspense>`"* (or similar). Restore
  the call and rebuild.

- [ ] **C3** — Temporarily replace `prefetchInfiniteQuery` with `prefetchQuery`
  and reload the page. Observe the loading spinner on first paint (cache miss —
  the key structure does not match `useInfiniteQuery`'s internal format).
  Restore `prefetchInfiniteQuery`.

---

## Part D — When to Use TanStack Query

### Tasks

- [ ] **D1** — Read `solutions/c14-tanstack-query/NOTES.md`. Summarise the
  decision criteria in your own words.

- [ ] **D2** — For each scenario below, decide: RSC server fetch, `'use cache'`
  + RSC, or TanStack Query?

  a) A product detail page — data is the same for every visitor, fetched once.
  b) A dashboard that polls every 30 seconds for the latest order status.
  c) A search box that queries as the user types.
  d) A list of categories in the site header (changes once a week).
  e) An infinite-scroll feed of real-time activity events.

---

## Hints

<details>
<summary>Hint 1 — Why prefetchInfiniteQuery, not prefetchQuery?</summary>

TanStack Query stores infinite query pages differently than regular query
results. A regular `useQuery` result is stored as `{ data }`. An infinite query
is stored as `{ data: { pages: [...], pageParams: [...] } }`. If you use
`prefetchQuery` on the server but `useInfiniteQuery` on the client, the key
lookup succeeds but the shape is wrong — the client sees `data.pages` as
`undefined` and re-fetches. Always use `prefetchInfiniteQuery` when the client
uses `useInfiniteQuery`.

</details>

<details>
<summary>Hint 2 — Why connection() before data reads in cacheComponents mode?</summary>

`@/lib/data` calls `Math.random()` for simulated latency. In `cacheComponents:
true` mode, any non-deterministic call during the static prerender pass causes
a build error unless it runs AFTER a dynamic signal. `connection()` (from
`next/server`) is that signal — it opts the component into dynamic (per-request)
rendering, so everything after the `await connection()` line runs at request
time, not at build time.

</details>

<details>
<summary>Hint 3 — staleTime vs. gcTime (cacheTime)</summary>

`staleTime`: how long a cached result is considered "fresh". During this window,
`useQuery` returns cached data immediately without firing a background refetch.
After `staleTime` expires, the data is "stale" — it still renders from cache
immediately, but a background refetch fires to update it.

`gcTime` (formerly `cacheTime`): how long an INACTIVE cache entry is kept in
memory. An entry becomes inactive when no subscriber (no mounted component) is
using it. After `gcTime` the entry is garbage-collected.

A common pattern: `staleTime: 30_000` (data is fresh for 30s) + `gcTime:
300_000` (keep entries for 5m after going inactive). This means revisiting the
same data within 5 minutes shows it instantly from cache, and a background
refetch only runs if 30s have passed.

</details>
