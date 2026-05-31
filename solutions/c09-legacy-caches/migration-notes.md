# Migration Notes — Legacy Four-Cache Model to Cache Components

> **Reference:** `solutions/c09-legacy-caches/`
> **Applies to:** Next.js 13/14/15 → Next.js 16 migration

---

## Part 1 — The Four Caches (Pre-v16 Model)

Next.js 13–15 maintained four distinct caches.  Understanding all four is
essential for reading existing codebases and for interviews.

---

### 1. Request Memoization

| Attribute | Value |
|-----------|-------|
| **Lives** | Server process RAM — one Map per request |
| **Lifetime** | Single request/render cycle — discarded when the request ends |
| **Stores** | De-duplicated results of identical `fetch()` calls (and `unstable_cache` calls) within one render tree |
| **Next.js version** | v13+ |

**What it does:**

When two or more Server Components in the same render tree call the same
`fetch(url)` with the same URL, Next.js runs the fetch only once and returns
the same result to both callers.  This prevents "N+1 fetch" bugs where
multiple components independently hitting the same API endpoint each cause a
separate HTTP request.

```
Request 1 render tree:
  ProductCard calls fetch("https://api/products/p-001")  → network hit
  ReviewList  calls fetch("https://api/products/p-001")  → MEMOIZED (same map entry)
  BreadcrumbNav calls fetch("https://api/products/p-001") → MEMOIZED

Only 1 actual HTTP request despite 3 calls.
```

**Scope:** In-memory, in-process, per-request.  Request 2 starts with an
empty Map — it does NOT see Request 1's memoized results.

**v16 equivalent:** React's built-in `cache()` function (from `"react"`) and
`'use cache'` both de-duplicate calls, but the mechanism is more explicit.

---

### 2. Data Cache

| Attribute | Value |
|-----------|-------|
| **Lives** | Server-side, persistent on disk (`.next/cache/fetch/…`) |
| **Lifetime** | Survives server restarts; invalidated by `revalidateTag()`, `revalidatePath()`, or a time window |
| **Stores** | Resolved `fetch()` responses and `unstable_cache` values |
| **Next.js version** | v13+ |

**What it does:**

The Data Cache is the primary ISR (Incremental Static Regeneration) mechanism.
After the first request resolves a fetch, the response is written to disk.
Subsequent requests (even from different server instances in a multi-node
deployment, when using a shared cache adapter) read from disk instead of
hitting the network.

**Default behaviour in v14:**

```ts
// In Next.js 14, this defaults to { cache: 'force-cache' } — stored forever
const res = await fetch("https://api/products");

// To set a stale window (ISR-style):
const res = await fetch("https://api/products", {
  next: { revalidate: 3600 }, // stale-while-revalidate every 1 hour
});

// To bypass the Data Cache entirely (always fresh):
const res = await fetch("https://api/products", {
  cache: "no-store",
});
```

**Tag-based invalidation:**

```ts
// Tag a fetch:
const res = await fetch("https://api/products", {
  next: { tags: ["products"] },
});

// Bust the tag from a Server Action (e.g. after a product update):
import { revalidateTag } from "next/cache";
revalidateTag("products"); // busts all Data Cache entries tagged "products"
```

**Non-fetch data (unstable_cache):**

Database queries, ORM calls, and SDK calls are NOT `fetch()` calls — they do
not participate in the Data Cache automatically.  `unstable_cache` was the
escape hatch:

```ts
import { unstable_cache } from "next/cache";

// Wraps any async function; stores the return value in the Data Cache.
export const getCachedProducts = unstable_cache(
  async () => {
    return db.query("SELECT * FROM products");
  },
  ["products-list"],          // ← cache key: manual array, error-prone
  {
    revalidate: 3600,
    tags: ["products"],
  }
);
```

**v16 equivalent:** `'use cache'` + `cacheTag()` + `cacheLife()`.  The same
Data Cache store is used under the hood, but the API is completely different
(see Part 2 below).

---

### 3. Full Route Cache

| Attribute | Value |
|-----------|-------|
| **Lives** | Server-side, on disk (`.next/server/app/…`) |
| **Lifetime** | Per deployment (written by `next build`); invalidated when underlying Data Cache tags are busted |
| **Stores** | Pre-rendered HTML + RSC payload for statically generated routes |
| **Next.js version** | v13+ |

**What it does:**

During `next build`, Next.js renders every statically-deterministic route and
stores the resulting HTML and RSC (React Server Component) serialised payload
on disk.  When a request arrives, Next.js serves this pre-built output directly
— the server does NOT re-run the React render.  This is what makes the first
byte of a statically generated page instant.

**Invalidation chain:**

```
revalidateTag("products")
  → Data Cache entry for tags:["products"] marked stale
  → Next.js records which routes consumed that tag during their last render
  → Those routes' Full Route Cache entries are also marked stale
  → Next request to those routes:
      1. Misses Full Route Cache → triggers re-render
      2. Re-render misses Data Cache → hits the data source
      3. Fresh data → written to Data Cache
      4. Re-rendered HTML → written to Full Route Cache
      5. Subsequent requests → Full Route Cache hit again
```

**What makes a route ineligible for Full Route Cache:**

- `export const dynamic = 'force-dynamic'` — route is always dynamic.
- Reading `cookies()`, `headers()`, `searchParams` at the top level — these
  are per-request values, so the route cannot be pre-rendered.
- Any `fetch()` call with `cache: 'no-store'` — the route is considered
  partially dynamic.

**v16 equivalent:** Partial Prerendering (PPR).  The static shell of a route
(the part that does not read per-request data) is stored in the Full Route
Cache.  The dynamic holes (`<Suspense>` boundaries) stream in separately.

---

### 4. Router Cache

| Attribute | Value |
|-----------|-------|
| **Lives** | Browser RAM (JavaScript heap) — in the `next/navigation` router |
| **Lifetime** | Browser session (until hard reload or `router.invalidate()`) |
| **Stores** | RSC payloads (serialised React trees) for visited and prefetched routes |
| **Next.js version** | v13+ |

**What it does:**

When the user navigates to a route, the browser router stores the received RSC
payload in memory.  On subsequent navigations to the same route (back button,
clicking the same link again), the browser serves from the Router Cache
instantly — no server round-trip.

**Prefetching:**

Next.js `<Link>` prefetches routes when they appear in the viewport.  The
prefetched RSC payload is stored in the Router Cache before the user even
clicks the link.  TTLs:

| Route type | Prefetch TTL | Visit TTL |
|------------|-------------|-----------|
| Static (Full Route Cache hit) | 5 minutes | 5 minutes |
| Dynamic (no Full Route Cache) | 30 seconds | 30 seconds |

*(TTLs as of Next.js 14.2 — may change in patch versions)*

**Invalidating the Router Cache:**

```ts
// Client Component
"use client";
import { useRouter } from "next/navigation";

function RefreshButton() {
  const router = useRouter();
  return (
    <button onClick={() => router.refresh()}>
      Refresh
    </button>
  );
}

// router.refresh() sends a new RSC request to the server for the current
// route and replaces the Router Cache entry.
```

**Important:** `revalidateTag()` on the server does NOT push invalidation to
the browser's Router Cache.  The browser still serves its cached payload until
the TTL expires or `router.refresh()` is called.  This creates a brief window
(up to the Router Cache TTL) where the browser shows stale data even after a
successful server-side revalidation.

---

## Part 2 — The Migration: Legacy → Cache Components

### Why Next.js Moved to Cache Components

The four-cache model worked, but it accumulated significant developer pain:

1. **Invisible defaults.** `fetch()` defaulted to `force-cache` in v13/v14.
   Developers were constantly surprised by stale data and spent hours "fighting
   the cache" before realising they needed `cache: 'no-store'`.  The docs were
   clear, but the behaviour was not discoverable.

2. **Two different APIs for the same concept.**  `fetch()` had `cache` and
   `next` options.  Non-fetch data sources needed `unstable_cache()`.  Knowing
   WHICH to use required knowing whether the underlying call was a `fetch()`.

3. **Route-level vs. function-level lifetime.**  `export const revalidate = 3600`
   applied to ALL fetches on a route.  Overriding it per-fetch required adding
   `{ next: { revalidate: N } }` to each individual `fetch()` call.  Getting
   it wrong silently set the wrong TTL.

4. **Manual cache keys.**  `unstable_cache` required an explicit key array.
   Forgetting to include function arguments in the key produced incorrect cache
   hits (e.g., a function that took `categoryId` but whose key array omitted it
   would return the same results for every category).

5. **PPR incompatibility.**  Partial Prerendering required the framework to know
   statically which parts of a page were dynamic.  Implicit caching made this
   ambiguous — a `fetch()` might or might not be cached depending on runtime
   state.

**Next.js 16's answer:** explicit `'use cache'` directive.

- Dynamic is the default.  No hidden `force-cache`.
- One API for all data sources: the `'use cache'` directive works on any async
  function, whether it calls `fetch()`, queries a database, or calls an SDK.
- Cache key is derived automatically from function identity + arguments by the
  React compiler.
- Lifetime (`cacheLife`) and tags (`cacheTag`) are declared inside the function
  body — co-located with the code they affect.
- PPR works cleanly because the static/dynamic boundary is explicit at the
  component level.

---

### The Migration Pattern (Before / After)

#### Pattern 1: `unstable_cache` → `'use cache'`

**Before (Next.js 14):**

```ts
// data-layer.ts
import { unstable_cache } from "next/cache";
import { listProducts } from "@/lib/data";

export const getFeaturedProducts = unstable_cache(
  async () => {
    const result = await listProducts({ pageSize: 6 });
    return result.items;
  },
  ["featured-products"],      // manual cache key
  {
    revalidate: 3600,
    tags: ["products"],
  }
);
```

**After (Next.js 16):**

```ts
// data-layer.ts
import { cacheTag, cacheLife } from "next/cache";
import { listProducts, tags } from "@/lib/data";

export async function getCachedFeaturedProducts() {
  "use cache";
  cacheTag(tags.products);    // tag: same string as before
  cacheLife("hours");         // ~1-hour stale window: same as revalidate: 3600
  const result = await listProducts({ pageSize: 6 });
  return result.items;
}
```

Observable difference: **none**.  The user sees the same data, the same stale
window, and `revalidateTag("products")` still invalidates both.

---

#### Pattern 2: `fetch(url, { next: { revalidate, tags } })` → `'use cache'`

**Before (Next.js 14):**

```ts
async function getProductData(id: string) {
  // fetch option bag — the caching config is inside the fetch call.
  const res = await fetch(`https://api/products/${id}`, {
    next: {
      revalidate: 300,             // 5-minute stale window
      tags: [`product:${id}`],
    },
  });
  return res.json();
}
```

**After (Next.js 16):**

```ts
async function getCachedProductData(id: string) {
  "use cache";
  cacheTag(tags.product(id));      // same tag
  cacheLife("minutes");            // ~5-minute stale window
  const res = await fetch(`https://api/products/${id}`);
  // fetch() itself is plain — the caching is at the function boundary, not
  // inside the fetch options.  The fetch option bag is unchanged or simplified.
  return res.json();
}
```

**Key insight:** in v16, the `fetch()` call loses its `cache`/`next` options.
The data source is irrelevant to caching — only the function boundary matters.

---

#### Pattern 3: `export const revalidate` → `cacheLife()` per function

**Before (Next.js 14):**

```ts
// page.tsx
export const revalidate = 3600; // all fetches on this route: 1-hour stale window

export default async function Page() {
  const products = await fetch("https://api/products").then(r => r.json());
  const categories = await fetch("https://api/categories").then(r => r.json());
  // Both use the same 1-hour window (the route-level revalidate).
  return <div>{/* ... */}</div>;
}
```

**After (Next.js 16):**

```ts
// page.tsx — no export const revalidate (forbidden with cacheComponents)

async function getCachedProducts() {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");          // products: 1-hour stale window
  return fetch("https://api/products").then(r => r.json());
}

async function getCachedCategories() {
  "use cache";
  cacheTag(tags.categories);
  cacheLife("days");           // categories: 24-hour stale window (they change rarely)
  return fetch("https://api/categories").then(r => r.json());
}

// Now products and categories have DIFFERENT lifetimes on the SAME page.
// This was impossible with route-level revalidate in v14.
```

---

#### Pattern 4: Page component (async → static shell + Suspense)

**Before (Next.js 14):**

```tsx
// The whole page is async; data reads block the entire render.
export default async function ProductsPage() {
  const products = await getFeaturedProducts(); // blocks here
  return (
    <main>
      <h1>Products</h1>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </main>
  );
}
```

**After (Next.js 16):**

```tsx
// Static shell: non-async, no data reads, prerenders immediately.
export default function ProductsPage() {
  return (
    <main>
      <h1>Products</h1>
      {/* Dynamic hole: async, must be inside Suspense */}
      <Suspense fallback={<ProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>
    </main>
  );
}

// Async component: lives inside Suspense, reads cached data.
async function FeaturedProducts() {
  const products = await getCachedFeaturedProducts();
  return products.map(p => <ProductCard key={p.id} product={p} />);
}
```

**Why the Suspense pattern:**
Under `cacheComponents: true`, reading any async data (even from a cached
function) at the route's top level fails the build with:
*"Uncached data was accessed outside of `<Suspense>`"*.
Every async read must be inside a `<Suspense>` boundary.

---

## Part 3 — Version Timeline

| Version | Caching model | Key changes |
|---------|--------------|-------------|
| v13 (App Router) | Four-cache model introduced | `fetch` caching, Request Memoization, `cache()` from React |
| v13.4 | App Router stable | `unstable_cache` introduced |
| v14.0 | `fetch` defaults to `force-cache` | `revalidateTag` / `revalidatePath` added |
| v14.1 | Router Cache TTL configurable | `staleTimes` config in next.config |
| v15.0 | `fetch` defaults changed | `fetch` no longer `force-cache` by default — opt-in required |
| v15.0 (canary) | `'use cache'` directive introduced | `cacheTag`, `cacheLife` added as `unstable_*` |
| v16.0 | Cache Components stable | `cacheTag` / `cacheLife` stable (no `unstable_` prefix); `cacheComponents: true` flag; implicit fetch caching fully superseded |

**The v15 → v16 breaking change for this app:**
`cacheComponents: true` in `next.config.ts` activates the v16 model for the
entire app.  This means `export const revalidate` and `export const dynamic`
are forbidden in every route — not just the ones you migrate.

---

## Part 4 — Interview Quick-Reference

### "Explain the four caches in Next.js"

> Next.js 13/14/15 maintained four caches: (1) **Request Memoization** — a
> per-request Map that de-duplicates identical `fetch()` calls within one
> render, ensuring the same URL is only fetched once per request; (2) **Data
> Cache** — a persistent server-side store that holds resolved `fetch()` and
> `unstable_cache` values across requests, invalidated by `revalidateTag()` or
> time; (3) **Full Route Cache** — pre-rendered HTML and RSC payload written
> to disk at build time, serving static routes without re-rendering; (4)
> **Router Cache** — the browser's in-memory store of RSC payloads for
> navigated and prefetched routes, making back/forward navigation instant.

### "What does `revalidateTag` do?"

> It marks all Data Cache entries tagged with the given string as stale.
> Transitively, it also marks as stale the Full Route Cache entries for any
> routes that consumed those tagged Data Cache entries during their last render.
> The next incoming request to an affected route re-renders, re-fetches, and
> repopulates both caches. The Router Cache (browser-side) is NOT directly
> invalidated — the browser retains its RSC payload until the TTL expires or
> `router.refresh()` is called.

### "Why was `unstable_cache` replaced by `'use cache'`?"

> Three main reasons: (1) **Manual key management** — `unstable_cache` required
> a separate key array that could easily be wrong if function arguments were
> omitted; `'use cache'` derives the key automatically from the function
> identity and serialised arguments. (2) **Separation of concerns** —
> `unstable_cache` put the cache config at the call site, away from the
> function body; `'use cache'` puts the cache config (`cacheTag`, `cacheLife`)
> co-located inside the function, making it readable at the definition site.
> (3) **PPR compatibility** — `'use cache'` integrates with Partial Prerendering
> by making the static/dynamic boundary explicit at the component/function level,
> whereas `unstable_cache` was a black box to the framework's static analysis.
