# Verification Checklist — TanStack Query

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly. Run each item in order. Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 with no type errors.
- [ ] `npm run build` exits 0 with no build errors.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).
- [ ] No hydration mismatch warnings (`console.error`) in the browser console.

---

## Part A — Search As You Type

- [ ] **A1 — Basic search** — Navigate to `/c14-tanstack-query`. Type `shoe`
  in the search box. Results appear after ~500ms. Each result shows name,
  price, and rating.

- [ ] **A2 — Debounce** — Open DevTools → Network. Type `shoe` one letter at
  a time rapidly. Observe that requests fire only when you PAUSE for ~500ms,
  not on every keystroke. Total requests should be 1–2, not 4.

- [ ] **A3 — Cache hit** — Type `shoe`, wait for results. Clear the input.
  Type `shoe` again. Observe: NO new network request fires (status badge shows
  `"ready"` immediately, not `"loading"`). The data was served from
  `staleTime` cache.

- [ ] **A4 — Different queries** — Type `laptop`. A new request fires (different
  query key). Type `shoe` again within 30s. No request fires again (separate
  cache entry per query).

- [ ] **A5 — Empty query** — Clear the input completely. Results show all
  products (up to limit 8). No error is shown.

- [ ] **A6 — Request endpoint** — In DevTools → Network, confirm the fetch goes
  to `/c14-tanstack-query/api/search?limit=8&q=...`. Status is 200. Response
  is `{ results: [...], total: number, query: string }`.

---

## Part B — Infinite Scroll

- [ ] **B1 — First paint (no loading spinner)** — Open DevTools → Network
  BEFORE loading `/c14-tanstack-query`. Hard-refresh the page (`Ctrl+Shift+R`).
  Observe: the infinite list renders page 1 items IMMEDIATELY with no loading
  spinner. There is NO `GET /api/products?page=1` request in the Network tab
  at initial load time (server-prefetched data was hydrated).

- [ ] **B2 — Page count on cards** — Each product card shows a page badge
  (e.g. `pg 1`, `pg 2`). Cards in the first 6 positions show `pg 1`.

- [ ] **B3 — Scroll to load more** — Scroll to the bottom of the product list.
  Observe a new `GET /api/products?page=2&pageSize=6` request in Network.
  6 new cards appear with badge `pg 2`. The 6 `pg 1` cards are still visible.

- [ ] **B4 — No duplicates** — Scroll through all pages. No product appears
  twice (verify by product name).

- [ ] **B5 — End of list** — After all pages are loaded, the sentinel text
  `"All N products loaded"` appears. No further network requests fire on scroll.

- [ ] **B6 — Header count** — The `"Showing X of Y products"` counter updates
  correctly as pages load.

---

## Part C — HydrationBoundary

- [ ] **C1 — No console errors** — Open DevTools → Console. Hard-refresh
  `/c14-tanstack-query`. There are NO red `console.error` messages about
  hydration mismatches or TanStack Query dehydration errors.

- [ ] **C2 — RSC payload** — In DevTools → Network, find the initial document
  request for `/c14-tanstack-query`. In the Response tab, search for
  `"c14-products"`. You should see the dehydrated query data embedded in the
  RSC payload (streaming JSON), confirming the prefetch reached the client.

---

## Part D — Route Handlers

- [ ] **D1 — Search handler** — `GET /c14-tanstack-query/api/search?q=shoe&limit=5`
  returns HTTP 200 JSON with `{ results: [...], total: number, query: "shoe" }`.
  `results` has at most 5 items.

- [ ] **D2 — Search bad limit** — `GET /c14-tanstack-query/api/search?limit=999`
  returns HTTP 400 with `{ error: "Invalid 'limit' parameter: ..." }`.

- [ ] **D3 — Products handler** — `GET /c14-tanstack-query/api/products?page=1&pageSize=6`
  returns HTTP 200 JSON with `{ items, page, pageSize, totalCount, totalPages, hasNextPage }`.
  `hasNextPage` is `true` if there are more pages.

- [ ] **D4 — Last page** — `GET /c14-tanstack-query/api/products?page=9999&pageSize=6`
  returns HTTP 200 with `hasNextPage: false` (last available page is returned).

---

## Part E — Architecture

- [ ] **E1 — No app/layout.tsx edit** — Confirm `app/layout.tsx` does NOT
  import `QueryClientProvider` or `QueryProvider`:
  ```bash
  grep -n "QueryProvider\|QueryClient" app/layout.tsx
  ```
  Result must be empty (or non-existent match).

- [ ] **E2 — Local provider** — The `QueryClientProvider` is in
  `app/(challenges)/c14-tanstack-query/_components/QueryProvider.tsx` and
  is rendered at the top of `page.tsx`.

- [ ] **E3 — No @/lib/data in client components** — Client components
  (`"use client"`) do NOT import from `@/lib/data` directly:
  ```bash
  grep -rn "from \"@/lib/data\"" "app/(challenges)/c14-tanstack-query/_components/"
  ```
  Result must be empty.

- [ ] **E4 — NOTES.md exists** — `solutions/c14-tanstack-query/NOTES.md` exists
  and contains the TanStack Query vs. RSC vs. `'use cache'` decision framework.

---

## TypeScript

- [ ] `npx tsc --noEmit` exits 0.
- [ ] No ESLint errors: `npm run lint` exits 0 (or no errors for c14 files).

---

## Challenge Index

- [ ] Navigate to `/` (the challenge index). The challenge
  `"TanStack Query: Client Data Management"` appears with slug `c14-tanstack-query`
  and tier 3.
