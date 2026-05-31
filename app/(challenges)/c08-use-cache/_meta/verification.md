# Verification Checklist — C08: Current Caching Model (`'use cache'`)

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly. Run each item in order. Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 (no TypeScript errors).
- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Build Output — Route Table

- [ ] In the `npm run build` output, the route `/c08-use-cache` is marked
  **◐** (Partial Prerender), NOT **ƒ** (Dynamic) and NOT **○** (Static).

  Expected build output line (approximately):
  ```
  ◐  /c08-use-cache   (Partial Prerender)
  ```

---

## Cache Discipline — `_lib/cached.ts`

- [ ] The file `app/(challenges)/c08-use-cache/_lib/cached.ts` exists.
- [ ] The first line of the file is `'use cache';` (file-level directive).
- [ ] The function `getAllCachedCategories()` exists and calls `cacheTag(tags.categories)` and `cacheLife('days')`.
- [ ] The function `getCachedProductSummary(productId)` exists, has `'use cache'` inside its body (function-level), and calls `cacheTag(tags.product(productId))` and `cacheLife('hours')`.
- [ ] Neither function reads `@/lib/data` directly in a way that would break isolation — both go through the repository functions.

---

## Cache Discipline — `_components/CachedPanel.tsx`

- [ ] The file `app/(challenges)/c08-use-cache/_components/CachedPanel.tsx` exists.
- [ ] `CachedPanel` is an async Server Component (exported as default or named).
- [ ] The function body begins with `'use cache'` (component-level directive).
- [ ] `cacheTag` is applied using a tag from `@/lib/data/tags`.
- [ ] The component renders product data (name + price at minimum).

---

## Page — Static Shell + Dynamic Hole

- [ ] The file `app/(challenges)/c08-use-cache/page.tsx` exists.
- [ ] There is NO `export const dynamic`, `export const revalidate`, or
  `export const dynamicParams` directive in `page.tsx` or any challenge file.
- [ ] The page has at least one `<Suspense>` boundary wrapping an uncached async component.
- [ ] The page renders a mental model / cheat-sheet section as static content.
- [ ] The page renders a `cacheLife` profiles explanation as static content.

---

## Three `'use cache'` Levels Are Observable

- [ ] Open `http://localhost:3000/c08-use-cache` in a browser.
- [ ] The page shows three panels (or clearly labelled sections) for:
  a) Function-level `'use cache'` (data from `_lib/cached.ts`)
  b) Component-level `'use cache'` (`CachedPanel` component)
  c) Uncached / dynamic (inside `<Suspense>`, no `'use cache'`)
- [ ] Each panel has a label identifying which caching strategy it uses.
- [ ] The uncached panel loads visibly later than the cached sections (observable
  with slow-network throttling or the simulated latency in `@/lib/data`).

---

## `cache()` vs `'use cache'` Contrast

- [ ] The page (or spec.md) explains React `cache()` vs Next.js `'use cache'`.
- [ ] The distinction between per-request and cross-request scope is present.

---

## `cacheTag` and `cacheLife`

- [ ] Every `'use cache'` boundary in the challenge files calls `cacheTag(...)`.
- [ ] Every `'use cache'` boundary calls `cacheLife(...)` with a built-in profile.
- [ ] Tag constants come from `@/lib/data` (not hard-coded strings).

---

## TypeScript

- [ ] `npx tsc --noEmit` exits 0 after all edits.

---

## Forbidden Patterns

- [ ] No `export const dynamic = ...` in any challenge file.
- [ ] No `export const revalidate = ...` in any challenge file.
- [ ] No direct edits to `lib/data/**` files.
- [ ] No direct edits to `next.config.ts`.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c08`

- [ ] All tests pass (if any were written for this challenge).
