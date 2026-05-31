# Defend-It Worksheet — Catalog: SSG + ISR with Cache Components

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c02-catalog-ssg-isr/`.  Write in your own words —
> the goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — How does `'use cache'` + `cacheLife('hours')` achieve ISR?

_The old Next.js model used `export const revalidate = 3600` on the route
segment.  In Next.js 16 with `cacheComponents: true`, that directive is
replaced.  Explain how `'use cache'` + `cacheLife('hours')` produces the same
stale-then-fresh ISR behaviour, and where in the code it lives._

**Your answer:**

<!-- Write here -->

---

### Q2 — Why is `export const dynamic = "force-static"` forbidden here?

_You want the catalog to be statically generated.  Why can't you use
`export const dynamic = "force-static"` to achieve that, even though it sounds
exactly right?  What do you use instead?_

**Your answer:**

<!-- Write here -->

---

### Q3 — What does `generateStaticParams` do at build time?

_Explain in plain English what Next.js does when it encounters
`generateStaticParams` on a `[slug]` route.  What HTML files does it produce?
What happens at runtime for slugs in that list vs. slugs NOT in that list?_

**Your answer:**

<!-- Write here -->

---

### Q4 — `dynamicParams = true` vs `dynamicParams = false`: when would you choose each?

_A category slug that was NOT in `generateStaticParams` arrives at the server.
Compare the two outcomes.  When would an e-commerce catalog choose `true`?
When would it choose `false`?_

**Your answer:**

<!-- Write here -->

---

### Q5 — Cache flow: from cold start to first request to stale-then-fresh

_Walk through the full cache lifecycle for `/c02-catalog-ssg-isr/electronics`:_
_1. `next build` runs._
_2. First request arrives at the edge._
_3. 70 minutes later, a second request arrives._
_What happens at each step?  Include `cacheTag(tags.products)` in your answer._

**Your answer:**

<!-- Write here -->

---

## Model Answers (committed — read AFTER self-scoring)

### A1 — `'use cache'` + `cacheLife('hours')` = ISR

In Next.js 16, `'use cache'` is a React/Next.js directive that wraps an async
function's return value in the server-side Cache Components store.  When
`cacheLife('hours')` is called inside that function, the framework sets a cache
lifetime of ~1 hour.

The behaviour is identical to legacy ISR's `revalidate = 3600`:
1. First request: the function runs, result stored in cache.
2. Subsequent requests within 1 hour: cached result served immediately (stale).
3. After the cache entry expires: the NEXT request triggers a background
   revalidation.  The stale result is served to that visitor immediately; the
   background run updates the cache for the visitor after.

The key difference from the old model is WHERE the lifetime is declared: in the
old model it was a route-segment export (`export const revalidate = 3600`); in
the Cache Components model it is INSIDE the cached function itself
(`cacheLife('hours')`).  This is more granular — different functions on the
same page can have different cache lifetimes.

### A2 — Why `export const dynamic` is forbidden

`cacheComponents: true` makes dynamic rendering the DEFAULT for every route.
You opt INTO caching with `'use cache'`; you never opt out with `dynamic`.

The `dynamic` route-segment config is INCOMPATIBLE with the Cache Components
flag and causes a build error if used.  To make a page statically generated,
wrap its data reads in `'use cache'` functions with appropriate `cacheLife()`.
Do NOT use `dynamic = "force-static"`.

### A3 — `generateStaticParams` at build time

`generateStaticParams` runs during `next build`.  Next.js calls it to collect
every param combination that should be pre-rendered.  For each returned
`{ slug }` object, it runs the `[slug]/page.tsx` render function and writes the
HTML + RSC payload to the `.next/` static output.

At runtime:
- A slug IN the list: served as pre-built static HTML (fast, no server compute).
- A slug NOT in the list: behaviour depends on `dynamicParams` (see A4).

### A4 — `dynamicParams` true vs false

`dynamicParams = true` (the default): unknown slugs render on-demand.  The
server runs the page for the unknown slug, renders it, and (if the data read is
wrapped in `'use cache'`) may store the result for subsequent requests.  Choose
`true` when the catalog can have slugs added after build time (e.g. a seller
adds a new category) — you don't want a 404 just because the build predates
the new category.

`dynamicParams = false`: unknown slugs return 404 immediately.  Choose `false`
when you have a FIXED, known set of valid slugs and any unknown slug is
definitively invalid (e.g. a finite set of hard-coded regions or languages).

For a product catalog, `true` is almost always the right choice.

### A5 — Full cache lifecycle

1. **`next build`** — `generateStaticParams` returns the 5 category slugs.
   Next.js pre-renders `/c02-catalog-ssg-isr/electronics` (and the others) to
   static HTML.  The `listCachedProducts({ categoryId })` call runs inside the
   build; `'use cache'` stores the result tagged `tags.products`.

2. **First runtime request** — the pre-built static HTML is served directly
   from the CDN/edge.  No server compute is needed (the cache was warm at build
   time).  The response headers include Cache-Control: stale-while-revalidate.

3. **70 minutes later** — the `cacheLife('hours')` entry has expired (1-hour
   window).  The NEXT request triggers a background `listCachedProducts` re-run
   to refresh the cache.  The visitor that triggered the revalidation still
   receives the stale HTML immediately; future visitors get the fresh data.
   Because the tag is `tags.products`, a Server Action can also call
   `revalidateTag(tags.products)` to force an immediate invalidation (e.g.
   after a product price update).

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | use cache + cacheLife = ISR |  |  |
| 2 | dynamic directive forbidden |  |  |
| 3 | generateStaticParams at build |  |  |
| 4 | dynamicParams true vs false |  |  |
| 5 | Full cache lifecycle |  |  |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c02-catalog-ssg-isr/`.*
