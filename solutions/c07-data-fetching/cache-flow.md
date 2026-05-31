# C07 — Cache Flow: Per-Request Memoisation vs Cross-Request Persistence

> **File:** `solutions/c07-data-fetching/cache-flow.md`
>
> This document is the canonical cache-challenge diagram for C07. It
> distinguishes `React.cache()` (per-request memoisation) from the `'use cache'`
> directive (cross-request persistence). C08 covers `'use cache'` in depth.

---

## The Two Caching Layers

```
                    ┌────────────────────────────────────────────────────────┐
                    │           SINGLE SERVER REQUEST (one user, one page)   │
                    │                                                        │
  Component A  ──► │  getProductByIdMemo("p-1")                             │
                    │       │                                                │
  Component B  ──► │  getProductByIdMemo("p-1")  ──► React.cache() memo    │
                    │       │                          (in-memory, request-  │
  Component C  ──► │  getProductByIdMemo("p-1")       scoped Map)           │
                    │                                     │                  │
                    │                                     │ first call only  │
                    │                                     ▼                  │
                    │                         getProductById("p-1")         │
                    │                         (underlying data layer)        │
                    │                         ~30–120ms latency              │
                    └────────────────────────────────────────────────────────┘
                                   request ends → memo discarded
```

### What React.cache() does here

1. Request arrives. React.cache() creates an empty memoisation Map scoped to
   this request.
2. Component A calls `getProductByIdMemo("p-1")`. Cache miss → fires
   `getProductById("p-1")`, stores the resulting Promise in the Map.
3. Component B calls `getProductByIdMemo("p-1")`. Cache hit → returns the same
   Promise from step 2. No second data-layer call.
4. Component C: same as B. Still one underlying call total.
5. When the response is sent, the Map is garbage-collected. The next request
   starts with a fresh, empty Map.

**Key properties:**
- Scope: one request.
- Persistence: zero (discarded after each response).
- Safe for user-specific data (no cross-user leakage possible).
- Does not require tags or lifetimes.
- Import: `import { cache } from "react"`.

---

## Layer 2 — 'use cache' (Next.js, cross-request)

```
  Request 1 (User A)                    Request 47 (User B)
  ─────────────────────                 ───────────────────────
  getProductShellData("slug")           getProductShellData("slug")
        │                                      │
        ▼                                      ▼
  Next.js Server Cache  ◄───────────────  Next.js Server Cache
  (persists across                        (cache HIT — returns
   requests)                               stored value instantly)
        │
        │ cache MISS (first call)
        ▼
  getProductBySlug("slug")
  (underlying data layer)
  ~30–120ms latency
  Result stored with:
    cacheTag(tags.product("slug"))
    cacheLife("hours")
```

### What 'use cache' does

1. First request: cache miss → calls data layer → stores result in server cache.
2. All subsequent requests: cache hit → returns stored value immediately.
3. Cache entry is invalidated when `revalidateTag(tags.product("slug"))` is
   called (e.g. from a Server Action after a product update).
4. Cache entry also expires after the `cacheLife("hours")` TTL, even without
   explicit invalidation.

**Key properties:**
- Scope: all requests, all users.
- Persistence: until explicit invalidation or TTL expiry.
- NOT safe for user-specific data.
- Requires `cacheTag()` + `cacheLife()` for production.
- Import: `import { cacheTag, cacheLife } from "next/cache"`.

---

## The Combined Pattern (for public data)

```typescript
// Best of both worlds for public, shared data:
export const getProductShellData = cache(async (slug: string) => {
  "use cache";
  cacheTag(tags.product(slug));
  cacheLife("hours");
  return getProductBySlug(slug);
});
```

```
Request 1:
  cache() memo: MISS → 'use cache': MISS → data layer (30–120ms)
  Result stored in: both React.cache() Map AND Next.js server cache

Request 2 (same user, same request):
  cache() memo: HIT → returns immediately (same promise, 0ms)

Request 47 (different user):
  cache() memo: empty (new request) → 'use cache': HIT → returns immediately
```

Layer 1 (React.cache): deduplicates within one request.
Layer 2 ('use cache'):  deduplicates across all requests.

---

## Why the Distinction Matters

| Scenario | Use | Why |
|----------|-----|-----|
| User&apos;s shopping cart (private) | React.cache() only | Cross-request cache would serve user A&apos;s cart to user B |
| Product name/price (public) | Both | Safe to share; two-layer deduplication |
| A/B test variant per user | React.cache() only | Variant is request-scoped, not shared |
| Site-wide navigation links | Both | Static public data; maximum cache benefit |
| Live stock count (always fresh) | Neither | Must be fresh; inside Suspense, no cache |

---

## Forward Reference: C08

C08 covers `'use cache'` in depth, including:
- Tag hierarchies (product tag vs. products collection tag)
- Lifetime profiles (seconds / minutes / hours / days)
- Server Actions and `revalidateTag` for mutation-driven invalidation
- The interaction between `'use cache'` and Partial Prerendering (PPR)

For now: remember the one-line distinction:
- `React.cache()` = deduplicate within a request (private, ephemeral)
- `'use cache'`   = persist across requests (shared, durable)
