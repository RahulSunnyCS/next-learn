# Challenge Spec — Legacy Four-Cache Model + Migration to Cache Components

> **File:** `app/(challenges)/c09-legacy-caches/_meta/spec.md`

---

## Learning Goal

This challenge teaches the **pre-v16 "four caches" mental model** — the caching
architecture you will encounter in existing Next.js codebases (v13/v14/v15) and
in every classic Next.js interview question — and then shows you exactly how
and why that model was replaced by **Cache Components** in Next.js 16.

By the end you will be able to:

1. Draw and explain the four caches: Request Memoization, Data Cache, Full
   Route Cache, and Router Cache — what each does, its scope, its lifetime,
   and how they compose.
2. Read and reason about legacy code that uses `unstable_cache`, implicit
   `fetch` caching (`fetch(url, { next: { revalidate, tags } })`), and
   `export const revalidate`.
3. Migrate a legacy `unstable_cache`-wrapped data accessor to the modern
   `'use cache'` + `cacheTag()` + `cacheLife()` pattern.
4. Articulate WHY Next.js moved from implicit magic to explicit Cache
   Components — the problems with the old model that motivated the change.

---

## Background: Why Two Models?

Next.js 13–15 introduced an **implicit, layered caching system** where `fetch`
calls were automatically cached by default and the framework maintained four
distinct in-memory/on-disk caches.  This worked but caused widespread confusion:

- Developers did not know *which* cache they were fighting.
- The same `fetch(url)` might return stale data for opaque reasons.
- Opt-out semantics (`{ cache: 'no-store' }`) were non-obvious.
- `unstable_cache` was the escape hatch for non-`fetch` data sources, but
  it was awkward and had a `use cache`-like prefix (`'use cache'` was
  originally added in v15 in canary form as a replacement for it).
- The model was incompatible with fine-grained caching per data function
  — you could only set one `revalidate` value per route segment.

Next.js 16 replaced this with **Cache Components**: explicit, function-level
caching via the `'use cache'` directive.  Implicit fetch caching is off by
default.  The four-cache mental model is superseded, but it **lives on in
millions of codebases** and is a standard interview topic.

---

## Scenario

You are reviewing a Nextmart codebase originally written for Next.js 14.  It
uses `unstable_cache`, implicit fetch headers, and `export const revalidate`.
Your job is to:

1. Understand how it worked.
2. Identify what each legacy cache was doing.
3. Migrate the data layer to Cache Components without changing the observable
   user-facing behaviour.

---

## Tasks

### Part 1 — Understand the Four Caches

- [ ] **T1.1 — Read** `solutions/c09-legacy-caches/migration-notes.md`.
  Before reading, sketch the four caches on paper and note which one handles
  which concern.

- [ ] **T1.2 — Read** `solutions/c09-legacy-caches/cache-flow.md`.
  Trace the flow of a single request through all four caches.

- [ ] **T1.3 — Study the legacy code** in `solutions/c09-legacy-caches/legacy/page.tsx`.
  Identify every legacy caching directive.  Note which of the four caches
  each directive affects.

### Part 2 — Understand the Migration

- [ ] **T2.1 — Read** `solutions/c09-legacy-caches/migrated/page.tsx`.
  Compare it to `legacy/page.tsx` line by line.  The user-visible output
  must be identical; the implementation is completely different.

- [ ] **T2.2 — Verify the live demo** at `/c09-legacy-caches`.
  The page shows the migrated live version.  The data helper
  `app/(challenges)/c09-legacy-caches/_lib/legacy.ts` shows the before/after
  side-by-side with inline comments.

- [ ] **T2.3 — Fill in** `_meta/defend-it.md` before reading any solution.

### Part 3 — Extend (optional bonus)

- [ ] **T3.1 — Add a second tag** to `getCachedFeaturedProducts()` in
  `_lib/legacy.ts` that tags by seller ID.  Write a Server Action that
  calls `revalidateTag(tags.sellerProducts(sellerId))` and verify that
  re-loading the page shows fresh data.

- [ ] **T3.2 — Trace the Router Cache.**  Open Chrome DevTools → Network tab.
  Navigate back and forth between `/c09-legacy-caches` and another challenge.
  Observe that no new RSC payload request is made on the second back-navigation
  (Router Cache hit).  Then add `<link rel="prefetch" ...>` to a link and
  observe the prefetch payload in the network tab.

---

## Acceptance Criteria

1. `next build` exits 0 with no type or lint errors.
2. Loading `/c09-legacy-caches` shows the migrated live demo — a list of
   featured products rendered via the `'use cache'`-wrapped `getCachedFeaturedProducts()`.
3. The live page follows cacheComponents rules: static shell + Suspense-wrapped
   dynamic hole; no `export const revalidate` or `export const dynamic`.
4. `solutions/c09-legacy-caches/legacy/page.tsx` and
   `solutions/c09-legacy-caches/migrated/page.tsx` are documented code samples
   (not live routes) showing the before/after migration.
5. `migration-notes.md` accurately documents all four legacy caches and the
   WHY of the migration to Cache Components.
6. `cache-flow.md` contains the cache-flow diagram for both the legacy
   four-cache model and the Cache Components model.
7. `defend-it.md` contains 3–5 questions with model answers, including a
   "draw the four caches" question.

---

## Hints

<details>
<summary>Hint 1 — The four caches are all in the same process</summary>

All four caches run in the Node.js server process (or edge runtime) — they are
NOT separate services.  Request Memoization is a plain Map held for the lifetime
of one request.  Data Cache is a persistent on-disk store that survives restarts
in production.  Full Route Cache is pre-rendered HTML on disk.  Router Cache is
in the browser.

</details>

<details>
<summary>Hint 2 — Why revalidateTag busts two caches</summary>

Calling `revalidateTag(tag)` invalidates entries in the **Data Cache**.
Indirectly it also invalidates the **Full Route Cache** entry for any route
that was rendered from that data — because Next.js records which data cache
tags were read during a render, and marks the route cache stale when those
tags are invalidated.

</details>

<details>
<summary>Hint 3 — What changed in v16</summary>

In v16 with `cacheComponents: true`, implicit `fetch` caching is OFF.
Every data read is dynamic by default — opt IN with `'use cache'`.  The Data
Cache still exists under the hood, but you interact with it only through the
`'use cache'` directive, not through fetch option bags or `unstable_cache`.

</details>
