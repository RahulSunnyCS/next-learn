# Theory — Catalog: SSG + ISR with Cache Components

> **File:** `app/(challenges)/c02-catalog-ssg-isr/_meta/theory.md`
>
> Read this *before* you touch the code. The `spec.md` tells you **what** to
> change; this file explains **why** each piece exists, **what** it actually
> does under the hood, and **how** it helps you (and Nextmart's users). Every
> claim links back to the official Next.js 16 docs so you can go deeper.

---

## 1. The big picture — the "Cache Components" mental model

Next.js 16 runs this project with `cacheComponents: true` in
`next.config.ts`. This single flag flips the default rendering rule:

- **Old default (no flag):** routes were *static* unless something made them
  dynamic. You opted **out** of caching with `export const dynamic = 'force-dynamic'`
  or `fetch(..., { cache: 'no-store' })`.
- **Cache Components default:** **everything is dynamic** (rendered per
  request) unless **you** wrap it in a cache. You opt **in** to caching with
  the `'use cache'` directive.

This inversion is the one idea the whole challenge hangs on. You are no longer
fighting to *stop* caching — you are deliberately *choosing* what to cache and
for how long. That is why `export const dynamic = ...` is **forbidden** under
this model and the build errors if you use it; the framework wants the
caching decision expressed as `'use cache'`, not as a route-level escape hatch.

📖 [`cacheComponents` config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
· [Caching overview](https://nextjs.org/docs/app/getting-started/caching)

---

## 2. `'use cache'` — what it is and what it actually does

`'use cache'` is a **directive** (a magic string, like `'use client'`) that
you place at the top of a function, component, or file. It tells Next.js:
*"the output of this is a pure function of its inputs — store the result and
reuse it instead of recomputing on every request."*

```ts
async function listCachedProducts() {
  'use cache';            // ← cache this function's return value
  cacheTag(tags.products); // ← label the entry so we can invalidate it later
  cacheLife('hours');      // ← keep it fresh-enough for ~1 hour
  return listProducts();   // the expensive data read happens once per cycle
}
```

Under the hood the framework:

1. Computes a **cache key** from the function's arguments (and the closed-over
   build inputs). Same inputs → same key → cache hit.
2. On a **miss**, it runs the function, stores the serialized return value in
   the Data Cache, and serves it.
3. On a **hit**, it skips the function body entirely and returns the stored
   value — no database read, no recomputation.

This is what turns your catalog page from "re-fetch every product on every
visit" into "fetch once, serve thousands of times." **Task 1** in the spec is
exactly this: wrap `listCachedProducts` and `listCachedCategories` in
`'use cache'` so the product/category reads are cached instead of repeated.

📖 [`use cache` directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)

---

## 3. `cacheLife()` — this is how you get **ISR**

A cache that never expires would serve stale prices forever; a cache that
expires instantly is no cache at all. `cacheLife()` sets the **freshness
policy** for a cached entry using three numbers:

| Property     | Meaning                                                                 |
|--------------|-------------------------------------------------------------------------|
| `stale`      | how long a client may use the value without even checking the server    |
| `revalidate` | how long before the server refreshes the entry **in the background**    |
| `expire`     | the hard limit — after this the value must be regenerated before serving |

`cacheLife('hours')` is a **named profile** (roughly: revalidate ~every hour).
You can also pass a custom object or define your own profiles in
`next.config.ts`.

**Why this is literally ISR (Incremental Static Regeneration):** when the
`revalidate` window passes, the *next* request is served the **stale** value
**immediately** (fast!), while Next.js regenerates a fresh copy **in the
background**. The request after that gets the new value. Nobody waits on the
slow path. This is the modern replacement for the old
`export const revalidate = 3600` and `fetch(url, { next: { revalidate: 3600 } })`
patterns — same behavior, expressed at the data layer instead of the route
layer.

For Nextmart's catalog (changes a few times an hour, staleness up to ~1 hour
is fine) this means: **near-instant page loads, a fraction of the database
load, and data that still self-heals within the hour.**

📖 [`cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
· [`cacheLife` profiles in next.config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheLife)

---

## 4. `cacheTag()` + `revalidateTag()` — invalidate on purpose, not on a timer

Time-based expiry (`cacheLife`) handles "eventually fresh." But sometimes you
need **instant** freshness — an admin edits a product and it must update *now*,
not in 59 minutes. That is what tags are for.

`cacheTag(tags.products)` stamps a label on the cache entry. Later, anywhere in
your app (e.g. a Server Action that saves a product), calling
`revalidateTag(tags.products)` purges **every** entry carrying that tag. The
next request rebuilds it from source.

So the two mechanisms compose:
- `cacheLife` = the **passive** safety net (auto-refresh within the hour).
- `cacheTag` + `revalidateTag` = the **active** override (refresh this exact
  data the instant it changes).

C10 (`invalidation`) builds on this directly — tagging here is the groundwork.

📖 [`cacheTag`](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
· [`revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

---

## 5. `generateStaticParams()` — SSG for dynamic routes

The catalog has a dynamic route, `[slug]/page.tsx`, one page per category
(`/electronics`, `/clothing`, …). Without help, Next.js doesn't know which
slugs exist, so it would render each one **on demand** at request time.

`generateStaticParams()` hands Next.js the **list of known slugs at build
time** so it can pre-render each as **static HTML**:

```ts
export async function generateStaticParams() {
  const categories = await listCachedCategories();
  return categories.map((c) => ({ slug: c.slug }));
}
```

Each returned object becomes one pre-rendered file. In the `next build` route
table these show up with the **`○ (Static)`** marker — proof they were
generated ahead of time. That is **Task 2**.

**How it helps:** static HTML is the fastest thing a server can send (no
render work per request), it is trivially cacheable at the CDN edge, and it is
the most reliable thing for **SEO** — crawlers get fully-formed HTML instantly.

📖 [`generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

---

## 6. `dynamicParams` — what happens for slugs you *didn't* pre-build

`generateStaticParams` covers the slugs you knew about at build time. But what
about `/c02-catalog-ssg-isr/some-new-category` that didn't exist then?
`dynamicParams` decides:

- **`dynamicParams = true` (default):** unknown slugs are rendered **on
  demand** at request time (then cached). Good when new categories can appear
  without a redeploy.
- **`dynamicParams = false`:** unknown slugs return a **404**. Good when the
  set of valid pages is fixed and you want anything else rejected.

It is a **route-segment config**, *not* a cache directive, so it is allowed
under `cacheComponents` (unlike `export const dynamic`). **Task 3** asks you to
read both variants and justify which one fits a real storefront (hint: new
categories shouldn't require a redeploy, so `true`).

📖 [`dynamicParams`](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams)

---

## 7. The static shell + `<Suspense>` shape (why the data read is "inside a hole")

You'll notice the index `page.tsx` renders its header and category buttons at
the top level, but the product grid lives inside `<Suspense>`. This is the
**static-shell** pattern carried over from C01, and Cache Components *enforces*
it: any uncached/dynamic read accessed **outside** a `<Suspense>` boundary
fails the build with *"Uncached data was accessed outside of `<Suspense>`."*

The reasoning: the shell (header, filters) has no per-request data, so Next.js
can prerender and stream it **instantly**. The dynamic part (the product grid)
streams in as a second chunk once its data resolves, showing a skeleton
meanwhile. Users see meaningful UI in milliseconds instead of staring at a
blank page until the slowest query finishes. That is **Task 4**.

📖 [Caching & streaming](https://nextjs.org/docs/app/getting-started/caching)

---

## 8. Putting it together — what you're building and why it matters

By the end of this challenge the catalog will:

1. **Read product/category data once per cache cycle** (`'use cache'`) instead
   of on every request → far less database load, far lower latency.
2. **Self-refresh within ~1 hour** (`cacheLife('hours')`) → ISR; data is never
   more than an hour stale, with zero request ever paying the regeneration cost.
3. **Refresh instantly when content changes** (`cacheTag` + future
   `revalidateTag`) → correctness on top of the timer.
4. **Pre-render every known category to static HTML** (`generateStaticParams`)
   → fastest possible first paint and best SEO.
5. **Handle unknown categories deliberately** (`dynamicParams`) → no accidental
   500s or surprise behavior.
6. **Stream a static shell first** (`<Suspense>`) → instant perceived load.

That bundle — cheap, fast, fresh-enough, instantly-correctable, SEO-friendly —
is the core production pattern for any content catalog, and it's why these
APIs exist.

---

## 9. Further reading

- [Next.js Caching — getting started](https://nextjs.org/docs/app/getting-started/caching)
- [`use cache` directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [`cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [`cacheTag`](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
- [`revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [`generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [`dynamicParams` route-segment config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams)
- [`cacheComponents` config flag](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)

---

*Next:* open `spec.md` and work the four tasks. Use `verification.md` to
confirm each one. The hints in `spec.md` give you the exact code shapes.
