# Challenge Spec — C07: Data Fetching Patterns

> **File:** `app/(challenges)/c07-data-fetching/_meta/spec.md`

---

## Learning Goal

This challenge teaches the three most important data-fetching patterns for
Next.js App Router Server Components:

1. **Request memoisation with `React.cache()`** — deduplicate reads within a
   single server render pass so that multiple components calling the same
   accessor only hit the underlying data source once.

2. **Waterfall vs. parallel fetching** — recognise the N+1 / sequential-await
   anti-pattern, measure the latency cost, and fix it with `Promise.all()` or
   hoisted promise variables.

3. **The preload pattern** — kick off a fetch high in the tree before the
   consuming component renders, eliminating per-component startup latency.

You will also learn the critical distinction between `React.cache()` and the
`'use cache'` directive — two tools that sound similar but serve very different
purposes.

---

## Core Concept: React `cache()` vs `'use cache'` Directive

These are the two most commonly confused caching primitives in Next.js 16.

### React `cache()` — per-request memoisation

```typescript
import { cache } from "react";
const getUser = cache(async (id: string) => db.users.find(id));
```

- **Scope:** one server render request.
- **Lifetime:** the memoised map is created at the start of the request and
  garbage-collected when the request ends.
- **Purpose:** deduplicate identical calls within one render tree. If
  `<Header>`, `<Sidebar>`, and `<Body>` all call `getUser("u-1")` during the
  same render, only **one** underlying `db.users.find()` runs.
- **Does NOT survive between requests.** A second visitor makes a fresh render,
  fresh cache.
- **Cannot set cache tags or lifetimes.** It is memoisation, not caching.

### `'use cache'` directive — cross-request persistence

```typescript
async function getProductData(slug: string) {
  "use cache";
  cacheTag(tags.product(slug));
  cacheLife("hours");
  return db.products.findBySlug(slug);
}
```

- **Scope:** the Next.js server-side cache (survives restarts in production,
  backed by a cache store).
- **Lifetime:** controlled by `cacheLife()` and invalidated by `revalidateTag()`.
- **Purpose:** cache expensive data across requests and across users. The first
  caller pays the full cost; subsequent callers get the cached result instantly.
- **Cross-request.** Data fetched for user A is served to user B (appropriate
  for public, non-personalised data; NOT for user-specific data).
- **Requires `cacheTag()` + `cacheLife()`** for production use (without them
  Next.js applies default lifetime, which may be too short or too long).

### When to use each

| Need | Tool |
|------|------|
| Two components read the same record in one render | `React.cache()` |
| Avoid hitting the DB at all for repeat visitors | `'use cache'` |
| Data is user-specific (must NOT be shared) | `React.cache()` only |
| Data is public (can be shared across users) | Both |
| Invalidate stale data on write | `'use cache'` + `revalidateTag()` |

In practice: wrap your accessor in `React.cache()` **and** add `'use cache'` to
the same function for public data — you get per-request deduplication AND
cross-request persistence.

---

## Pattern 1 — Request Memoisation with `React.cache()`

**The problem:** In a component tree, the same product id might be needed by
three unrelated components (a breadcrumb, a price badge, an image). Without
memoisation, each component independently awaits its own `getProductById()`
call, firing three random delays (3 × 30–120ms each).

**The fix:**

```typescript
import { cache } from "react";
import { getProductById } from "@/lib/data";

export const getProductByIdMemo = cache(async (id: string) => {
  return getProductById(id);
});
```

Now three components calling `getProductByIdMemo("p-elec-001")` result in
**one** underlying call. The promise is memoised in the request-scoped cache;
all callers share the same resolved value.

**How to observe it:** The challenge page shows an `underlyingFetchCount` counter.
With three components calling the raw accessor, the count is 3. With three
components calling the memoised accessor, the count is 1.

---

## Pattern 2 — Waterfall vs. Parallel Fetching

### The waterfall anti-pattern

```typescript
// BAD — sequential awaits create a waterfall
async function WaterfallPage() {
  const product  = await getProductRaw("p-elec-001");  // wait 30–120ms
  const category = await listCategoriesRaw();           // wait 30–120ms MORE
  const reviews  = await listReviewsMemo("p-elec-001"); // wait 30–120ms MORE
  // Total: 3 × latency = ~90–360ms
}
```

Each `await` blocks until the previous one resolves. The requests are executed
**serially** even though they are completely independent.

### The parallel fix

```typescript
// GOOD — all three start simultaneously
async function ParallelPage() {
  const [product, categories, reviews] = await Promise.all([
    getProductRaw("p-elec-001"),
    listCategoriesRaw(),
    listReviewsMemo("p-elec-001"),
  ]);
  // Total: max(latency_a, latency_b, latency_c) ≈ 30–120ms
}
```

`Promise.all()` starts all three promises simultaneously and waits only until
the **slowest** one resolves. For N independent reads, the time goes from
`N × max_latency` to `max_latency`.

### Variant — hoisted promise variables

```typescript
// Also valid — hoist the promises, then await separately
const productPromise  = getProductRaw("p-elec-001");  // starts immediately
const categoryPromise = listCategoriesRaw();           // starts immediately
const reviewsPromise  = listReviewsMemo("p-elec-001"); // starts immediately

// Now await — all three are already in flight
const product    = await productPromise;
const categories = await categoryPromise;
const reviews    = await reviewsPromise;
```

This is equivalent to `Promise.all()` and is useful when the three values are
needed in different parts of the render function.

**How to observe it:** The `/c07-data-fetching/waterfall` sub-route shows the
sequential timing; `/c07-data-fetching/parallel` shows the parallel timing.
The timing difference is visible in the Next.js dev server response time and
in the Network tab.

---

## Pattern 3 — The Preload Pattern

The preload pattern is a way to **kick off a fetch before the consuming
component renders**, eliminating startup latency at the child level.

### Without preload

```
Parent renders
  └─ Child mounts
       └─ Child calls getProductBySlugMemo(slug)
            └─ wait 30–120ms
```

### With preload

```
Parent calls preloadProduct(slug)   ← fetch starts here
  └─ Parent renders the tree
       └─ Child calls getProductBySlugMemo(slug)
            └─ already resolved (or nearly so) — 0ms added cost
```

### Implementation

```typescript
// preload.ts
import { cache } from "react";
import { getProductBySlug } from "@/lib/data";

const getProductBySlugMemo = cache(async (slug: string) => getProductBySlug(slug));

export function preloadProduct(slug: string): void {
  void getProductBySlugMemo(slug); // fire-and-forget; promise stored in React cache
}
```

The `void` keyword is intentional: we do not await the result; we just start
the fetch. Because it is wrapped in `React.cache()`, the promise is memoised.
When the consuming child later calls `getProductBySlugMemo(slug)`, it retrieves
the already-running (or already-settled) promise from the memo cache.

---

## Acceptance Criteria

1. **Request memoisation:** The challenge page shows an `underlyingFetchCount`
   that is **1** when three components call the memoised accessor with the
   same id, demonstrating deduplication.

2. **Waterfall + parallel contrast:** The `/waterfall` sub-route reproduces
   sequential awaits; the `/parallel` sub-route uses `Promise.all`. Both show
   the fetch structure in the page UI. The latency difference is documented in
   `solutions/c07-data-fetching/NOTES.md`.

3. **Preload pattern:** The index page (`/c07-data-fetching`) calls
   `preloadProduct` or `preloadCategories` before rendering the child Suspense
   components, with an explanation in the UI.

4. **`cache-flow.md`:** Documents the per-request memoisation flow and
   explicitly contrasts it with `'use cache'` cross-request persistence.

5. **`_meta` folder:** Contains this `spec.md`, `defend-it.md` (3–5 questions
   with model answers), `verification.md`, `challenge.config.json`, and
   `challenge.config.ts`. Data is read via `_lib/queries.ts` (not by editing
   `lib/data`).

6. **Build compliance:** No `export const dynamic` or other disallowed
   route-segment exports. All uncached reads (`lib/data` calls with
   `Math.random()` latency) are inside `<Suspense>` boundaries.
   `npx tsc --noEmit` exits 0.

---

## Hints

<details>
<summary>Hint 1 — Why does build fail with &quot;Uncached data was accessed outside of Suspense&quot;?</summary>

`@/lib/data` functions use `Math.random()` for latency — they are
non-deterministic. Under `cacheComponents: true`, non-deterministic reads at
the page top-level fail the build. Wrap every `_lib/queries.ts` call in a child
async component and wrap that component with `<Suspense>`.

</details>

<details>
<summary>Hint 2 — How do I prove memoisation is working?</summary>

Import `underlyingFetchCount` from `_lib/queries.ts` and render it in the page.
Before any component calls, count is 0. After three components call
`getProductByIdMemo("p-elec-001")`, count is 1 (not 3). If you switch to
`getProductRaw`, count becomes 3.

</details>

<details>
<summary>Hint 3 — What is the correct shape for the preload pattern?</summary>

```typescript
// In parent Server Component:
import { preloadProduct } from "./_lib/preload";

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  // Fire-and-forget before any child renders:
  preloadProduct("wireless-noise-cancelling-headphones");

  return (
    <Suspense fallback={<Skeleton />}>
      <ProductDetails slug="wireless-noise-cancelling-headphones" />
    </Suspense>
  );
}
```

`ProductDetails` calls `getProductBySlugMemo(slug)` — and because the parent
already started that call, it resolves immediately from the memo cache.

</details>
