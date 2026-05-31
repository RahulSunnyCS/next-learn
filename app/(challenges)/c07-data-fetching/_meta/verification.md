# Verification Checklist — C07 Data Fetching Patterns

> **Purpose:** A human-runnable checklist to verify that the challenge is
> correctly implemented and all three patterns are observable. Run each item
> in order.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 with no TypeScript errors.
- [ ] `npm run build` exits 0 with no build errors.
- [ ] No file under `app/(challenges)/c07-data-fetching/` contains
      `export const dynamic`, `export const revalidate`, `export const fetchCache`,
      or `export const dynamicParams` (all disallowed under `cacheComponents: true`).
- [ ] Dev server starts with `npm run dev` and `/c07-data-fetching` loads with
      no console errors.

---

## Pattern 1 — Request Memoisation

- [ ] Navigate to `/c07-data-fetching`.
- [ ] The page renders a memoisation demo section that calls `getProductByIdMemo`
      from three different Suspense holes.
- [ ] The UI shows `underlyingFetchCount = 1`, confirming that three component
      calls resulted in one underlying data read.
- [ ] Change one call to use `getProductRaw` instead (temporary), reload — the
      count changes to 2 (or 3 if all three are raw). Revert the change.
- [ ] The UI explains `React.cache()` vs `'use cache'` in plain English.

---

## Pattern 2 — Waterfall vs. Parallel

- [ ] Navigate to `/c07-data-fetching/waterfall`.
- [ ] The page renders three data items (product, categories, reviews).
- [ ] The page source (or a comment in the rendered output) shows sequential
      `await` calls, not `Promise.all`.
- [ ] Navigate to `/c07-data-fetching/parallel`.
- [ ] The page renders the same three data items.
- [ ] The page source shows `Promise.all(...)` (or equivalent hoisted promises).
- [ ] The `/parallel` page responds faster than `/waterfall` — visible in the
      Network tab or measured via `Date.now()` timing shown in the UI.
- [ ] `solutions/c07-data-fetching/NOTES.md` documents the latency difference
      with approximate timings.

---

## Pattern 3 — Preload Pattern

- [ ] The main `/c07-data-fetching` page (or a clearly labelled sub-section)
      calls `preloadProduct` or `preloadCategories` at the top of the parent
      component (before rendering child Suspense boundaries).
- [ ] The preload helper in `_lib/preload.ts` uses `void getProductBySlugMemo(slug)`
      (fire-and-forget, relies on React.cache() for the hand-off).
- [ ] The consuming child component calls `getProductBySlugMemo(slug)` and
      receives the already-started promise.
- [ ] The UI explains the preload pattern in plain English.

---

## Cache Components Compliance

- [ ] All `@/lib/data` calls are inside child async components wrapped in
      `<Suspense>` boundaries — never at the page component&apos;s top level.
- [ ] Build output shows the route as `◐ (Partial Prerender)` or `○ (Static)`
      — NOT `ƒ (Dynamic)` for the index page.
- [ ] The waterfall and parallel sub-routes may show `ƒ` (Dynamic is fine
      since they are fully dynamic demo pages with no static shell content).

---

## Documentation

- [ ] `solutions/c07-data-fetching/cache-flow.md` exists and contains:
  - A diagram or written description of the per-request memo flow.
  - An explicit contrast between `React.cache()` and `'use cache'`.
  - A note forward-referencing C08 for cross-request caching.
- [ ] `solutions/c07-data-fetching/NOTES.md` exists and documents:
  - The measured latency of the waterfall route (approximate, e.g. ~270ms).
  - The measured latency of the parallel route (approximate, e.g. ~100ms).
  - An explanation of why the difference is `N × latency` vs `max(latency)`.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c07` (if test files are added)

- [ ] All tests pass (if a `_tests/` directory has been added).
