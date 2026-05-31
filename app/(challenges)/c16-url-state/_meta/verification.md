# Verification Checklist — C16: URL as Single Source of Truth

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly. Run each item in order. Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 (no TypeScript errors).
- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Build Output — Route Table

- [ ] In the `npm run build` output, the route `/c16-url-state` is marked
  **◐** (Partial Prerender), NOT **ƒ** (Dynamic) and NOT **○** (Static).

  Expected build output line (approximately):
  ```
  ◐  /c16-url-state   (Partial Prerender)
  ```

---

## URL-as-State: Initial Load

- [ ] Open `http://localhost:3000/c16-url-state` in a browser.
- [ ] The page loads with all products visible (no active filters).
- [ ] The "Current URL params" display in the filter bar shows `(none — showing defaults)`.
- [ ] Open `http://localhost:3000/c16-url-state?category=electronics&sort=price-asc`
  directly in a new browser tab (paste the URL — do not navigate there from the
  app).
- [ ] The product grid shows only Electronics products, sorted by price (low to high).
- [ ] The Category select shows "Electronics" selected.
- [ ] The Sort select shows "Price: Low to High" selected.
- [ ] The "Current URL params" display shows `?category=electronics&sort=price-asc`.

---

## Shareability / Restorability

- [ ] Copy the URL `http://localhost:3000/c16-url-state?category=clothing&sort=rating-desc`.
- [ ] Open it in a new incognito/private window (no session carryover).
- [ ] The filtered view (Clothing, top rated) appears immediately, server-rendered.
- [ ] The filter controls reflect the URL params correctly.

---

## Filter Controls Update the URL

- [ ] From the base URL, select **Electronics** in the Category select.
- [ ] The URL changes to `?category=electronics` (or similar) immediately.
- [ ] The product grid re-renders showing only Electronics products.
- [ ] Select **Price: Low to High** in the Sort select.
- [ ] The URL now includes both `category=electronics` and `sort=price-asc`.
- [ ] Clear filters → URL returns to bare `?` or no params.

---

## Search Debounce

- [ ] Type "headph" in the search input — one character at a time, quickly.
- [ ] The URL does NOT update for every character (observe the address bar
  — it should only update after you stop typing for ~300ms).
- [ ] After you stop typing, the URL updates with `?q=headph` and the grid
  shows filtered results.
- [ ] Verify the browser history has only ONE entry for the full search
  term (press Back once — you should go to the page before you started
  typing, not to a partial typed state).

---

## Back/Forward Navigation

- [ ] Start at `http://localhost:3000/c16-url-state` (no filters).
- [ ] Select Electronics category.
- [ ] Select Price: Low to High sort.
- [ ] Press **Back** in the browser.
- [ ] The sort returns to default (newest), but Electronics is still selected.
- [ ] Press **Back** again.
- [ ] The category returns to "All categories" (original state).
- [ ] Press **Forward** once.
- [ ] Electronics is selected again.
- [ ] This confirms URL history = state history.

---

## Pagination

- [ ] If there are more than 9 products matching the current filter, Pagination
  Previous/Next buttons appear.
- [ ] Clicking **Next** updates the URL to `?page=2` and shows the next page
  of products.
- [ ] Clicking **Previous** returns to `?page=1` (or removes the page param).
- [ ] Changing a filter (category/sort/q) resets the page to 1 (no stale
  page number in the URL after a filter change).

---

## Server Rendering Confirmed

- [ ] Open `http://localhost:3000/c16-url-state?category=sports` in a browser.
- [ ] In DevTools → Network tab, view the raw HTML of the document request.
- [ ] Sports product names appear in the initial HTML (server-rendered) —
  not injected by JavaScript after load.
- [ ] The filter bar skeleton fallback is visible in the HTML (Suspense hole)
  or the resolved filter bar (if the server renders fast enough).

---

## No Forbidden Directives

- [ ] There is NO `export const dynamic`, `export const revalidate`,
  `export const dynamicParams`, or `export const runtime` in any file under
  `app/(challenges)/c16-url-state/` (all forbidden by `cacheComponents: true`).

---

## TypeScript

- [ ] `npx tsc --noEmit` exits 0 after all edits.
- [ ] No `any` types in the challenge files.

---

## Files Created

- [ ] `app/(challenges)/c16-url-state/page.tsx` exists.
- [ ] `app/(challenges)/c16-url-state/_lib/search-params.ts` exists.
- [ ] `app/(challenges)/c16-url-state/_components/FilterBar.tsx` exists (`"use client"`).
- [ ] `app/(challenges)/c16-url-state/_components/Pagination.tsx` exists (`"use client"`).
- [ ] `app/(challenges)/c16-url-state/_meta/spec.md` exists (non-empty).
- [ ] `app/(challenges)/c16-url-state/_meta/defend-it.md` exists.
- [ ] `app/(challenges)/c16-url-state/_meta/verification.md` exists (this file).
- [ ] `app/(challenges)/c16-url-state/_meta/challenge.config.json` exists.
- [ ] `app/(challenges)/c16-url-state/_meta/challenge.config.ts` exists.
- [ ] `solutions/c16-url-state/page.tsx` exists.
- [ ] `solutions/c16-url-state/_lib/search-params.ts` exists.
- [ ] `solutions/c16-url-state/NOTES.md` exists.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c16`

- [ ] All tests pass (if test files exist).
