# Challenge Spec — C08: Current Caching Model (`'use cache'`)

> **File:** `app/(challenges)/c08-use-cache/_meta/spec.md`

---

## Learning Goal

This challenge teaches Next.js 16's **Cache Components** model — the unified
caching primitive that replaced the old "four caches" (Request Memoization,
Data Cache, Full Route Cache, Router Cache) from the pre-v16 era.

You will master three distinct placement levels of the `'use cache'` directive,
understand `cacheTag` and `cacheLife`, and internalise the critical distinction
between React's per-request `cache()` and Next.js's cross-request `'use cache'`.

---

## The Core Mental Model

**Everything is dynamic by default** under `cacheComponents: true`. You opt
INTO caching — you never opt out. The `'use cache'` directive is how you
make a result persist across requests.

```
Without 'use cache':  Request A → run function → result A
                      Request B → run function → result B   (re-run, fresh)

With 'use cache':     Request A → run function → result A   (computed, stored)
                      Request B → cache hit    → result A   (served from cache)
                      Request C → cache hit    → result A   (same)
```

A `'use cache'` entry is automatically keyed on the function's arguments, so
`getCachedProduct("headphones")` and `getCachedProduct("shoes")` are separate
entries — not the same cache slot.

---

## The Three Placement Levels

### Level 1 — File-level `'use cache'`

Place `'use cache'` as the **first statement in a module** (before any imports
would be wrong — it goes after imports but it is the first non-import line).
Actually: `'use cache'` appears as the first line of the *file*, the way
`'use server'` or `'use client'` do.

```typescript
// _lib/cached.ts  ← whole file is cache-enabled
'use cache';

export async function getAllCategories() {
  // Every export in this file is automatically cached.
  // cacheTag / cacheLife can still be called inside each function.
  cacheTag(tags.categories);
  cacheLife("days");
  return listCategories();
}
```

Use file-level when **every export** in the module should be cached with
similar policies. Good for a module of pure lookup helpers.

### Level 2 — Function-level `'use cache'`

Place `'use cache'` as the **first line inside an async function body**.
Only that function's return value is cached; other exports in the same file
are unaffected.

```typescript
export async function getCachedProduct(slug: string) {
  'use cache';
  cacheTag(tags.product(slug));
  cacheLife('hours');
  return getProductBySlug(slug);
}
```

Use function-level when you want **fine-grained control**: different functions
in the same module may have different lifetimes, tags, or may not be cached
at all. This is the most common production pattern.

### Level 3 — Component-level `'use cache'`

Place `'use cache'` as the **first line inside a Server Component function**.
The component's rendered output (React node tree) is cached and reused across
requests, not just raw data.

```typescript
async function CachedProductBadge({ slug }: { slug: string }) {
  'use cache';
  cacheTag(tags.product(slug));
  cacheLife('hours');
  const product = await getProductBySlug(slug);
  return <span>{product?.name ?? 'Unknown'}</span>;
}
```

Use component-level when the **entire rendered subtree** is safe to cache —
no user-specific data, no request headers inside it. The output is treated as
serialised RSC payload and reused across requests.

---

## `cacheTag` and `cacheLife` Rules

Both must be called **before the first `await`** inside a `'use cache'`
boundary. Next.js reads them synchronously when creating the cache entry.

- **`cacheTag(...tags)`** — associates one or more string tags with this entry.
  Call `revalidateTag(tag)` from a Server Action to instantly evict all entries
  with that tag. Supports multiple tags: `cacheTag(tags.product(slug), tags.products)`.

- **`cacheLife(profile)`** — sets time-based revalidation. Built-in profiles:
  - `'seconds'`  — stale after a few seconds (demo/dev use)
  - `'minutes'`  — stale after a few minutes (rapidly-changing data)
  - `'hours'`    — stale after ~1 hour (product data, catalog)
  - `'days'`     — stale after ~24 hours (stable reference data)
  - `'weeks'`    — stale after ~7 days (near-static content)
  - `'max'`      — maximum lifetime (config, rarely-changing content)

  Custom profiles can be defined in `next.config.ts` under the
  `cacheLife` key:
  ```typescript
  // next.config.ts (read-only — shown for reference)
  const config = {
    experimental: {
      cacheLife: {
        'product-detail': { stale: 30, revalidate: 3600, expire: 86400 },
      }
    }
  };
  ```
  Then use: `cacheLife('product-detail')`.

---

## `cache()` vs `'use cache'` — The Core Distinction

| | React `cache()` | Next.js `'use cache'` |
|---|---|---|
| **Scope** | Per-request (one SSR pass) | Cross-request (persists to server store) |
| **Boundary** | Single render tree | Shared across all requests + builds |
| **Invalidation** | Automatic at request end | `revalidateTag()` / `cacheLife()` TTL |
| **Use when** | De-dup within one render | Reuse across many requests |
| **Example** | User session lookup (unique per req) | Product catalog (same for all visitors) |

React `cache()` is import-level memoisation within a single server render:
if two components call `getUser(id)` in the same render tree, the second call
returns the first call's result — the function body runs only once per request.
At the end of the request, the memo is discarded.

`'use cache'` stores the result in a durable server-side cache that outlives
the request. The same result is returned to the next request, and the one after,
until the TTL expires or a tag is revalidated.

---

## Cached vs Uncached — Build Symbol Difference

| Component / function | Has `'use cache'`? | Route symbol | Why |
|---|---|---|---|
| Page reads only cached data | Yes (indirectly) | `○ Static` | Fully deterministic at build |
| Page has a Suspense hole with uncached read | Mixed | `◐ Partial Prerender` | Shell static, hole dynamic |
| Page reads uncached data outside Suspense | No | `ƒ Dynamic` | Full per-request render |

This challenge's page shows `◐` because the shell is a `'use cache'` function
and the comparison panels are inside `<Suspense>` as uncached components.

---

## Scenario

**Nextmart's data team** wants to understand how `'use cache'` works in practice
before rolling it out across the app. This challenge builds a reference page that
demonstrates all three placement levels, shows `cacheTag`/`cacheLife` in use,
compares `cache()` vs `'use cache'`, and makes the caching behaviour observable
in the UI (e.g. showing when data was last computed vs served from cache).

---

## Starting Point

The route `/c08-use-cache` exists but renders a blank placeholder. The learner
must implement:

1. **`_lib/cached.ts`** — demonstrates file-level and function-level `'use cache'`
   with `cacheTag` and `cacheLife`.
2. **`_components/CachedPanel.tsx`** — a cached Server Component (component-level
   `'use cache'`), demonstrating cached RSC output.
3. **`page.tsx`** — a static shell with `<Suspense>` holes showing cached vs
   uncached rendering side-by-side.

---

## Tasks

- [ ] **T1 — File-level `'use cache'` in `_lib/cached.ts`:**
  Add `'use cache'` as the first line (file scope). Implement
  `getAllCachedCategories()` tagged with `tags.categories` and lifetimed `'days'`.
  Explain in a comment why file-scope is appropriate for an all-cached utility module.

- [ ] **T2 — Function-level `'use cache'` in `_lib/cached.ts`:**
  Add a second export `getCachedProductSummary(productId: string)` with
  `'use cache'` inside the function body, tagged with `tags.product(productId)`,
  lifetimed `'hours'`. Call `getProductById` from `@/lib/data`.

- [ ] **T3 — Component-level `'use cache'` in `_components/CachedPanel.tsx`:**
  A Server Component that uses `'use cache'` in the function body. It renders
  a product badge (name + price) from a cached product lookup. Tag with
  `tags.product(productId)`.

- [ ] **T4 — React `cache()` demo:**
  Show how `React.cache()` deduplicates calls within a single render. In
  `page.tsx`, import `cache` from `react`, wrap a data fetch, and note in a
  comment that this memo lives only for the current request.

- [ ] **T5 — Uncached component for contrast:**
  Add an `UncachedPanel` async Server Component in `page.tsx` that calls
  a `@/lib/data` function directly (no `'use cache'`, no React `cache()`).
  Wrap it in `<Suspense>`. This demonstrates the dynamic hole.

- [ ] **T6 — Side-by-side comparison:**
  The page shows three panels side by side:
  a) A cached component (uses function in `_lib/cached.ts` → `'use cache'`)
  b) The `CachedPanel` Server Component (component-level `'use cache'`)
  c) An uncached component inside `<Suspense>` (always runs per-request)
  Each panel must clearly label what caching strategy it uses.

- [ ] **T7 — `cacheLife` profile explanation panel:**
  A static section (part of the shell) explaining all built-in profiles and
  how custom profiles work in `next.config.ts`.

- [ ] **T8 — Mental model cheat-sheet:**
  A static section (part of the shell) summarising: file vs function vs component
  `'use cache'`, `cache()` vs `'use cache'`, and when to use each.

---

## Acceptance Criteria

1. `npx tsc --noEmit` exits 0. No TypeScript errors.
2. `next build` exits 0. The `/c08-use-cache` route shows `◐` in the route table
   (static shell + at least one Suspense hole for the uncached component).
3. `_lib/cached.ts` demonstrates file-level AND function-level `'use cache'`.
4. `_components/CachedPanel.tsx` demonstrates component-level `'use cache'`.
5. `page.tsx` shows React `cache()` and explains its per-request scope.
6. The page has a `<Suspense>`-wrapped uncached component to contrast cached rendering.
7. `cacheTag` and `cacheLife` are applied to every `'use cache'` boundary using
   shared tag constants from `@/lib/data`.
8. No `export const dynamic` or `export const revalidate` directives anywhere in the challenge files.
9. The mental model section accurately explains `cache()` vs `'use cache'`.
10. All data reads go through `_lib/cached.ts` or direct `@/lib/data` imports — no edits to `lib/data`.

---

## Key Concepts Reference

### `cacheTag` + `revalidateTag` lifecycle

```
Server Action (mutation):
  await updateProduct(slug, newData);
  revalidateTag(tags.product(slug));
       ↓
Next.js Cache Store:
  Evicts all entries tagged 'product:<slug>'
       ↓
Next request for that product:
  Cache miss → function body runs → fresh data → new cache entry
```

### File-level vs Function-level — quick rule

| Use file-level when | Use function-level when |
|---|---|
| Every export in the file should be cached | Some exports should NOT be cached |
| All functions share similar tag/lifetime policy | Different functions need different tags/lifetimes |
| The module is purely a "cached data layer" | Mixed concerns (cached + uncached) |

---

*Further reading: `solutions/c08-use-cache/` — available after you fill in `defend-it.md`.*
