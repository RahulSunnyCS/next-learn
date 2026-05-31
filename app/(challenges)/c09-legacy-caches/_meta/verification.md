# Verification Checklist — Legacy Four-Cache Model + Migration

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Functional Checks

- [ ] **Live page loads** — Navigate to `/c09-legacy-caches`.  The page renders
  without errors and shows a list of featured products.

- [ ] **Static shell visible first** — Open the Network tab in DevTools.  Hard
  reload (`Ctrl+Shift+R`) the page.  The initial HTML response includes the
  challenge header text (it is in the static shell).  The product list streams
  in slightly later.

- [ ] **No `export const revalidate`** — Run:
  ```bash
  grep -n "export const revalidate" app/\(challenges\)/c09-legacy-caches/page.tsx
  ```
  The result must be empty.

- [ ] **No `export const dynamic`** — Run:
  ```bash
  grep -n "export const dynamic" app/\(challenges\)/c09-legacy-caches/page.tsx
  ```
  The result must be empty.

- [ ] **Challenge appears in index** — Navigate to `/`.  The challenge
  &quot;Legacy Four-Cache Model + Migration to Cache Components&quot; appears
  in the challenge index with slug `c09-legacy-caches`.

---

## Solution Files

- [ ] `solutions/c09-legacy-caches/legacy/page.tsx` exists and contains
  legacy cache directives (`unstable_cache`, `fetch(url, { next: { ... } })`,
  `export const revalidate`).

- [ ] `solutions/c09-legacy-caches/migrated/page.tsx` exists and uses only
  `'use cache'`, `cacheTag()`, and `cacheLife()` — no legacy directives.

- [ ] `solutions/c09-legacy-caches/migration-notes.md` exists and contains
  non-trivial documentation of all four caches.

- [ ] `solutions/c09-legacy-caches/cache-flow.md` exists and contains
  diagrams for both the legacy flow and the Cache Components flow.

---

## cacheComponents Compliance Check

- [ ] Open `app/(challenges)/c09-legacy-caches/page.tsx`.  Confirm:
  - The top-level default export is a non-async Server Component (static shell).
  - All data reads are wrapped in `<Suspense>`.
  - No route-segment config exports are present.

- [ ] Open `app/(challenges)/c09-legacy-caches/_lib/legacy.ts`.  Confirm:
  - `getCachedFeaturedProducts()` has `'use cache'` as its first statement.
  - `cacheTag(tags.products)` is called inside the function body.
  - `cacheLife('hours')` is called inside the function body.

---

## Documentation Quality Check

- [ ] `migration-notes.md` covers all four caches with names, scopes, and
  lifetimes.
- [ ] `migration-notes.md` includes the version-specific note that implicit
  fetch caching defaulted to `force-cache` in Next.js 13/14/15.
- [ ] `migration-notes.md` explains WHY Cache Components replaced the old model
  (not just HOW to migrate).
- [ ] `cache-flow.md` shows a before/after diagram comparing the legacy
  four-cache request flow to the Cache Components flow.
- [ ] `defend-it.md` has 5 questions with model answers including the
  "draw the four caches" question and a `revalidateTag` question.

---

## TypeScript Check

Run:
```bash
npx tsc --noEmit
```

- [ ] Zero errors, zero warnings.
