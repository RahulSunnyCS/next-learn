# Defend-It Worksheet — Legacy Four-Cache Model + Migration

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c09-legacy-caches/`.  Write in your own words.
> The goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Draw the four caches

*Without looking anything up, sketch the four caches in the pre-v16 Next.js
model and label each one: its name, where it lives (client / server process /
disk), its lifetime (per-request / per-deployment / browser-session), and
what kind of content it stores.*

**Your sketch / answer:**

<!-- Draw here, or describe in words -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ROUTER CACHE                                                     │   │
│  │  Lives: browser memory (JS heap)                                │   │
│  │  Lifetime: browser session (pages prefetched or visited)        │   │
│  │  Stores: RSC payloads (serialised React trees) for navigated    │   │
│  │           and prefetched routes so back/forward is instant      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  SERVER PROCESS (Node.js / edge)                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ REQUEST MEMOIZATION                                              │   │
│  │  Lives: in-memory Map, per request                              │   │
│  │  Lifetime: single request/render cycle — discarded when done    │   │
│  │  Stores: de-duped fetch/unstable_cache results within one       │   │
│  │           render tree (prevents N+1 reads in the same request)  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ DATA CACHE                                                       │   │
│  │  Lives: server-side, persistent on disk (.next/cache/fetch/…)  │   │
│  │  Lifetime: survives restarts; invalidated by revalidateTag(),   │   │
│  │            revalidatePath(), or time (revalidate: N seconds)    │   │
│  │  Stores: resolved fetch() responses and unstable_cache values  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ FULL ROUTE CACHE                                                 │   │
│  │  Lives: server-side, on disk (.next/server/app/…)              │   │
│  │  Lifetime: per deployment (built at next build); invalidated    │   │
│  │            when its underlying Data Cache entries are busted    │   │
│  │  Stores: pre-rendered HTML + RSC payload for static routes     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

Key lifetimes at a glance:

| Cache              | Lives where        | Resets when                        |
|--------------------|--------------------|------------------------------------|
| Request Memo       | Server RAM         | Request ends                       |
| Data Cache         | Server disk        | `revalidateTag` / time / redeploy  |
| Full Route Cache   | Server disk        | Data Cache bust / redeploy         |
| Router Cache       | Browser RAM        | Hard reload / session end          |

</details>

---

### Q2 — What does `revalidateTag` actually bust?

*You call `revalidateTag("products")` in a Server Action.  Walk through which
of the four caches is invalidated, in which order, and what happens on the
next incoming request.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`revalidateTag("products")` directly invalidates the **Data Cache**.
Specifically, it marks any cache entry that was tagged `"products"` (via
`fetch(url, { next: { tags: ["products"] } })` or `unstable_cache(fn, keys, { tags: ["products"] })`)
as stale.

Next.js also records, at build/render time, which Data Cache tags each
pre-rendered route consumed.  When a tag is invalidated, any Full Route Cache
entry that consumed it is also marked stale (the **Full Route Cache** is busted
transitively).

**What happens next:**

1. The Data Cache entry for the tagged fetch/cache call is invalid.
2. The Full Route Cache entry for routes that used that data is invalid.
3. The next incoming request for one of those routes misses the Full Route Cache.
4. The server re-renders the route, calling the data accessor again.
5. The data accessor misses the Data Cache (because its entry was invalidated).
6. The underlying data source (database / API) is hit.
7. The fresh response is written back into the Data Cache.
8. The re-rendered HTML + RSC payload is written back into the Full Route Cache.
9. Subsequent requests within the new revalidate window see the fresh Full
   Route Cache entry.

The **Request Memoization** cache is unaffected — it only de-dupes within a
single render pass and is discarded when the request ends.  The **Router Cache**
is in the browser; the server has no mechanism to push invalidation there.
The browser will eventually re-fetch the RSC payload when the prefetch/visit
TTL expires (30s for dynamic routes, 5min for static routes in Next.js 14).

</details>

---

### Q3 — `unstable_cache` vs `'use cache'`

*Compare `unstable_cache` (pre-v16) with the `'use cache'` directive (v16).
What problem does each solve?  Why was `unstable_cache` deprecated?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**`unstable_cache` (v13–v15):**

```ts
import { unstable_cache } from "next/cache";

const getCachedProducts = unstable_cache(
  async () => db.query("SELECT …"),
  ["products-list"],        // cache key segments
  { revalidate: 3600, tags: ["products"] }
);
```

`unstable_cache` was the escape hatch for caching non-`fetch` data sources
(database queries, ORM calls, third-party SDKs) in the v13/v14/v15 model.
It wraps an arbitrary async function and stores the result in the Data Cache,
respecting the same tag/revalidate system as `fetch`.

Problems with `unstable_cache`:
1. **Awkward API** — the function, the cache key array, and the options object
   are three separate arguments.  Easy to forget the key or conflate it with
   the tags.
2. **`unstable_` prefix** — it was never promoted to a stable API, signalling
   that it was a stopgap.
3. **Implicit key derivation** — the cache key is derived from the string array
   you pass, not from the function's arguments.  Calling `getCachedProducts`
   with different inputs only works correctly if you include those inputs in the
   key array manually.
4. **No per-function lifetime control from within the function body** — options
   were defined at the wrap site, not at the call site.

**`'use cache'` (v16):**

```ts
async function getCachedProducts() {
  'use cache';
  cacheTag(tags.products);
  cacheLife('hours');
  return db.query("SELECT …");
}
```

`'use cache'` is a React compiler directive.  It moves caching from a wrapper
function into the function body itself, making the intent clear at the
reading site.  Arguments to the function become part of the cache key
automatically (the compiler handles serialisation).  `cacheTag` and `cacheLife`
are called inside the function, co-located with the code they affect.

The `unstable_` prefix of `unstable_cache` was dropped because it was replaced
by a completely different mechanism rather than stabilised.

</details>

---

### Q4 — Why implicit fetch caching caused confusion

*In Next.js 14, `fetch("https://api.example.com/products")` inside a Server
Component was cached by default.  A developer adds a "realtime stock level"
widget that calls the same URL.  They notice the stock level is always stale.
Explain what is happening and what the developer needs to do to fix it.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

In v14, `fetch` inside a Server Component defaulted to `cache: 'force-cache'`
— the response was stored in the **Data Cache** indefinitely (until
revalidated).  This was a deliberate choice to maximise performance: the most
common use case for Server Components is rendering content that does not need
to change on every request.

The stock level widget is hitting the same URL but expecting fresh data on
every request.  Because the URL is identical, it is hitting the same Data Cache
entry as the product data — which was cached without a `revalidate` setting
(so it never expires).

**Fixes (v14 era):**

Option A — Opt out of caching for this specific fetch:
```ts
const res = await fetch("https://api.example.com/products", {
  cache: "no-store",  // always fetch live, never cache
});
```

Option B — Cache with a short revalidate window:
```ts
const res = await fetch("https://api.example.com/products", {
  next: { revalidate: 30 }, // stale-while-revalidate every 30s
});
```

**Why this caused so much confusion:**
1. The developer did not write `cache: 'force-cache'` — it was the silent
   default.  The cache hit was invisible.
2. The Data Cache persists across requests.  Adding `cache: 'no-store'` to
   one call site does not affect other call sites with the same URL.
3. Two components on the same page could have the same URL cached differently
   depending on which called it first — whichever executed first "won" the
   Data Cache entry, and the other component received that entry's options.

**How v16 fixes this:**
Dynamic is the default.  Every `fetch` call is uncached unless the surrounding
function has `'use cache'`.  There is no implicit global policy to fight.

</details>

---

### Q5 — The Router Cache TTL difference

*In the pre-v16 model, the Router Cache (browser-side RSC payload cache) has
different TTLs for static vs dynamic routes.  What are they and why do they
differ?  What can a developer do to force a fresh RSC payload?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

In Next.js 14/15 the Router Cache TTLs are:

- **Static routes** — ~5 minutes.  Static routes render the same HTML for
  everyone; the RSC payload changes only on a revalidation cycle.  A 5-minute
  client-side TTL avoids hammering the server for content that rarely changes.
- **Dynamic routes** — ~30 seconds.  Dynamic routes render per-request; their
  data is fresh only for a narrow window.  30 seconds balances avoiding double
  renders on quick back-navigation vs. not serving data that is too stale.

These TTLs are for **prefetched** segments.  For segments the user has already
navigated to, Next.js uses the full-prefetch TTL.

**To force a fresh RSC payload:**

1. `router.refresh()` (from `useRouter`) — sends a new request to the server
   for the current route's RSC payload and invalidates the Router Cache entry
   for that route.

2. Full hard reload (`Ctrl+Shift+R`) — clears the browser navigation state
   including the Router Cache.

3. `revalidatePath()` on the server — this marks the Full Route Cache entry
   as stale, so the next navigation will fetch a fresh RSC payload from the
   server, which also replaces the Router Cache entry.

Note: `revalidateTag` on the server does NOT directly push an update to the
browser's Router Cache.  The browser still holds its cached RSC payload until
the TTL expires or `router.refresh()` is called.  This can cause a brief window
where the browser shows slightly stale data even after a successful tag
revalidation on the server.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Draw the four caches | | |
| 2 | What does revalidateTag bust? | | |
| 3 | unstable_cache vs use cache | | |
| 4 | Implicit fetch caching confusion | | |
| 5 | Router Cache TTL difference | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this in an interview. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c09-legacy-caches/`.*
