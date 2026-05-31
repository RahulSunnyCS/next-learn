# Reference Solution Notes — C02 Catalog SSG + ISR

> **Read this AFTER filling in `_meta/defend-it.md` and attempting the challenge.**

---

## What the Challenge Asked You to Fix

The challenge skeleton in `app/(challenges)/c02-catalog-ssg-isr/_lib/catalog.ts`
provides two un-cached data helpers:

- `listCachedProducts()` — calls `listProducts()` from `@/lib/data` but has no `'use cache'` wrapper.
- `listCachedCategories()` — same problem.

Without caching, every request re-runs the data fetch (with simulated latency).
There is no ISR behaviour.

---

## The Fix

Open `_lib/catalog.ts`.  Add three lines to each function:

```ts
export async function listCachedProducts(opts = {}) {
  'use cache';              // 1. Opt in to Cache Components
  cacheTag(tags.products);  // 2. Tag for targeted invalidation
  cacheLife('hours');       // 3. Stale window ~1 hour → ISR
  return listProducts(opts);
}

export async function listCachedCategories() {
  'use cache';
  cacheTag(tags.categories);
  cacheLife('hours');
  return listCategories();
}
```

That is the entire fix.  No route-level config changes.  No `export const revalidate`.

---

## Why `'use cache'` = ISR

In Next.js 16 with `cacheComponents: true`:

- **`'use cache'`** is a directive that tells Next.js to memoize the function's
  return value in the server-side Cache Components store.  Subsequent calls with
  the same arguments skip the function body and return the stored value.

- **`cacheLife('hours')`** sets the stale window.  After ~1 hour, the NEXT
  request triggers a background re-run; the stale data is served immediately to
  that visitor while the cache refreshes in the background.

This is exactly ISR.  It is just declared at the data-function level rather
than the route level (`export const revalidate = 3600` is the old way).

---

## `dynamicParams = true` vs `false`

The `[slug]/page.tsx` exports `dynamicParams = true`.

| Value | Request to unknown slug | Why |
|---|---|---|
| `true` (default) | Page component runs. Calls `getCachedCategoryBySlug(slug)` → `null` → `notFound()` → 404. | New categories can be added after build; unknown slugs are handled gracefully. |
| `false` | Next.js returns 404 at the routing layer; page component never runs. | The set of valid slugs is fixed. Faster 404 (no server compute). |

**Key insight:** `dynamicParams` is a route segment config, not a cache
directive.  It IS permitted under `cacheComponents: true`.  The only forbidden
config is `export const dynamic = ...`.

---

## `generateStaticParams` and the Build Output

```ts
export async function generateStaticParams() {
  const categories = await listCachedCategories();
  return categories.map((cat) => ({ slug: cat.slug }));
}
```

At `next build`:
1. Next.js calls `generateStaticParams()`.
2. Returns 5 objects: `[{slug:"books"}, {slug:"clothing"}, ...]`.
3. For each, renders `[slug]/page.tsx` and writes static HTML.
4. Build output: `○ (Static)` for each category route.

At runtime: those 5 routes are served as pre-built HTML from the CDN —
no server compute needed.

---

## Catalog Index vs Category Route

| Route | Pre-generated? | Build symbol | Notes |
|---|---|---|---|
| `/c02-catalog-ssg-isr` | Yes (no params, no dynamic data at route level) | `○ (Static)` | Static shell; ProductGrid in Suspense |
| `/c02-catalog-ssg-isr/electronics` | Yes (in generateStaticParams) | `○ (Static)` | Same pattern |
| `/c02-catalog-ssg-isr/gadgets` | No (not in fixture data) | `ƒ (Dynamic)` or 404 | depends on dynamicParams |

---

## Product Card Links → C03

Each product card links to `/c03-product-ppr/<slug>`.

The sibling C03 challenge builds product detail pages using PPR.  C02 is
responsible only for the catalog index and category listing.  The link target
may 404 in dev if C03 is not yet implemented — that is expected.

---

## Forbidden Patterns (do not do these)

| Pattern | Why forbidden |
|---|---|
| `export const dynamic = "force-static"` | Banned by `cacheComponents: true`; causes build error |
| `export const dynamic = "force-dynamic"` | Same — banned entirely |
| `export const revalidate = 3600` | Superseded by `cacheLife()`; may conflict in v16 |
| Reading `listProducts()` at the top-level of the page | Outside Suspense — build fails with "Uncached data accessed outside Suspense" |
| Importing from another challenge's `_lib` | Violates isolation — each challenge is self-contained |

---

## Further Study

- `cache-flow.md` — full cache lifecycle diagram and step-by-step trace.
- `_meta/defend-it.md` — model answers for the 5 challenge questions.
- `app/(challenges)/c02-catalog-ssg-isr/_lib/catalog.ts` — the file you fixed.
- `docs/cache-components-rules.md` — project-wide rules for `cacheComponents`.
