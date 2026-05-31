# Cache Flow — C02 Catalog SSG + ISR

> This document explains the full rendering and caching strategy for C02,
> tracing the cache lifecycle from `next build` through the first runtime
> request to the stale-then-fresh revalidation window.

---

## Rendering Model: Cache Components (Next.js 16)

`cacheComponents: true` in `next.config.ts` activates the Cache Components
model.  Under this model:

- **Dynamic is the default.**  Every route is dynamic unless you explicitly
  opt in to caching with `'use cache'`.
- **`export const dynamic` is FORBIDDEN.**  Setting it causes a build error.
- **`export const revalidate` is SUPERSEDED.**  Use `cacheLife()` inside
  `'use cache'` functions instead.
- **`dynamicParams` is ALLOWED.**  It is a route-segment config (not a cache
  directive) and has no conflict with `cacheComponents`.

---

## The Three Actors

```
[lib/data]                  [_lib/catalog.ts]          [page / [slug]]
  listProducts()     →   listCachedProducts()     →   ProductGrid component
  listCategories()   →   listCachedCategories()   →   CategoryNav component
  getCategoryBySlug()→   getCachedCategoryBySlug()→   [slug]/page.tsx lookup
```

Only `_lib/catalog.ts` is touched by the challenge.  `lib/data` is frozen.

---

## The Cache Fix (what the challenge asks you to do)

### Before (broken skeleton)

```ts
export async function listCachedProducts(opts = {}) {
  // No caching — data fetched on every call.  Not ISR.
  return listProducts(opts);
}
```

Every request re-runs `listProducts()` which hits the (simulated) data layer
with random latency.  No stale-then-fresh behaviour.

### After (solution)

```ts
export async function listCachedProducts(opts = {}) {
  'use cache';              // ① Marks this function as a Cache Component
  cacheTag(tags.products);  // ② Tags the cache entry for targeted invalidation
  cacheLife('hours');       // ③ Sets the stale window to ~1 hour (ISR)
  return listProducts(opts);
}
```

The three directives work together:

| Directive | What it does |
|---|---|
| `'use cache'` | Wraps the function return value in the Cache Components store.  On subsequent calls with the same arguments, returns the stored value without re-running the function body. |
| `cacheTag(tags.products)` | Labels this cache entry with the string `"products"`.  A Server Action can call `revalidateTag(tags.products)` to invalidate all entries with this tag (e.g. after a product update). |
| `cacheLife('hours')` | Sets a ~1-hour stale window.  After expiry, the next request triggers a background re-run; the calling request still receives the stale data immediately. |

---

## Full Cache Lifecycle

### Step 1: `next build`

1. `generateStaticParams()` runs in the `[slug]` route.
2. It calls `listCachedCategories()` → 5 category slugs returned.
3. For each slug, Next.js renders the category page (calling `listCachedProducts`
   with the `categoryId` filter) and writes static HTML to `.next/`.
4. The Cache Components store is populated at build time.
5. Build output shows `○ (Static)` for each category route.

### Step 2: First runtime request to `/c02-catalog-ssg-isr/electronics`

1. Edge/CDN serves the pre-built static HTML immediately — no server compute.
2. The `Cache-Control` header includes `stale-while-revalidate` indicating
   the time-based revalidation window.
3. The client receives fully rendered HTML with product cards visible.

### Step 3: Request within the 1-hour window

1. Same static HTML served from cache.  `listCachedProducts()` is NOT called.
2. The server-side cache entry has not expired.
3. Response is instant.

### Step 4: Request after the 1-hour window (cache expired)

1. Cache entry for `listCachedProducts({ categoryId: 'cat-electronics' })`
   has expired (stale).
2. The incoming request receives the STALE HTML immediately (stale-while-
   revalidate: the old entry is still served to avoid blocking the visitor).
3. In the background, Next.js re-runs `listCachedProducts()` with fresh data.
4. The cache entry is updated.
5. The NEXT visitor (after the background revalidation completes) receives
   the fresh data.

This is classic ISR behaviour — just expressed at the data-function level
instead of the route level.

### Step 5: Forced invalidation (Server Action path)

If an admin updates a product, a Server Action can call:

```ts
import { revalidateTag } from "next/cache";
// ...
revalidateTag(tags.products); // invalidates all entries tagged "products"
```

This purges the cache immediately, regardless of the `cacheLife` window.
The next request then runs `listCachedProducts()` fresh.

---

## `dynamicParams` Behaviour

| Setting | Unknown slug request | Example |
|---|---|---|
| `dynamicParams = true` (default) | Server renders on demand | `/c02-catalog-ssg-isr/gadgets` → renders "Category not found" page (notFound() called) |
| `dynamicParams = false` | Returns HTTP 404 immediately | `/c02-catalog-ssg-isr/gadgets` → 404 before page component runs |

Under `dynamicParams = true`:
- The page component runs for the unknown slug.
- `getCachedCategoryBySlug("gadgets")` returns null.
- `notFound()` is called → Next.js renders the 404 page.
- The response is 404 even though the page component "ran".

Under `dynamicParams = false`:
- Next.js returns 404 at the routing layer — the page component never runs.
- Slightly more efficient, but prevents new categories from being served
  without a rebuild.

---

## Why Not `export const revalidate = 3600`?

In the old Next.js model (v14/v15), ISR on a page was configured with:

```ts
// OLD (v14/v15) — not used in this repo
export const revalidate = 3600; // seconds
```

This is a route-level setting — it applied to all data fetches on the page
and could not be set per-function.

In Next.js 16 with `cacheComponents: true`:
1. `export const revalidate` is superseded.
2. The lifetime is set INSIDE the `'use cache'` function via `cacheLife()`.
3. This is more granular: `listCachedProducts` can revalidate every hour while
   `listCachedCategories` could revalidate every day.

The Cache Components model moves caching from a route-level concern to a
data-function-level concern.  This is architecturally cleaner and more flexible.

---

## Static Shell + Suspense Pattern

Both the catalog index and the category `[slug]` page follow the canonical
pattern from C01:

```
page.tsx (static shell)
  ├── <h1>Catalog</h1>                     ← renders immediately (static)
  ├── <Suspense>                            ← Suspense boundary
  │     <CategoryNav />                    ← async, reads listCachedCategories()
  │   </Suspense>
  ├── <section>learning notes</section>    ← renders immediately (static)
  └── <Suspense>                            ← Suspense boundary
        <ProductGrid />                    ← async, reads listCachedProducts()
      </Suspense>
```

The rule: ANY async data read — even one wrapped in `'use cache'` — must live
inside `<Suspense>`.  The build enforces this: accessing an async data source
outside Suspense with `cacheComponents: true` throws
"Uncached data was accessed outside of `<Suspense>`".

The static shell renders (and can be served as static HTML) without waiting for
any data.  The Suspense holes stream in once the cached functions resolve.
