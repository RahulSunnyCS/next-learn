# Challenge Spec — Catalog: SSG + ISR with Cache Components

> **File:** `app/(challenges)/c02-catalog-ssg-isr/_meta/spec.md`

---

## Learning Goal

This challenge teaches **Static Site Generation (SSG) and Incremental Static
Regeneration (ISR)** under Next.js 16's Cache Components model
(`cacheComponents: true`).  You will learn how `'use cache'` + `cacheLife()`
replaces the old `export const revalidate` and `fetch({ next: { revalidate } })`
patterns, why `generateStaticParams` pre-renders known slugs at build time, and
what `dynamicParams = true | false` does for slugs that were NOT pre-generated.

---

## Scenario

Nextmart's storefront catalog needs to serve a product grid with category
filtering.  The catalog data changes at most a few times an hour, so serving
stale content for up to 1 hour is acceptable — but the data must eventually
refresh.  Products are indexed for SEO, so the pages must be pre-rendered as
static HTML at build time for fast first paint and good indexability.

The key learning moment: under the Cache Components model, "ISR" is achieved
not by a route-level `revalidate` export but by wrapping the data read in a
`'use cache'` function and calling `cacheLife('hours')` inside it.  The
framework tracks the cache lifetime and serves stale HTML until the cache
entry expires, then re-runs the cached function on the next request.

---

## Starting Point

The `_lib/catalog.ts` file is provided with a **broken skeleton**:

1. `listCachedProducts` is NOT wrapped in `'use cache'` — so every request
   re-fetches the data instead of serving a cached (and eventually stale-then-
   fresh) copy.
2. `listCachedCategories` is similarly un-cached.
3. There is no `generateStaticParams` on the `[slug]` route, so no category
   pages are pre-rendered at build time.
4. `dynamicParams` is not set on `[slug]/page.tsx`, so the default (`true`)
   applies — the behaviour for unknown slugs is undocumented.

Your task: fix the caching, add `generateStaticParams`, and document
`dynamicParams`.

---

## Tasks

- [ ] **Task 1 — Cache the data reads.**  Add `'use cache'`, `cacheTag(tags.products)`,
      and `cacheLife('hours')` to `listCachedProducts` in `_lib/catalog.ts`.
      Do the same for `listCachedCategories` with `cacheTag(tags.categories)`.

- [ ] **Task 2 — `generateStaticParams` on the category route.**  Export
      `generateStaticParams` from `[slug]/page.tsx` so that all known category
      slugs are pre-rendered at build time.  Observe the `○ (Static)` symbol in
      the build output for those routes.

- [ ] **Task 3 — Understand `dynamicParams`.**  Read the two variants of
      `[slug]/page.tsx` (reference solution): one with `dynamicParams = true`
      (renders unknown slugs on demand) and one with `dynamicParams = false`
      (returns 404 for unknown slugs).  Uncomment the correct variant for the
      production use case and explain why.

- [ ] **Task 4 — Verify the static shell + Suspense shape.**  Confirm the
      catalog index page (`page.tsx`) follows the canonical static-shell +
      `<Suspense>` dynamic-hole pattern from C01.  The page header and
      category filter buttons must render without any data fetches; only the
      product grid should be inside a `<Suspense>` boundary.

---

## Acceptance Criteria

1. `next build` exits 0 with no TypeScript or lint errors.
2. The build output shows `○ (Static)` for `/c02-catalog-ssg-isr/electronics`,
   `/c02-catalog-ssg-isr/clothing`, and the other seeded category slugs.
3. Loading `/c02-catalog-ssg-isr` in a browser shows the product grid.
4. The `Cache-Control` response header includes a `stale-while-revalidate`
   directive (or similar evidence of ISR behaviour) in production.
5. Requesting `/c02-catalog-ssg-isr/unknown-slug` returns 404 when
   `dynamicParams = false`, or renders a "Category not found" page when
   `dynamicParams = true`.
6. `_lib/catalog.ts` is the only place product/category data is read —
   challenge code never imports from another challenge's `_lib`.

---

## Hints

<details>
<summary>Hint 1 — How does 'use cache' produce ISR?</summary>

In Next.js 16, adding `'use cache'` to a function makes the framework cache
its return value.  `cacheLife('hours')` sets the stale time to ~1 hour — after
the cache entry expires, the next request triggers a background re-run and
immediately returns the stale entry, exactly like legacy ISR.

```ts
async function listCachedProducts() {
  'use cache';
  cacheTag(tags.products);
  cacheLife('hours');
  return listProducts(); // from @/lib/data
}
```

</details>

<details>
<summary>Hint 2 — generateStaticParams shape</summary>

```ts
// [slug]/page.tsx
export async function generateStaticParams() {
  const categories = await listCachedCategories();
  return categories.map((c) => ({ slug: c.slug }));
}
```

Next.js calls this at build time.  Each returned object becomes a pre-rendered
static HTML file.

</details>

<details>
<summary>Hint 3 — dynamicParams true vs false</summary>

```ts
// Allows unknown slugs to render on-demand (default)
export const dynamicParams = true;

// Makes unknown slugs return 404
export const dynamicParams = false;
```

`dynamicParams` is a **route-segment config** (not a cache directive) and IS
permitted under `cacheComponents: true`.  Only `export const dynamic = ...` is
forbidden.

</details>
