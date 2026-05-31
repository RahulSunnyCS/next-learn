# C03 PPR — Cache Flow Diagram

> Required artifact for cache challenges. Describes exactly what is cached,
> what cache tag is attached, what lifetime applies, and what triggers
> invalidation.

---

## The Two-Layer Data Flow

```
REQUEST: GET /c03-product-ppr/wireless-noise-cancelling-headphones
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js Server (PPR handler)                                        │
│                                                                       │
│  1. getProductShellData("wireless-noise-cancelling-headphones")       │
│     ├── 'use cache' — CACHE LOOKUP                                   │
│     │     key: slug argument                                          │
│     │     tag: "product:wireless-noise-cancelling-headphones"        │
│     │     life: 'hours' (time-based revalidation)                    │
│     │                                                                 │
│     │   Cache HIT? → return cached Product immediately (~0ms)        │
│     │   Cache MISS?→ call getProductBySlug() → await delay(30-120ms) │
│     │               → store result in cache with tag + TTL           │
│     │               → return result                                   │
│     │                                                                 │
│  2. Build STATIC SHELL HTML (synchronous, from cached product data)  │
│     └── ProductShell component renders: name, price, image, desc     │
│                                                                       │
│  3. Write HTTP 200 + flush shell HTML to client                       │
│     ┌─────────────────────────────────────────────────────────────┐  │
│     │ STATUS CODE LOCKED AT 200 AFTER THIS POINT                  │  │
│     └─────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  4. Resolve Suspense holes CONCURRENTLY (no 'use cache' in any hole)  │
│                                                                       │
│     Hole 1: LiveInventory                                             │
│     ├── getProductBySlug(slug)  ← UNCACHED, fresh per-request        │
│     │   await delay(30-120ms)                                        │
│     └── stream stock badge HTML to client                            │
│                                                                       │
│     Hole 2: Recommendations                                           │
│     ├── listProducts({ categoryId })  ← UNCACHED, fresh per-request  │
│     │   await delay(30-120ms)                                        │
│     └── stream 3 product cards HTML to client                        │
│                                                                       │
│     Hole 3: Reviews                                                   │
│     ├── listReviews(productId)  ← UNCACHED, fresh per-request        │
│     │   await delay(30-120ms)                                        │
│     └── stream review list HTML to client                            │
│                                                                       │
│     Error Demo: StreamErrorDemo                                       │
│     ├── await delay(60ms)                                             │
│     ├── throw new Error(...)                                          │
│     ├── catch(err) → render error fallback                           │
│     └── stream error fallback HTML to client (HTTP still 200)        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
    CLIENT BROWSER
    First chunk: shell HTML (instant, from cache or first render)
    Later chunks: each hole's HTML as it resolves (30-120ms apart)
```

---

## Cache Entries

| Function | Directive | Cache key | Tag | Lifetime | Invalidation trigger |
|----------|-----------|-----------|-----|----------|---------------------|
| `getProductShellData(slug)` | `'use cache'` | `slug` arg | `product:<slug>` | `'hours'` | `revalidateTag(tags.product(slug))` from a Server Action after product update |
| `getCachedCategoryProducts(categoryId)` | `'use cache'` | `categoryId` arg | `tags.products` | `'hours'` | `revalidateTag(tags.products)` after any product add/remove |
| `LiveInventory` (getProductBySlug) | None | — | — | Never | Always fresh |
| `Recommendations` (listProducts) | None | — | — | Never | Always fresh |
| `Reviews` (listReviews) | None | — | — | Never | Always fresh |

---

## Invalidation Pattern (Server Action — not implemented in this challenge)

```typescript
// app/(challenges)/c03-product-ppr/actions.ts
"use server";
import { revalidateTag } from "next/cache";
import { tags } from "@/lib/data";

export async function invalidateProduct(slug: string) {
  // Called after a product update (price change, description edit, etc.)
  // Removes the specific product's cache entry so the next request
  // triggers a fresh fetch and the new data is prerendered.
  revalidateTag(tags.product(slug));
}
```

---

## What the Build Sees

```
next build output (route table):

  ○  /c03-product-ppr            (Static)     ← index page if it exists
  ◐  /c03-product-ppr/[slug]     (Partial Prerender)  ← THIS ROUTE
```

The `◐` symbol means: "Next.js will prerender the shell at build time (or on
first request) and cache it. Dynamic holes are excluded from prerendering and
run per-request."

If you see `ƒ` (Dynamic) instead, the route has an uncached read OUTSIDE a
Suspense boundary. Check for any direct uncached data call at the top level
of the page component.

---

## The PPR "Two-Phase" Mental Model

```
PHASE 1 — Build / Cache warm (happens once):
  Server renders everything EXCEPT Suspense holes
  → produces shell HTML
  → stores in cache with tags/TTL

PHASE 2 — Every request (happens per visitor):
  1. Serve cached shell HTML (instant, ~0ms)
  2. Kick off all Suspense holes concurrently
  3. Stream each hole's HTML as it resolves
  4. Holes are independent — slow hole doesn't block fast hole

The user sees:
  t=0ms     Shell visible (product name, price, image)
  t=~60ms   First hole resolves (whichever finishes first)
  t=~90ms   Second hole resolves
  t=~120ms  Third hole resolves
  t=~180ms  Error demo hole resolves
```
