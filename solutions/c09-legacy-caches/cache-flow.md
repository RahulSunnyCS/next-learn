# Cache Flow — C09 Legacy Four-Cache Model vs. Cache Components

> This document traces a single page request through the caching layers
> in both the **legacy four-cache model (Next.js 14)** and the
> **Cache Components model (Next.js 16)** to show what changed and why.

---

## Diagram A — Legacy Four-Cache Model (Next.js 13/14/15)

```
╔═══════════════════════════════════════════════════════════════════════╗
║  BROWSER                                                              ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │  ROUTER CACHE  (browser RAM, ~5min static / ~30s dynamic TTL)  │  ║
║  │                                                                 │  ║
║  │  Key: route pathname                                            │  ║
║  │  Value: RSC payload (serialised React tree)                    │  ║
║  │                                                                 │  ║
║  │  HIT  → serve RSC payload instantly, no network call           │  ║
║  │  MISS → navigate to server ↓                                   │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════════╝
                          │ MISS
                          ▼
╔═══════════════════════════════════════════════════════════════════════╗
║  SERVER (Node.js process)                                             ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │  FULL ROUTE CACHE  (server disk, per-deployment)               │  ║
║  │                                                                 │  ║
║  │  Key: URL path + segment params                                 │  ║
║  │  Value: pre-rendered HTML + RSC payload                        │  ║
║  │  Written by: `next build` (static routes only)                 │  ║
║  │  Invalidated by: revalidateTag → Data Cache bust → route stale │  ║
║  │                                                                 │  ║
║  │  HIT  → serve pre-rendered HTML (no React render)             │  ║
║  │  MISS → render the route ↓                                     │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                         │ MISS                                        ║
║                         ▼                                             ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │  REACT RENDER  (renders the page component tree)               │  ║
║  │                                                                 │  ║
║  │  During render, each data call goes through:                   │  ║
║  │                                                                 │  ║
║  │  ┌─────────────────────────────────────────────────────────┐   │  ║
║  │  │  REQUEST MEMOIZATION  (server RAM, per-request Map)    │   │  ║
║  │  │                                                         │   │  ║
║  │  │  Key: fetch URL (or unstable_cache key array)          │   │  ║
║  │  │  Value: resolved response / return value               │   │  ║
║  │  │  Discarded: when this request/render ends              │   │  ║
║  │  │                                                         │   │  ║
║  │  │  HIT  → return memoized result (no Data Cache lookup)  │   │  ║
║  │  │  MISS → check Data Cache ↓                             │   │  ║
║  │  └─────────────────────────────────────────────────────────┘   │  ║
║  │                         │ MISS                                  │  ║
║  │                         ▼                                       │  ║
║  │  ┌─────────────────────────────────────────────────────────┐   │  ║
║  │  │  DATA CACHE  (server disk, persistent)                 │   │  ║
║  │  │                                                         │   │  ║
║  │  │  Key: fetch URL + options hash (or unstable_cache key) │   │  ║
║  │  │  Value: serialised response / return value             │   │  ║
║  │  │  Invalidated by: revalidateTag(), revalidatePath(),    │   │  ║
║  │  │                  time (revalidate: N seconds)           │   │  ║
║  │  │                                                         │   │  ║
║  │  │  HIT  → return cached value; record in Memoization Map │   │  ║
║  │  │  MISS → hit actual data source ↓                       │   │  ║
║  │  └─────────────────────────────────────────────────────────┘   │  ║
║  │                         │ MISS                                  │  ║
║  │                         ▼                                       │  ║
║  │  ┌─────────────────────────────────────────────────────────┐   │  ║
║  │  │  ACTUAL DATA SOURCE                                    │   │  ║
║  │  │  (database / external API / file system)               │   │  ║
║  │  │                                                         │   │  ║
║  │  │  → Fetch / query executes                              │   │  ║
║  │  │  → Result written to Data Cache                        │   │  ║
║  │  │  → Result written to Request Memoization Map           │   │  ║
║  │  └─────────────────────────────────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                         │                                             ║
║                         ▼                                             ║
║  Rendered HTML + RSC payload written to Full Route Cache              ║
╚═══════════════════════════════════════════════════════════════════════╝
                          │
                          ▼
                  Browser receives HTML
                  Browser stores RSC payload in Router Cache
```

### Legacy Request Flow — Step by Step

1. **Browser** navigates to `/products`.
2. **Router Cache** check: has the browser seen `/products` recently?
   - HIT: serve instantly from Router Cache. Done.
   - MISS: make a request to the server.
3. **Full Route Cache** check: was `/products` pre-rendered at build time?
   - HIT: return the pre-rendered HTML. No render needed. Done.
   - MISS: run the React render pipeline.
4. **React renders** the page component (`async function ProductsPage()`).
5. For each data call (e.g. `getFeaturedProducts()`):
   - **Request Memoization** check: same URL in this render?
     - HIT: return memoized result. No Data Cache lookup.
     - MISS: check Data Cache.
   - **Data Cache** check: cached response for this key?
     - HIT: return cached value. Store in Memoization Map.
     - MISS: hit the actual database / API.
     - Actual result → stored in Data Cache → stored in Memoization Map.
6. Rendered HTML + RSC payload → stored in **Full Route Cache**.
7. Response sent to browser.
8. Browser stores RSC payload in **Router Cache**.

---

## Diagram B — Cache Components Model (Next.js 16, `cacheComponents: true`)

```
╔═══════════════════════════════════════════════════════════════════════╗
║  BROWSER                                                              ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │  ROUTER CACHE  (unchanged from legacy model)                   │  ║
║  │  Key: route pathname                                            │  ║
║  │  Value: RSC payload                                             │  ║
║  │  HIT → serve instantly  |  MISS → request to server ↓         │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════════╝
                          │ MISS
                          ▼
╔═══════════════════════════════════════════════════════════════════════╗
║  SERVER (Node.js process)                                             ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │  STATIC SHELL  (pre-rendered HTML, partial prerender)          │  ║
║  │                                                                 │  ║
║  │  Contains: all non-async components (no data reads)            │  ║
║  │  Served: immediately from disk (like Full Route Cache)         │  ║
║  │  Streams to browser: before the dynamic holes resolve          │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                          │ (simultaneously)                           ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │  SUSPENSE BOUNDARY (dynamic hole)                               │  ║
║  │                                                                 │  ║
║  │  For each <Suspense>-wrapped async component:                  │  ║
║  │                                                                 │  ║
║  │  ┌─────────────────────────────────────────────────────────┐   │  ║
║  │  │  'use cache' FUNCTION BOUNDARY                         │   │  ║
║  │  │  (replaces both unstable_cache AND implicit fetch)     │   │  ║
║  │  │                                                         │   │  ║
║  │  │  Key: function identity + serialised arguments         │   │  ║
║  │  │  Value: function return value                          │   │  ║
║  │  │  Tags: cacheTag(tags.products) etc.                    │   │  ║
║  │  │  Lifetime: cacheLife('hours') / 'minutes' / 'days'    │   │  ║
║  │  │                                                         │   │  ║
║  │  │  HIT  → return cached value, stream into Suspense hole │   │  ║
║  │  │  MISS → call function body ↓                           │   │  ║
║  │  └─────────────────────────────────────────────────────────┘   │  ║
║  │                         │ MISS                                  │  ║
║  │                         ▼                                       │  ║
║  │  ┌─────────────────────────────────────────────────────────┐   │  ║
║  │  │  ACTUAL DATA SOURCE                                    │   │  ║
║  │  │  (database / external API / fetch / file system)       │   │  ║
║  │  │                                                         │   │  ║
║  │  │  → Execute function body                               │   │  ║
║  │  │  → Result written to cache under derived key           │   │  ║
║  │  │  → Streamed into <Suspense> hole                       │   │  ║
║  │  └─────────────────────────────────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════════╝
                          │
                          ▼
              Browser receives static shell HTML first
              Then receives streaming chunks for each Suspense hole
              Router Cache stores full RSC payload on completion
```

### Cache Components Request Flow — Step by Step

1. **Browser** navigates to `/c09-legacy-caches`.
2. **Router Cache** check: cached RSC payload?
   - HIT: serve instantly. Done.
   - MISS: request to server.
3. **Static shell** streamed to browser immediately (no data reads needed).
   Visitor sees the page header and learning notes right away.
4. For each `<Suspense>` boundary (e.g. `<FeaturedProducts />`):
   - **`'use cache'` function check**: is the result in cache?
     - HIT: stream the result into the Suspense hole. Done.
     - MISS: run the function body.
   - Function body runs: calls `listProducts()`, gets results.
   - Result stored in cache under the auto-derived key with the registered tags
     and lifetime (`cacheTag(tags.products)`, `cacheLife('hours')`).
   - Result streamed into the Suspense hole as an RSC chunk.
5. Browser assembles static shell + streamed holes = full page.
6. Browser stores RSC payload in **Router Cache**.

---

## Diagram C — `revalidateTag` Invalidation Flow

Both models use `revalidateTag`.  Here is what it busts in each:

### Legacy model (v14):

```
Server Action: revalidateTag("products")
  │
  ├──→ DATA CACHE: all entries tagged "products" → marked stale
  │
  ├──→ FULL ROUTE CACHE: all routes that consumed tag "products"
  │       during last render → marked stale
  │       (Next.js tracks this mapping at render time)
  │
  └──→ REQUEST MEMOIZATION: N/A (per-request, discarded after each render)

  NOT AFFECTED:
  └──→ ROUTER CACHE (browser): browser still serves its RSC payload
        until TTL expires (~5min static / ~30s dynamic) or
        router.refresh() is called.

  Next request to affected route:
    Full Route Cache miss → re-render → Data Cache miss →
    hit data source → populate Data Cache → populate Full Route Cache
```

### Cache Components model (v16):

```
Server Action: revalidateTag("products")    [or revalidateTag(tags.products)]
  │
  ├──→ DATA CACHE: all 'use cache' entries tagged "products" → marked stale
  │       (same store, same mechanism — revalidateTag API is unchanged)
  │
  └──→ STATIC SHELL: if the static shell itself consumed the tag, it is
        re-rendered (rare — static shells usually have no data reads)

  Suspense holes that called getCachedFeaturedProducts():
    Next render → 'use cache' miss → run function body →
    hit data source → populate cache → stream fresh data

  NOT AFFECTED:
  └──→ ROUTER CACHE (browser): same as legacy — TTL-based, not push-invalidated
```

**Key insight:** `revalidateTag` works the same way in v16 as in v14.  The
difference is that in v16 you register tags with `cacheTag()` inside the
function body instead of in the `fetch()` options or `unstable_cache` options.

---

## Side-by-Side Comparison

| Aspect | Legacy (v14) | Cache Components (v16) |
|--------|-------------|------------------------|
| Default for data | `force-cache` (cached forever) | Uncached (dynamic) |
| Cache opt-in | `fetch()` auto-caches by default | `'use cache'` directive |
| Non-fetch caching | `unstable_cache(fn, keys, opts)` | `'use cache'` + `cacheTag` + `cacheLife` |
| Cache key | Manual key array (error-prone) | Auto-derived from fn + args |
| Cache lifetime | `revalidate: N` in options | `cacheLife('hours')` etc. inside fn |
| Tag registration | `{ next: { tags } }` in fetch options | `cacheTag(tag)` inside fn |
| Tag invalidation | `revalidateTag(tag)` | `revalidateTag(tag)` (unchanged) |
| Route lifetime | `export const revalidate = N` | Forbidden; use `cacheLife` per fn |
| Dynamic routes | `export const dynamic = 'force-dynamic'` | Forbidden; dynamic is the default |
| Page component | `async function Page()` + top-level await | Non-async static shell + `<Suspense>` |
| PPR support | Optional via `experimental.ppr` | Native (`cacheComponents: true`) |
| Request Memoization | In-process Map, auto-applied to fetch | Present; explicit via React `cache()` |
| Data Cache | Server disk, persistent | Server disk, same store |
| Full Route Cache | Whole pre-rendered route | Static shell only (dynamic holes stream) |
| Router Cache | Browser RAM, ~5min/~30s TTL | Browser RAM, same TTL |

---

## Reading Existing Code — Quick Diagnostic

When you open a legacy Next.js codebase, look for these signals:

```ts
// SIGNAL 1 — Route-level ISR (Data Cache + Full Route Cache)
export const revalidate = 3600;

// SIGNAL 2 — Route forced dynamic (bypasses Full Route Cache)
export const dynamic = "force-dynamic";

// SIGNAL 3 — Implicit fetch caching (Data Cache via fetch)
const res = await fetch(url, {
  next: { revalidate: 60, tags: ["products"] },
});

// SIGNAL 4 — Explicit fetch no-cache (bypasses Data Cache)
const res = await fetch(url, { cache: "no-store" });

// SIGNAL 5 — Non-fetch caching (Data Cache via unstable_cache)
const getCached = unstable_cache(fn, keyArray, { revalidate, tags });

// SIGNAL 6 — Manual router cache busting
router.refresh();   // in a Client Component

// SIGNAL 7 — Tag invalidation (busts Data Cache + Full Route Cache)
revalidateTag("products");
```

Each signal maps to a specific cache and a specific migration action.  The
`migration-notes.md` in this directory covers each migration pattern in detail.
