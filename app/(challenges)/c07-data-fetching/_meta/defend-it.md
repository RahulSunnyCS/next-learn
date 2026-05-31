# Defend-It Worksheet — Data Fetching Patterns

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c07-data-fetching/`. Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — `React.cache()` vs `'use cache'`

*You have two caching tools available: `React.cache()` (imported from
`"react"`) and the `'use cache'` directive (Next.js 16). Describe one
scenario where you would use `React.cache()` but NOT `'use cache'`, and one
scenario where you would use BOTH. Explain why each choice is correct.*

**Your answer:**

<!-- Write here -->

---

### Q2 — Identifying a waterfall

*A teammate writes this Server Component:*

```typescript
async function ProductPage({ id }: { id: string }) {
  const product  = await db.getProduct(id);
  const category = await db.getCategory(product.categoryId);
  const reviews  = await db.getReviews(id);
  return <Layout product={product} category={category} reviews={reviews} />;
}
```

*Which of these three fetches is sequential (waterfall) by necessity, and
which could be parallelised? Rewrite the function to be as fast as possible.*

**Your answer:**

<!-- Write here -->

---

### Q3 — The preload pattern

*Explain what problem the preload pattern solves. Give a concrete example of
a parent–child component pair where the preload pattern saves latency. What
is the mechanism that makes preload work (hint: it involves `React.cache()`)?*

**Your answer:**

<!-- Write here -->

---

### Q4 — Suspense and data fetching

*Why must all uncached `@/lib/data` reads be inside a `<Suspense>` boundary
under `cacheComponents: true`? What would happen at `next build` if you
called `listProducts()` at the page top level without a `<Suspense>` wrapper
and without a `'use cache'` annotation?*

**Your answer:**

<!-- Write here -->

---

### Q5 — Combining `React.cache()` and `'use cache'`

*A senior engineer tells you: &quot;For public product data, wrap the accessor in
both `React.cache()` AND add `'use cache'` inside it.&quot; Explain why this
combination is correct — what does each layer provide? In particular, explain
what happens on the first request vs. the hundredth request for the same
product.*

**Your answer:**

<!-- Write here -->

---

## Model Answers

<details>
<summary>Reveal model answers (open AFTER filling in your own)</summary>

### A1 — React.cache() vs &apos;use cache&apos;

**React.cache() only — not &apos;use cache&apos;:**
Use `React.cache()` alone when the data is **user-specific** (e.g., the
current user&apos;s orders or profile). User A&apos;s orders must never be cached and
served to user B. `React.cache()` scopes the memo to ONE request, so there
is no risk of cross-user data leakage. Adding `'use cache'` here would be a
security bug — it would serve user A&apos;s cached orders to user B.

Example:
```typescript
// Safe: per-request memo only — never persisted across users
export const getUserOrdersMemo = cache(async (userId: string) => {
  return listOrdersForUser(userId);
});
```

**Both React.cache() AND &apos;use cache&apos;:**
Use both for **public, non-personalised data** (e.g., product details, category
lists). `'use cache'` makes the data persist across requests so the 100th
visitor doesn&apos;t hit the DB. `React.cache()` ensures that if five components
in the same render tree all need the same product, they share one call to
the already-fast cached function (avoiding even the serialisation overhead of
reading the cache store five times).

```typescript
export const getProductShellData = cache(async (slug: string) => {
  "use cache";
  cacheTag(tags.product(slug));
  cacheLife("hours");
  return getProductBySlug(slug);
});
```

### A2 — Identifying a waterfall

`product` and `reviews` are independent — they only need the `id` parameter,
which is already known. `category` depends on `product.categoryId`, so it must
wait for `product` to resolve first. This dependency is genuine and unavoidable.

Optimised version:
```typescript
async function ProductPage({ id }: { id: string }) {
  // Start product and reviews simultaneously (both need only `id`)
  const [product, reviews] = await Promise.all([
    db.getProduct(id),
    db.getReviews(id),
  ]);
  // category must wait for product — this is a genuine dependency
  const category = await db.getCategory(product.categoryId);
  return <Layout product={product} category={category} reviews={reviews} />;
}
```

Time saved: `product` and `reviews` now run in parallel. If both take ~80ms,
the original code took 80 + 80 + 80 = 240ms. Optimised: max(80, 80) + 80 = 160ms.

### A3 — The preload pattern

**Problem:** When a child Server Component triggers a data fetch, the fetch
starts *after* the component begins rendering. The parent&apos;s own render time
is dead time — no data is being fetched during it.

**Concrete example:**
```
Layout renders (takes 5ms to set up context)
  └─ ProductDetail mounts
       └─ calls getProductBySlug(slug)  ← fetch starts here, NOT at Layout render
            └─ wait 80ms
```
5ms of render time is wasted before the fetch even begins.

With preload:
```
Layout calls preloadProduct(slug)     ← fetch starts immediately
  └─ Layout renders (5ms)
       └─ ProductDetail mounts
            └─ calls getProductBySlugMemo(slug) ← already ~5ms through its 80ms
                 └─ net added wait: ~75ms (not 80ms)
```

**Mechanism:** `preloadProduct` calls `getProductBySlugMemo` (which is wrapped
in `React.cache()`). The first call stores the in-flight promise in the
request-scoped memo cache. When `ProductDetail` later calls
`getProductBySlugMemo(slug)`, React returns the already-stored promise — the
same one that started earlier. No second fetch is fired.

### A4 — Suspense and data fetching

Under `cacheComponents: true`, Next.js enforces PPR discipline at build time.
A read from `@/lib/data` uses `Math.random()` — it is non-deterministic. The
build prerender pass cannot produce a stable static shell if the top-level
component contains non-deterministic code.

The build error would be:
```
Error: Uncached data was accessed outside of `<Suspense>`
```

The fix is to move the dynamic read into a child async component wrapped in
`<Suspense>`. The static shell (the page component itself) prerenderes
immediately; the dynamic child streams in later.

Alternatively, wrapping the accessor with `'use cache'` makes it deterministic
(the result is cached and stable), so it can run at the top level without a
`<Suspense>` wrapper — but only for public, cacheable data.

### A5 — Combining React.cache() and &apos;use cache&apos;

**Layer 1 — `'use cache'` (cross-request):**
First request: fetches from the DB, caches the result in Next.js&apos; server cache.
Requests 2–100: cache hit. The DB is never called again until `revalidateTag()`.
This is the main performance win for repeat visitors.

**Layer 2 — `React.cache()` (per-request deduplication):**
Within a single request (e.g. request #47): the page tree has a breadcrumb,
a price badge, and a recommendation panel that each call `getProductData(slug)`.
Without `React.cache()`, all three would hit the cache store three times
(fast, but not free — cache reads have overhead). With `React.cache()`, only
one cache-store read happens; the other two receive the already-resolved value
from the in-memory memo map.

**Summary:**
- `'use cache'` saves round-trips to the data source across requests.
- `React.cache()` saves round-trips to even the cache store within one request.
- Together they provide two-level deduplication with zero code duplication at
  the call site.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | cache() vs &apos;use cache&apos; | | |
| 2 | Identifying a waterfall | | |
| 3 | The preload pattern | | |
| 4 | Suspense and data fetching | | |
| 5 | Combining both cache layers | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c07-data-fetching/`.*
