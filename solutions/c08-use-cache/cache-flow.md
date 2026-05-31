# C08 `'use cache'` — Cache Flow Diagram

> Required artifact: describes what is cached, under which tag/lifetime, what
> triggers a cache hit vs a recompute, and how invalidation flows.

---

## The Three Cache Units on This Page

```
REQUEST: GET /c08-use-cache
         │
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Next.js Server (Cache Components handler)                              │
│                                                                          │
│  ── STATIC SHELL PHASE ──────────────────────────────────────────────  │
│                                                                          │
│  1. getAllCachedCategories()                                             │
│     FILE-LEVEL 'use cache' (inherited from module directive)            │
│     key  : (no args) → single shared slot                               │
│     tag  : "categories"                                                  │
│     life : 'days'  (~24h TTL)                                           │
│                                                                          │
│     Cache HIT?  → return cached Category[] immediately  (~0ms)         │
│     Cache MISS? → await listCategories() → store → return              │
│                                                                          │
│  2. getCachedProductSummary("p-elec-001")                               │
│     FUNCTION-LEVEL 'use cache'                                          │
│     key  : "p-elec-001"                                                  │
│     tag  : "product:p-elec-001"                                         │
│     life : 'hours' (~1h TTL)                                            │
│                                                                          │
│     Cache HIT?  → return cached Product | null immediately              │
│     Cache MISS? → await getProductById("p-elec-001") → store → return  │
│                                                                          │
│  3. Shell HTML assembled synchronously from cached data                  │
│                                                                          │
│  4. HTTP 200 + shell HTML flushed to browser                            │
│     ┌───────────────────────────────────────────────────────────┐       │
│     │ STATUS CODE LOCKED AT 200 AFTER THIS POINT                │       │
│     └───────────────────────────────────────────────────────────┘       │
│                                                                          │
│  ── STREAMING PHASE (Suspense holes) ────────────────────────────────  │
│                                                                          │
│  5. CachedPanel component (productId="p-elec-002")                      │
│     COMPONENT-LEVEL 'use cache'                                          │
│     key  : "p-elec-002"                                                  │
│     tag  : "product:p-elec-002"                                         │
│     life : 'hours'                                                       │
│     unit : SERIALISED RSC PAYLOAD (the entire rendered component)       │
│                                                                          │
│     Cache HIT?  → serve RSC payload  (~0ms, barely visible skeleton)   │
│     Cache MISS? → await getProductById() → render → store RSC → stream  │
│                                                                          │
│  6. ReactCacheDemoA + ReactCacheDemoB (React.cache() demo)              │
│     REACT cache() — PER-REQUEST only, NOT persisted cross-request       │
│     Both call deduplicatedGetProduct("p-elec-003")                      │
│     Function body runs ONCE; second caller gets memo result             │
│     At request end: memo discarded (no cross-request benefit)           │
│                                                                          │
│  7. UncachedDataPanel (productId="p-elec-004")                          │
│     NO 'use cache' — runs on EVERY request, every time                  │
│     await listProducts({ pageSize: 1 }) → always incurs latency        │
│     This component is the reason the route shows ◐ not ○               │
│                                                                          │
└────────────────────────────────────────────────────────────────────────┘
         │
         ▼
    CLIENT BROWSER
    First chunk : shell HTML + skeleton placeholders (instant)
    Later chunks: CachedPanel RSC, ReactCacheDemo panels, UncachedPanel
                  (each as its Suspense hole resolves)
```

---

## Cache Entries Summary

| Function / Component | Directive | Cache key | Tag | Lifetime | Invalidation |
|---|---|---|---|---|---|
| `getAllCachedCategories()` | File-level `'use cache'` | `(no args)` | `categories` | `'days'` | `revalidateTag(tags.categories)` |
| `getCachedProductSummary("p-elec-001")` | Function-level `'use cache'` | `"p-elec-001"` | `product:p-elec-001` | `'hours'` | `revalidateTag(tags.product("p-elec-001"))` |
| `CachedPanel` (productId="p-elec-002") | Component-level `'use cache'` | `"p-elec-002"` | `product:p-elec-002` | `'hours'` | `revalidateTag(tags.product("p-elec-002"))` |
| `deduplicatedGetProduct("p-elec-003")` | React `cache()` | `"p-elec-003"` | — | Request lifetime | Automatic (request end) |
| `UncachedDataPanel` | None | — | — | Never cached | Always fresh |

---

## Invalidation Flow (Server Action pattern)

```
User edits product "p-elec-001" in admin:
       │
       ▼
Server Action runs:
  await updateProduct("p-elec-001", { priceCents: 19999 });
  revalidateTag(tags.product("p-elec-001"));
       │
       ▼
Next.js Cache Store:
  Evicts entry tagged "product:p-elec-001"
  (getCachedProductSummary and any CachedPanel with that id)
       │
       ▼
Next request for /c08-use-cache:
  Cache miss for getCachedProductSummary("p-elec-001")
  → getProductById runs → returns updated product (priceCents: 19999)
  → new entry stored with fresh TTL
       │
       ▼
Browser sees updated price — no full rebuild needed
```

---

## React `cache()` vs `'use cache'` — Flow Comparison

```
React cache() — per-request:

  Request A:
    Component A calls fn("p-elec-003") → function body RUNS → result A
    Component B calls fn("p-elec-003") → memo HIT → result A (deduped)
    Request A ends → memo discarded ──────────────────────────────────┐
                                                                       │
  Request B:                                                           │
    Component A calls fn("p-elec-003") → function body RUNS again ←──┘
    (no benefit from Request A — memo was discarded)


'use cache' — cross-request:

  Request A:
    getCachedProductSummary("p-elec-001") → MISS → function runs → cached
    Request A ends → cache entry PERSISTS ───────────────────────────┐
                                                                       │
  Request B:                                                           │
    getCachedProductSummary("p-elec-001") → HIT ←──────────────────┘
    function body does NOT run → result from cache (~0ms)

  ...until TTL expires or revalidateTag() is called
```

---

## What the Build Sees

```
next build output (route table):

  ◐  /c08-use-cache   (Partial Prerender)
```

The `◐` symbol means: shell is prerenderable (all top-level data is cached),
but the route has at least one `<Suspense>` hole with uncached data. The
`UncachedDataPanel` is what prevents `○ (Static)`.

To make the route fully `○`:
  Remove UncachedDataPanel (or wrap its data in 'use cache').
  With no uncached reads anywhere in the tree, the build produces `○`.
```

---

## Multiple Tags — Invalidation Diagram

```
getCachedProductWithCollectionTag("p-elec-001"):
  entry tagged: ["product:p-elec-001", "products"]

  Path A — specific product changes:
    revalidateTag("product:p-elec-001")
    → entry evicted

  Path B — entire product collection reshuffled:
    revalidateTag("products")
    → entry evicted (along with all other entries tagged "products")

Both paths force a recompute on the next request.
```
