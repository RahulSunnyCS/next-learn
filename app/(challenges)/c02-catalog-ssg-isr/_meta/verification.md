# Verification Checklist — Catalog: SSG + ISR with Cache Components

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Static Generation (SSG)

- [ ] **Build output** — Run `npm run build` and look at the Route table in
      the terminal output.  Confirm `/c02-catalog-ssg-isr/[slug]` shows
      `○ (Static)` for the pre-generated category slugs (electronics, clothing,
      books, home, sports).
- [ ] **Static HTML on disk** — After build, check `.next/server/app/(challenges)/c02-catalog-ssg-isr/`
      for pre-rendered HTML files for each category slug.

---

## ISR / Cache Revalidation

- [ ] **Cache headers** — In production (`npm run start`), load
      `/c02-catalog-ssg-isr` and inspect the `Cache-Control` response header
      in DevTools → Network.  Confirm it includes `stale-while-revalidate` or
      `s-maxage` indicating time-based revalidation.
- [ ] **`cacheLife('hours')` is present** — Open `_lib/catalog.ts` and confirm
      both `listCachedProducts` and `listCachedCategories` call `cacheLife('hours')`.
- [ ] **`cacheTag` is present** — Confirm `cacheTag(tags.products)` is called
      in `listCachedProducts` and `cacheTag(tags.categories)` in
      `listCachedCategories`.

---

## `dynamicParams` Gotcha

- [ ] **`dynamicParams = true` (default)** — With the route segment set to
      `dynamicParams = true`, navigate to `/c02-catalog-ssg-isr/not-a-real-category`.
      Confirm it renders the "Category not found" fallback page (not a 404).
- [ ] **`dynamicParams = false`** — Change the route segment to
      `dynamicParams = false`, rebuild, and navigate to
      `/c02-catalog-ssg-isr/not-a-real-category`.  Confirm it returns HTTP 404.
- [ ] **`dynamicParams = true` re-enabled** — Change back to `true` for the
      production scenario (unknown slugs should render on demand, not 404).

---

## Category Filtering

- [ ] **All products** — Loading `/c02-catalog-ssg-isr` shows all products
      across all categories.
- [ ] **Category filter** — Loading `/c02-catalog-ssg-isr/electronics` shows
      only Electronics products.
- [ ] **Active filter highlight** — The "Electronics" category button is
      visually highlighted when on the electronics route.

---

## Product Card Links

- [ ] **Link target** — Each product card links to `/c03-product-ppr/<slug>`
      (the sibling PPR challenge route), not to a c02 detail page.
- [ ] **Slug is correct** — The slug in the link matches the product's `slug`
      field from the fixture data.

---

## Static Shell + Suspense Pattern

- [ ] **No top-level data fetch** — Open `page.tsx`.  Confirm there is NO
      `await listProducts(...)` or `await listCategories(...)` at the top level
      of the default export function.
- [ ] **Suspense boundary** — Confirm the `<ProductGrid>` component is wrapped
      in `<Suspense fallback={<ProductGridSkeleton />}>`.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c02`

- [ ] All tests pass.
